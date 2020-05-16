import React, { Component } from 'react';
import { createBemHelper } from '../../util/BEM';
import './VSVote.scss';
import { Heading } from '../shared/Heading';
import { Shirt } from '../../../../server/Games/TKOMechanics';
import { ShirtDisplay } from '../shared/ShirtDisplay';
import { observable } from 'mobx';
import { observer } from 'mobx-react';

const BEM = createBemHelper('vs-vote');

export interface VSVoteProps {
  contenders: Shirt[];
  timer: number;
}

@observer
export class VSVote extends Component<VSVoteProps> {
  render() {
    return (
      <div className={BEM()}>
        <div className={BEM('header')}>
          <Heading>VOTE!</Heading>
          {spacer}
          <div className={BEM('timer')}>{this.props.timer}</div>
        </div>
        <div className={BEM('contenders')}>
          {this.props.contenders.map((c) => {
            return <ShirtDisplay shirt={c} />;
          })}
        </div>
      </div>
    );
  }
}

const spacer = (
  <div
    style={{
      width: '8px',
    }}
  />
);
