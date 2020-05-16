import React, { FC } from 'react';
import { createBemHelper } from '../../util/BEM';
import './Round.scss';
import { Heading } from '../shared/Heading';

const BEM = createBemHelper('round');

export interface RoundProps {
  roundNumber: number;
  roundName: string;
}

export const Round: FC<RoundProps> = (props) => {
  return (
    <div className={BEM()}>
      <Heading>ROUND {props.roundNumber}</Heading>
      <div className={BEM('round-name')}>{props.roundName}</div>
    </div>
  );
};
