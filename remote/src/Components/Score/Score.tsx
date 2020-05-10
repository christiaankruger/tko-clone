import React, { Component } from 'react';
import { createBemHelper } from '../../util/BEM';
import './Score.scss';
import { Heading } from '../shared/Heading';
import { Button } from '../shared/Button';

export interface ScoreProps {
  description: string;
  possibleScores: number[];
  onScore: (value: number) => Promise<void>;
}

const BEM = createBemHelper('score');

export class Score extends Component<ScoreProps> {
  render() {
    return (
      <div className={BEM()}>
        <Heading>Score</Heading>
        <div className={BEM('description')}>{this.props.description}</div>
        {this.props.possibleScores.map(this.scoreButton)}
      </div>
    );
  }

  private scoreButton = (value: number) => {
    return <Button onClick={this.submitCurried(value)}>{value}</Button>;
  };

  private submitCurried = (value: number) => {
    return () => {
      this.props.onScore(value);
    };
  };
}
