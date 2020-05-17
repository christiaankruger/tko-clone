import React, { Component } from 'react';
import { createBemHelper } from '../../util/BEM';
import './VSVote.scss';
import { Heading } from '../shared/Heading';
import { Shirt } from '../../../../server/Games/TKOMechanics';
import { ShirtDisplay } from '../shared/ShirtDisplay';
import { observable, computed } from 'mobx';
import { observer } from 'mobx-react';
import { Chip, Avatar } from '@material-ui/core';
import { FiCheck } from 'react-icons/fi';

const BEM = createBemHelper('vs-vote');

export interface VSVoteProps {
  contenders: (Shirt & { creatorName: string })[];
  timer: number;

  votes?: {
    forShirtId: string;
    voterName: string;
    scoreValue: number;
  }[];
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
            return (
              <div className={BEM('contender')}>
                <ShirtDisplay shirt={c} creatorName={this.showCreators ? c.creatorName : undefined} />
                {this.props.votes && (
                  <>
                    <div className={BEM('vote-results')}>
                      {this.props.votes
                        .filter((v) => v.forShirtId === c.id)
                        .map((vote) => {
                          return (
                            <Chip
                              avatar={
                                <Avatar>
                                  <FiCheck />
                                </Avatar>
                              }
                              label={vote.voterName}
                              clickable
                              color="primary"
                              variant="outlined"
                            />
                          );
                        })}
                    </div>
                    <Heading>
                      +{' '}
                      {this.props.votes
                        .filter((v) => v.forShirtId === c.id)
                        .reduce((memo, x) => memo + x.scoreValue, 0)}
                    </Heading>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  @computed
  private get showCreators() {
    return !!this.props.votes;
  }
}

const spacer = (
  <div
    style={{
      width: '8px',
    }}
  />
);
