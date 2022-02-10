import { stringifyKey } from 'mobx/lib/internal';
import { flatten, groupBy, last, pick, prop, range, take, uniq, uniqBy, without } from 'ramda';
import { GameType, ScoreInfo } from '../../lib/SharedTypes';
import { sample, shuffle } from '../util';
import { BaseGame, waitFor } from './BaseGame';
import { Player } from './Game';
import {
  evaluateSets,
  EvaluateSetsResult,
  ItemRanking,
  List,
  RankableItem,
  Score,
  scoreRankings,
} from './RankerMechanics';

class RoundScoreContainer {
  private notificationsQueue: { id: string; value: number }[] = [];

  constructor(private onScoreAdded: (scorerId: string, value: number) => void) {}

  scores: Score[] = [];
  private notificationsPaused: boolean = false;

  scoreForPlayerId(id: string): number {
    return this.scores
      .filter((x) => x.scorerId === id)
      .map(prop('value'))
      .reduce((memo, x) => memo + x, 0);
  }

  pauseNotifications() {
    this.notificationsPaused = true;
  }

  unpauseNotifications() {
    this.notificationsPaused = false;
    while (this.notificationsQueue.length > 0) {
      const { id, value } = this.notificationsQueue.pop();
      this.onScoreAdded(id, value);
    }
  }

  push(score: Score) {
    this.scores.push(score);
    if (this.notificationsPaused) {
      this.notificationsQueue.push({ id: score.scorerId, value: score.value });
    } else {
      this.onScoreAdded(score.scorerId, score.value);
    }
  }
}

export class Ranker extends BaseGame {
  gameType: GameType = 'ranker';
  allRoundScores: RoundScoreContainer[] = [];

  async orchestrate(): Promise<void> {
    await this.round(1);
    await this.round(2);
    this.showScores(
      'Overall scores so far!',
      this.players.map(({ id, name }) => {
        const value = this.allRoundScores
          .map((roundScore) => roundScore.scoreForPlayerId(id))
          .reduce((memo, x) => memo + x);

        return {
          name,
          value,
        };
      })
    );
    // await this.round(3);
  }

  private async round(roundNumber: number) {
    const listSuggestions: List[] = [];
    const listSuggestionRanks: ItemRanking[] = [];
    const roundScores = new RoundScoreContainer((scorerId, value) => {
      const playerName = this.playerById(scorerId).name;
      this.showScoreAdded(playerName, value);
    });
    this.allRoundScores.push(roundScores);

    await this.announceRound(roundNumber, sample(['The strike']));
    this.explainAndWait(
      {
        heading: "Let's make a list of lists!",
        explainer: `Name something you'd like to see a list of`,
      },
      () => {
        return this.players.map((player) => {
          const count = listSuggestions.filter((d) => d.submittedBy === player.id).length;
          return {
            player,
            status: count,
          };
        });
      }
    );
    const [listSuggestionInputEnd, hasListSuggestedInputEnded] = this.requestInput(
      () => 'all',
      () => ({ type: 'write', metadata: {} }),
      (player, response, allResponses) => {
        const list = new List({
          submittedBy: response.sourcePlayerId,
          title: response.metadata.text,
        });
        listSuggestions.push(list);
        if (allResponses.length === this.players.length) {
          listSuggestionInputEnd();
        }

        return { type: 'wait', metadata: {} };
      }
    );

    await this.defaultTurnTimer(hasListSuggestedInputEnded, listSuggestionInputEnd);
    this.explainAndWait(
      {
        heading: "Let's pick our favorite list",
        explainer: `Rank your ${Math.min(3, this.players.length - 1)} favorite list ideas`,
      },
      () => {
        return this.players.map((player) => {
          const count = listSuggestions.filter((d) => d.submittedBy === player.id).length;
          return {
            player,
            status: count,
          };
        });
      }
    );
    const [endRankListSuggestions, hasRankListSuggestionsEnded] = this.requestInput(
      () => 'all',
      (player: Player) => {
        const options = shuffle(listSuggestions)
          .filter((x) => x.submittedBy !== player.id)
          .map((x) => ({ id: x.id, text: x.title }));

        return {
          type: 'rank',
          metadata: {
            numberToRank: Math.min(3, options.length),
            options,
          },
        };
      },
      (player, response, allResponses) => {
        const { ranked }: { ranked: { id: string }[] } = response.metadata;
        ranked.map(prop('id')).forEach((id, index) => {
          listSuggestionRanks.push(
            new ItemRanking({
              targetId: id,
              scorerId: player.id,
              value: index + 1,
            })
          );
        });

        if (allResponses.length === this.players.length) {
          endRankListSuggestions();
        }

        return { type: 'wait', metadata: {} };
      }
    );
    await this.defaultTurnTimer(hasRankListSuggestionsEnded, endRankListSuggestions);

    const listSuggestionScores = scoreRankings(listSuggestionRanks);
    const listSuggestionWinner = listSuggestions.find((x) => x.id === listSuggestionScores[0].id);
    const listSuggestionSuggestedBy = this.players.find((x) => x.id === listSuggestionWinner.submittedBy);
    /* Scores */
    [
      { index: 0, score: 500 },
      { index: 1, score: 250 },
      { index: 2, score: 100 },
    ]
      .filter((x) => {
        // Make sure we don't go out of bounds
        return x.index < listSuggestionScores.length;
      })
      .forEach(({ index, score }) => {
        const listSuggestion = listSuggestions.find((x) => x.id === listSuggestionScores[index].id);
        roundScores.push(
          new Score({ scorerId: listSuggestion.submittedBy, value: score, reason: 'List suggestion votes' })
        );
      });

    await this.makeAnnouncement({ heading: 'And the winner is...', subtext: '(Drum roll please)' }, 3);
    await this.makeAnnouncement(
      { heading: listSuggestionWinner.title, subtext: `Suggested by ${listSuggestionSuggestedBy.name}` },
      3
    );
    await waitFor(3);

    // Get  suggestions from everyone
    const suggestions = await (async () => {
      const NUMBER_TO_SUGGEST = 2;
      const suggestions: { text: string; submittedBy: string[] }[] = [];
      this.explainAndWait(
        {
          heading: `Time to gather list items for ${listSuggestionWinner.title}`,
          explainer: `Gimme ${NUMBER_TO_SUGGEST} items you'd expect to see on that list`,
        },
        () => {
          return this.players.map((player) => {
            const count = suggestions.filter((d) => d.submittedBy.includes(player.id)).length;
            return {
              player,
              status: count,
            };
          });
        }
      );

      const [end, hasEnded] = this.requestInput(
        () => 'all',
        (_) => {
          return { type: 'write', metadata: {} };
        },
        (player, response, allResponses) => {
          const formattedText = response.metadata.text.toLowerCase().trim();
          const indexOfExisting = suggestions.findIndex((s) => s.text === formattedText);
          if (indexOfExisting === -1) {
            suggestions.push({ text: formattedText, submittedBy: [player.id] });
          } else {
            suggestions[indexOfExisting].submittedBy.push(player.id);
          }

          const numberSubmitted = suggestions.filter((x) => x.submittedBy.includes(player.id)).length;
          if (numberSubmitted < NUMBER_TO_SUGGEST) {
            return { type: 'write', metadata: {} };
          }
          if (allResponses.length === NUMBER_TO_SUGGEST * this.players.length) {
            end();
          }

          return { type: 'wait', metadata: {} };
        }
      );

      await this.defaultTurnTimer(hasEnded, end);
      return shuffle(suggestions);
    })();
    suggestions.forEach(({ text, submittedBy }) => {
      listSuggestionWinner.addItem(new RankableItem({ title: text, submittedBy }));
    });
    const numberToRank = Math.min(5, listSuggestionWinner.items.length);

    // Each individual rank
    const individualRanks = await (async () => {
      const individualRanks: { [key: string]: ItemRanking[] } = {};
      this.explainAndWait(
        {
          heading: `Tell me about your favorite ${listSuggestionWinner.title}!`,
          explainer: `Rank your personal top ${numberToRank}`,
        },
        () => {
          return this.players.map((player) => {
            const done = !!individualRanks[player.id];
            return {
              player,
              status: done ? 'Done' : 'Waiting',
            };
          });
        }
      );

      const [end, hasEnded] = this.requestInput(
        () => 'all',
        (_) => {
          return {
            type: 'rank',
            metadata: {
              numberToRank,
              options: shuffle(listSuggestionWinner.items).map((item) => {
                return {
                  id: item.id,
                  text: item.title,
                };
              }),
            },
          };
        },
        (player, response, allResponses) => {
          // const
          const { ranked }: { ranked: { id: string }[] } = response.metadata;
          const myRanks = ranked.map(prop('id')).map((id, index) => {
            return new ItemRanking({
              targetId: id,
              scorerId: player.id,
              value: index + 1,
            });
          });
          individualRanks[player.id] = myRanks;

          if (allResponses.length === this.players.length) {
            end();
          }

          return { type: 'wait', metadata: {} };
        }
      );
      await this.defaultTurnTimer(hasEnded, end, 120);
      return individualRanks;
    })();
    console.log('individual ranks', individualRanks);
    await waitFor(2);
    await this.makeAnnouncement({ heading: 'Phase 1', subtext: "Every player's personal ranks" });
    // Each individual player's bottom & top ranks
    await (async () => {
      const goingOrder = shuffle(range(0, this.players.length));
      const options = listSuggestionWinner.items.map(({ id, title }) => {
        return { id, text: title };
      });
      for (const { index, score } of [
        { index: numberToRank - 1, score: 250 },
        { index: 0, score: 500 },
      ]) {
        for (let i = 0; i < goingOrder.length; i++) {
          const spotlightPlayer = this.players[goingOrder[i]];
          const heading = `Next up: ${spotlightPlayer.name}`;

          await this.makeAnnouncement({ heading, subtext: "Every player's personal ranks" });

          const correctAnswerId = individualRanks[spotlightPlayer.id][index].targetId;
          const correctAnswer = listSuggestionWinner.items.find((x) => x.id === correctAnswerId);
          const scorers: string[] = [];
          const answeredPlayerIds: string[] = [];

          this.explainAndWait(
            {
              heading,
              explainer: `What do you think their number ${
                index + 1
              } choice would be? You can pick two options. You'll score if one of two options is correct`,
            },
            () => {
              return this.players.map((player) => {
                return {
                  player,
                  status: answeredPlayerIds.includes(player.id) ? '2' : '0',
                };
              });
            }
          );
          const [end, hasEnded] = this.requestInput(
            () => {
              return this.players.filter((p) => spotlightPlayer.id !== p.id);
            },
            (player) => {
              return { type: 'select', metadata: { options, numberToSelect: 2 } };
            },
            (player, response, allResponses) => {
              const { selected }: { selected: { id: string }[] } = response.metadata;
              answeredPlayerIds.push(player.id);

              for (const choice of selected) {
                if (choice.id === correctAnswerId) {
                  // Correct!
                  roundScores.push(new Score({ scorerId: player.id, value: score, reason: 'Correct answer' }));
                  scorers.push(player.name);
                }
              }

              if (allResponses.length === this.players.length - 1) {
                end();
              }

              return { type: 'wait', metadata: {} };
            }
          );
          await this.defaultTurnTimer(hasEnded, end, 120);
          await this.makeAnnouncement({ heading: 'And of course the answer is...', subtext: '(Drum roll please)' }, 3);
          await this.makeAnnouncement(
            {
              heading: correctAnswer.title,
              subtext: scorers.length !== 0 ? `Congrats to: ${scorers.join(', ')}` : 'Woops, nobody knew that!',
            },
            3
          );
        }
      }
      await this.makeAnnouncement({ heading: "Let's see those scores!" }, 3);
      const scores = this.players.map(({ id, name }) => {
        return {
          name,
          value: roundScores.scoreForPlayerId(id),
        };
      });
      await this.showScores(`Individual ranks`, scores);
    })();
    await (async () => {
      // Overall ranks
      const finalRankSummaries: { name: string; score: number; summary: string[] }[] = [];
      const allRankings = flatten(Object.values(individualRanks));
      const scores = scoreRankings(allRankings);
      const correctOrderIds = take(numberToRank)(scores.map((s) => ({ targetId: s.id })));
      await this.makeAnnouncement({ heading: `Time to figure out the group's ranked items` }, 3);
      this.explainAndWait(
        { heading: `Rank the top ${numberToRank} overall items`, explainer: "You'll figure it out!" },
        () => {
          return this.players.map((player) => {
            return {
              player,
              status: finalRankSummaries.findIndex((x) => x.name === player.name) !== -1 ? 'Done' : 'Waiting',
            };
          });
        }
      );
      const [end, hasEnded] = this.requestInput(
        () => 'all',
        () => {
          return {
            type: 'rank',
            metadata: {
              numberToRank,
              options: shuffle(listSuggestionWinner.items).map((i) => ({ id: i.id, text: i.title })),
            },
          };
        },
        (player, response, allResponses) => {
          const { ranked }: { ranked: { id: string }[] } = response.metadata;
          const selectedIds = ranked.map((r) => ({ targetId: r.id }));
          const { score, summary } = evaluateSets(correctOrderIds, selectedIds);

          roundScores.push(new Score({ scorerId: player.id, value: score, reason: 'Group rankings' }));
          finalRankSummaries.push({ name: player.name, score, summary });

          if (allResponses.length === this.players.length) {
            end();
          }

          return { type: 'wait', metadata: {} };
        }
      );
      await this.defaultTurnTimer(hasEnded, end);
      const correctRanking = correctOrderIds
        .map(prop('targetId'))
        .map((id) => listSuggestionWinner.itemById(id))
        .map((x) => ({
          text: x.title,
        }));

      this.showRankingResults(correctRanking, finalRankSummaries);
      await waitFor(10);
      for (let i = 0; i < correctOrderIds.length; i++) {
        const multiplier = correctOrderIds.length - i;
        const baseScore = 50;
        const item = listSuggestionWinner.itemById(correctOrderIds[i].targetId);
        const playersWhoSubmittedThis = item.submittedBy.map((id) => this.playerById(id));

        for (const player of playersWhoSubmittedThis) {
          roundScores.push(new Score({ scorerId: player.id, value: baseScore * multiplier, reason: 'Bonus points' }));
        }
      }
      await this.makeAnnouncement(
        {
          heading: 'Bonus points!',
          subtext: 'You get extra points for how well your submissions did in the group rankings',
        },
        10
      );

      await this.showScores(
        `Round ${roundNumber} scores!`,
        this.players.map(({ id, name }) => {
          return {
            name,
            value: roundScores.scoreForPlayerId(id),
          };
        })
      );
    })();
  }
}
