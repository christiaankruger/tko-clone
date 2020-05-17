import React, { Component } from 'react';
import { createBemHelper } from '../../util/BEM';
import './ShowScores.scss';
import { observer } from 'mobx-react';
import { Heading } from '../shared/Heading';
import { computed } from 'mobx';
import { ScoreInfo } from '../../../../lib/SharedTypes';

const BEM = createBemHelper('show-scores');

export interface ShowScoresProps {
  scores: ScoreInfo[];
  category: string;
}

@observer
export class ShowScores extends Component<ShowScoresProps> {
  render() {
    const { category } = this.props;

    return (
      <div className={BEM()}>
        <Heading>Scores: {category}</Heading>
        <div className={BEM('scores')}>{this.sortedScores.map(this.scoreBlock)}</div>
      </div>
    );
  }

  private scoreBlock = ({ name, value }: ScoreInfo, index: number) => {
    return (
      <div className={BEM('score-container', { winner: index === 0, second: index === 1, third: index === 2 })}>
        <div className={BEM('name')}>{name}</div>
        <div className={BEM('value')}>{value.toLocaleString()}</div>
      </div>
    );
  };

  @computed
  private get sortedScores() {
    return this.props.scores.sort((a, b) => b.value - a.value);
  }
}
