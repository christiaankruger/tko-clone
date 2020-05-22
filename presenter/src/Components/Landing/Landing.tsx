import React, { Component } from 'react';
import { createBemHelper } from '../../util/BEM';
import './Landing.scss';
import { Heading } from '../shared/Heading';
import { observable, action } from 'mobx';
import { observer } from 'mobx-react';
import { TextField, Button, Link } from '@material-ui/core';

const BEM = createBemHelper('landing');

export interface LandingProps {
  onCreate: () => Promise<void>;
  onJoin: (code: string) => Promise<void>;
}

@observer
export class Landing extends Component<LandingProps> {
  @observable
  private gameCode: string = '';

  @observable
  private error?: string;

  render() {
    return (
      <div className={BEM()}>
        <Heading>WELCOME</Heading>
        <TextField
          value={this.gameCode}
          onChange={this.onChange}
          label="Game Code"
          variant="outlined"
          size={'small'}
          error={!!this.error}
        />
        <Button variant="contained" color={'primary'} onClick={this.onJoin}>
          Join
        </Button>
        <Link component="button" variant="body2" onClick={this.props.onCreate}>
          Start a new game
        </Link>
      </div>
    );
  }

  @action
  private onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log(`On-change: ${event.target.value}.`);
    this.gameCode = event.target.value;
  };

  private onJoin = async () => {
    if (!this.gameCode || this.gameCode.length !== 4) {
      return;
    }
    await this.props.onJoin(this.gameCode);
  };
}
