import React, { Component } from 'react';
import { createBemHelper } from '../../util/BEM';
import './Lobby.scss';
import { Player } from '../../../../server/Games/Game';
import { computed } from 'mobx';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import { Heading } from '../shared/Heading';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import { FiCamera } from 'react-icons/fi';
import { Button } from '@material-ui/core';

const BEM = createBemHelper('lobby');

export interface LobbyProps {
  gameCode: string;
  players: Player[];

  onStart?: () => Promise<void>;
}

export class Lobby extends Component<LobbyProps> {
  render() {
    return (
      <div className={BEM()}>
        <div className={BEM('left')}>
          <div>
            Your code to join is <Heading>{this.props.gameCode}</Heading>
          </div>
          <div>
            {this.canStartGame ? (
              <div>
                When everyone is in{' '}
                <Button variant="contained" color={'primary'} onClick={this.props.onStart}>
                  Click here
                </Button>
              </div>
            ) : (
              <div>
                <div
                  style={{
                    fontWeight: 'bold',
                  }}
                >
                  Sit tight.
                </div>
                The host will start the game when everyone is in.
              </div>
            )}
          </div>
        </div>
        <div className={BEM('right')}>
          <Heading>PLAYERS</Heading>
          <List component="nav" aria-label="secondary mailbox folders">
            {this.props.players.map((player) => {
              return (
                <ListItem>
                  <ListItemText primary={player.name} secondary={'Ready to rock and roll'} />
                </ListItem>
              );
            })}
          </List>
        </div>
      </div>
    );
  }

  @computed
  private get canStartGame() {
    return !!this.props.onStart;
  }
}
