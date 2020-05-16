import { v4 } from 'uuid';
import { Player } from './Game';

export const shortId = (namespace: string) => {
  return `${namespace}-${v4().split('-')[0]}`;
};

export class Design {
  createdBy!: string;
  base64!: string;
  id: string = shortId('design');

  constructor(props: { createdBy: string; base64: string }) {
    Object.assign(this, props);
  }
}

export class Slogan {
  createdBy!: string;
  text!: string;
  id: string = shortId('slogan');

  constructor(props: { createdBy: string; text: string }) {
    Object.assign(this, props);
  }
}

export class Shirt {
  createdBy!: string;
  design!: Design;
  slogan!: Slogan;
  id: string = shortId('shirt');

  constructor(props: { createdBy: string; design: Design; slogan: Slogan }) {
    Object.assign(this, props);
  }
}

export class ShirtScore {
  id: string = shortId('shirt-score');
  scorerId!: string;
  shirt!: Shirt;
  value!: number;

  constructor(props: { scorerId: string; shirt: Shirt; value: number }) {
    Object.assign(this, props);
  }
}

// For slogans and designs
export class AdhocScore {
  id: string = shortId('adhoc-score');
  scorerId!: string;
  targetId!: string;
  value!: number;
  reason!: string;

  constructor(props: { scorerId: string; targetId: string; value: number; reason: string }) {
    Object.assign(this, props);
  }
}

export class Vote {
  id: string = shortId('vote');
  scorerId!: string;
  voteFor!: Shirt;

  constructor(props: { scorerId: string; voteFor: Shirt }) {
    Object.assign(this, props);
  }
}

export interface TypeMap {
  shirt: Shirt;
  shirtScore: ShirtScore;
  adhocScore: AdhocScore;
  vote: Vote;
}

export class Round {
  constructor() {}

  shirts: Shirt[] = [];
  shirtScores: ShirtScore[] = [];
  adhocScores: AdhocScore[] = [];
  votingRounds: Vote[][] = [];

  finalScores: { player: Player; score: number }[] = [];
}
