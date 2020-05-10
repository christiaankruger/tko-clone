import React, { Component } from 'react';
import { createBemHelper } from '../../util/BEM';
import './Login.scss';
import { Heading } from '../shared/Heading';
import { TextInput } from '../shared/TextInput';
import { observable } from 'mobx';
import { Button } from '../shared/Button';

const BEM = createBemHelper('login');

export interface LoginProps {
  onLogin: (name: string, gameCode: string) => Promise<void>;
}

export class Login extends Component<LoginProps> {
  private roomCode: string = '';
  private name: string = '';

  render() {
    return (
      <div className={BEM()}>
        <Heading>Welcome</Heading>
        <TextInput label={'Room Code'} autoCapitalizeCharacters={true} onChange={(value) => (this.roomCode = value)} />
        <TextInput label={'Name'} onChange={(value) => (this.name = value)} />
        <Button onClick={this.login}>Join</Button>
      </div>
    );
  }

  private login = () => {
    if (!this.name || !this.roomCode) {
      // Do nothing
      return;
    }
    if (this.roomCode.length !== 4) {
      // Room code not valid
      return;
    }

    this.props.onLogin(this.name, this.roomCode);
  };
}

export default Login;
