import { pick, prop } from 'ramda';
import { GameType } from '../../lib/SharedTypes';
import { sample, shuffle } from '../util';
import { BaseGame, waitFor } from './BaseGame';
import { Player } from './Game';
import { ItemRanking, List, scoreRankings } from './RankerMechanics';

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

    const scores = scoreRankings(listSuggestionRanks);
    const winner = listSuggestions.find((x) => x.id === scores[0].id);
    const suggestedBy = this.players.find((x) => x.id === winner.submittedBy);
    await this.makeAnnouncement({ heading: 'And the winner is...' }, 3);
    await this.makeAnnouncement({ heading: winner.title, subtext: `Suggested by ${suggestedBy.name}` }, 3);
    await waitFor(1000);
  }
}
