import React, { Component } from 'react';
import { createBemHelper } from '../../util/BEM';
import './Vote.scss';
import { Heading } from '../shared/Heading';
import { Button } from '../shared/Button';

const BEM = createBemHelper('vote');

export interface VoteProps {
  between: {
    id: string;
    description: string;
  }[];
  onVote: (id: string) => Promise<void>;
}

export class Vote extends Component<VoteProps> {
  render() {
    return (
      <div className={BEM()}>
        <Heading>Vote</Heading>
        {this.props.between.map(({ id, description }) => {
          return <Button onClick={this.voteCurried(id)}>{description}</Button>;
        })}
      </div>
    );
  }

  private voteCurried = (id: string) => {
    return () => {
      this.props.onVote(id);
    };
  };
}
