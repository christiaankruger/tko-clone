import React, { Component } from 'react';
import { createBemHelper } from '../../util/BEM';
import './ExplainAndWait.scss';
import { Player } from '../../../../server/Games/Game';
import { Heading } from '../shared/Heading';
import { Shirt } from '../../../../server/Games/TKOMechanics';
import { ShirtDisplay } from '../shared/ShirtDisplay';
import { observer } from 'mobx-react';
import { List, ListItem, ListItemText, Chip } from '@material-ui/core';

const BEM = createBemHelper('explain-and-wait');

export interface ExplainAndWaitProps {
  explainStats: { player: Player; status: number | string }[];
  explainText: {
    heading: string;
    explainer: string;
    shirt?: Shirt;
  };
  timer: number;
}

@observer
export class ExplainAndWait extends Component<ExplainAndWaitProps> {
  render() {
    return (
      <div className={BEM()}>
        <div className={BEM('left')}>
          <div className={BEM('header')}>
            <Heading>{this.props.explainText.heading}</Heading>
            <div className={BEM('timer')}>{this.props.timer}</div>
          </div>
          <div className={BEM('explainer')}>{this.props.explainText.explainer}</div>
          {this.props.explainText.shirt && <ShirtDisplay shirt={this.props.explainText.shirt} />}
        </div>
        <div className={BEM('right')}>
          <Heading>PLAYERS</Heading>
          <List component="nav" aria-label="secondary mailbox folders">
            {this.props.explainStats.map(({ player, status }) => {
              return (
                <ListItem>
                  <ListItemText
                    primary={
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        {player.name}
                        {spacer}
                        <Chip label={status} />
                      </div>
                    }
                  />
                </ListItem>
              );
            })}
          </List>
        </div>
      </div>
    );
  }
}

const spacer = (
  <div
    style={{
      width: '4px',
    }}
  />
);
