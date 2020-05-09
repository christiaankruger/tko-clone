import React, { FC } from 'react';
import { createBemHelper } from '../../util/BEM';
import './Waiting.scss';
import { Heading } from '../shared/Heading';

const BEM = createBemHelper('waiting');

export interface WaitingProps {
  name: string;
}

export const Waiting: FC<WaitingProps> = (props) => {
  return (
    <div className={BEM()}>
      <Heading>
        Hang tight, <div className={'name'}>{props.name}</div>.
      </Heading>
    </div>
  );
};
