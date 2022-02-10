import { divide, equals, groupBy, prop, sum } from 'ramda';
import { v4 } from 'uuid';
import { Player } from './Game';

export const shortId = (namespace: string) => {
  return `${namespace}-${v4().split('-')[0]}`;
};

export class List {
  id: string = shortId('list');
  title: string;
  items: RankableItem[] = [];
  submittedBy: string;
  itemToIdMap: { [key: string]: RankableItem } = {};

  constructor(props: { title: string; submittedBy: string }) {
    Object.assign(this, props);
  }

  addItem(item: RankableItem) {
    this.itemToIdMap[item.id] = item;
    this.items.push(item);
  }

  itemById(id: string): RankableItem {
    return this.itemToIdMap[id];
  }
}

export class RankableItem {
  id: string = shortId('rankable-item');
  title: string;
  submittedBy: string[] = [];

  constructor(props: { title: string; submittedBy: string[] }) {
    Object.assign(this, props);
  }
}

export class ItemRanking {
  id: string = shortId('item-ranking');
  targetId: string;
  scorerId: string;
  value: number;

  constructor(props: { targetId: string; scorerId: string; value: number }) {
    Object.assign(this, props);
  }
}

export class Round {
  constructor() {}

  availableLists: List[];
  selectedList: List;

  finalScores: { player: Player; score: number }[] = [];
}

export const scoreRankings = (rankings: ItemRanking[]): { id: string; score: number; rankings: ItemRanking[] }[] => {
  const LAMBDA = 10.0;
  // Score = LAMBDA / Position

  const groups = groupBy(prop('targetId'), rankings);
  return Object.keys(groups)
    .map((id) => {
      const score = groups[id]
        .map((x) => LAMBDA / x.value)
        .reduce((memo, x) => {
          return memo + x;
        }, 0);

      return {
        id,
        score,
        rankings: groups[id],
      };
    })
    .sort((a, b) => {
      return b.score - a.score;
    });
};

export type EvaluateSetsResult = { score: number; summary: ('correct' | 'misplaced' | 'incorrect')[] };
export const evaluateSets = (correct: { targetId: string }[], supplied: { targetId: string }[]): EvaluateSetsResult => {
  const scorePerCorrectInclusion = 75;
  const scorePerCorrectPosition = 150;

  let score = 0;
  const summary = correct.map(({ targetId }, index) => {
    const indexInSupplied = supplied.findIndex((x) => x.targetId === targetId);
    if (indexInSupplied === -1) {
      return 'incorrect' as 'incorrect';
    }
    if (indexInSupplied === index) {
      score += scorePerCorrectInclusion + scorePerCorrectPosition;
      return 'correct' as 'correct';
    } else {
      score += scorePerCorrectInclusion;
      return 'misplaced' as 'misplaced';
    }
  });

  return {
    score,
    summary,
  };
};

export class Score {
  id: string = shortId('score');
  scorerId!: string;
  value!: number;
  reason!: string;

  constructor(props: { scorerId: string; value: number; reason: string }) {
    Object.assign(this, props);
  }
}
