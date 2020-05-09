import React, { Component, Suspense } from 'react';
import { render } from 'react-dom';
import { observer } from 'mobx-react';
import SocketIO from 'socket.io-client';

import './App.scss';
import { Login } from './Components/Login/Login';
import { Store, Pages } from './store/Store';
import { Post } from './store/API';
import { PlayerJoinResult, SOCKET_EVENTS, CommandResult, CommandType, OutgoingCommand } from '../../lib/SharedTypes';
import { Waiting } from './Components/Waiting/Waiting';
import { Draw } from './Components/Draw/Draw';

const socket = SocketIO('http://localhost:7024');
const store = new Store();

(window as any).socket = socket;
(window as any).POST = Post;
(window as any).store = store;

socket.on(SOCKET_EVENTS.COMMAND, (command: OutgoingCommand) => {
  store.consumeCommand(command);
});

@observer
export class App extends Component {
  render() {
    return <Suspense fallback={<div>Loading...</div>}>{this.renderPage()}</Suspense>;
  }

  private renderPage = () => {
    if (store.page === Pages.LOGIN) {
      return (
        <Login
          onLogin={async (playerName, gameCode) => {
            const result = await Post<PlayerJoinResult>(`/${gameCode}/join`, {
              name: playerName,
            });
            store.setGameDetails({
              playerName,
              gameCode,
              playerId: result.playerId,
            });
            socket.emit(SOCKET_EVENTS.PLAYER_SOCKET_IDENTIFIER, { playerId: result.playerId });
            store.goToPage(Pages.WAITING);
          }}
        />
      );
    }
    if (store.page === Pages.WAITING) {
      return <Waiting name={store.gameDetails!.playerName} />;
    }
    if (store.page === Pages.DRAW) {
      return (
        <Draw
          onSave={async (asBase64) => {
            const result = await postCommand('design', { base64: asBase64 });
            store.consumeCommand(result.command);
          }}
        />
      );
    }

    return <div>Who am I?</div>;
  };
}

render(<App />, document.getElementById('main'));

async function postCommand(type: CommandType, metadata: object): Promise<CommandResult> {
  return Post<CommandResult>(store.commandUrl, {
    playerId: store.gameDetails!.playerId,
    command: {
      type,
      metadata,
    },
  });
}
