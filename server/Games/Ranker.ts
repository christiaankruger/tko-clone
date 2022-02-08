import { stringifyKey } from 'mobx/lib/internal';
import { last, pick, prop, range, uniq, uniqBy, without } from 'ramda';
import { GameType } from '../../lib/SharedTypes';
import { sample, shuffle } from '../util';
import { BaseGame, waitFor } from './BaseGame';
import { Player } from './Game';
import { ItemRanking, List, RankableItem, Score, scoreRankings } from './RankerMechanics';

export class Ranker extends BaseGame {
  gameType: GameType = 'ranker';

  async orchestrate(): Promise<void> {
    await this.round(1);
    // await this.round(2);
    // await this.round(3);
  }

  private async round(roundNumber: number) {
    const listSuggestions: List[] = [];
    const listSuggestionRanks: ItemRanking[] = [];
    const roundScores: Score[] = [];

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
      const suggestions: { text: string; submittedBy: string }[] = [];
      this.explainAndWait(
        {
          heading: `Time to gather list items for ${listSuggestionWinner.title}`,
          explainer: `Gimme ${NUMBER_TO_SUGGEST} items you'd expect to see on that list`,
        },
        () => {
          return this.players.map((player) => {
            const count = suggestions.filter((d) => d.submittedBy === player.id).length;
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
          suggestions.push({ text: response.metadata.text.toLowerCase().trim(), submittedBy: player.id });
          const numberSubmitted = suggestions.filter((x) => x.submittedBy === player.id).length;
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
      return uniq(shuffle(suggestions.map(prop('text'))));
    })();
    suggestions.forEach((title) => {
      listSuggestionWinner.addItem(new RankableItem({ title }));
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

          this.explainAndWait(
            {
              heading,
              explainer: `What do you think their number ${
                index + 1
              } choice would be? You can pick two options. You'll score if one of two options is correct`,
            },
            () => {
              return [];
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
              const { selected }: { selected: { text: string; id: string }[] } = response.metadata;

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
            { heading: correctAnswer.title, subtext: `Congrats to: ${scorers.join(', ')}` },
            3
          );
        }
      }
      await waitFor(1000);
    })();
  }
}
