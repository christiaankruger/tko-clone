import React, { Component, Suspense } from 'react';
import { render } from 'react-dom';
import { observer } from 'mobx-react';
import SocketIO from 'socket.io-client';

import './App.scss';
import { Login } from './Components/Login/Login';
import { Store, Pages } from './store/Store';
import { Post } from './store/API';
import { PlayerJoinResult, SOCKET_EVENTS } from '../../lib/SharedTypes';
import { Waiting } from './Components/Waiting/Waiting';

const socket = SocketIO('http://localhost:7024');
const store = new Store();

(window as any).socket = socket;
(window as any).POST = Post;
(window as any).store = store;

@observer
export class App extends Component {
  render() {
    return <Suspense fallback={<div>Loading...</div>}>{this.renderPage()}</Suspense>;
  }

  private renderPage = () => {
    if (store.page === Pages.LOGIN) {
      return (
        <Login
          onLogin={async (name, gameCode) => {
            const result = await Post<PlayerJoinResult>(`/${gameCode}/join`, {
              name,
            });
            store.setPlayerDetails(name, result.playerId);
            socket.emit(SOCKET_EVENTS.PLAYER_SOCKET_IDENTIFIER, { playerId: result.playerId });
            store.goToPage(Pages.WAITING);
          }}
        />
      );
    }
    if (store.page === Pages.WAITING) {
      return <Waiting name={store.playerDetails!.name} />;
    }

    return <div>Who am I?</div>;
  };
}

render(<App />, document.getElementById('main'));
