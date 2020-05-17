import React, { Component, Suspense } from 'react';
import { render } from 'react-dom';
import { observer } from 'mobx-react';
import SocketIO from 'socket.io-client';

import './App.scss';
import { Login } from './Components/Login/Login';
import { Store, Pages } from './store/Store';
import {
  PlayerJoinResult,
  SOCKET_EVENTS,
  CommandResult,
  PlayerCommandType,
  OutgoingPlayerCommand,
} from '../../lib/SharedTypes';
import { Waiting } from './Components/Waiting/Waiting';
import { Draw } from './Components/Draw/Draw';
import { Write } from './Components/Write/Write';
import { ComposeShirt } from './Components/ComposeShirt/ComposeShirt';
import { dummyShirtOptions } from './dummy';
import { Score } from './Components/Score/Score';
import { Vote } from './Components/Vote/Vote';
import { Post } from '../../frontend-shared/util/API';

const socket = SocketIO();
const store = new Store();

(window as any).socket = socket;
(window as any).POST = Post;
(window as any).store = store;

socket.on(SOCKET_EVENTS.COMMAND, (command: OutgoingPlayerCommand) => {
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
              playerId: result.player.id,
            });
            socket.emit(SOCKET_EVENTS.CLIENT_SOCKET_IDENTIFIER, { id: result.player.id });
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
    if (store.page === Pages.WRITE) {
      return (
        <Write
          onSubmit={async (text) => {
            const result = await postCommand('slogan', { text });
            store.consumeCommand(result.command);
          }}
        />
      );
    }
    if (store.page === Pages.COMPOSE) {
      // We should have metadata
      // metadata = {designs: [], slogans: []}

      const { designs, slogans } = store.metadata;

      // Testing:
      // const designs = dummyShirtOptions.map((data) => ({
      //   id: Math.random() + '',
      //   base64: data,
      // }));
      // const slogans = ['Slogan 1', 'Slogan 2'].map((s) => ({
      //   id: Math.random() + '',
      //   text: s,
      // }));

      return (
        <ComposeShirt
          designs={designs}
          slogans={slogans}
          onSubmit={async (designId, sloganId) => {
            const result = await postCommand('shirt', {
              designId,
              sloganId,
            });
            store.consumeCommand(result.command);
          }}
        />
      );
    }

    if (store.page === Pages.SCORE) {
      const { shirtId, possibleScores, description } = store.metadata;

      return (
        <Score
          description={description}
          possibleScores={possibleScores}
          onScore={async (value) => {
            const result = await postCommand('score', {
              shirtId,
              value,
            });
            store.consumeCommand(result.command);
          }}
        />
      );
    }

    if (store.page === Pages.VOTE) {
      const { between } = store.metadata;

      return (
        <Vote
          between={between}
          onVote={async (targetId) => {
            const result = await postCommand('vote', { targetId });
            store.consumeCommand(result.command);
          }}
        />
      );
    }

    return <div>Who am I?</div>;
  };
}

render(<App />, document.getElementById('main'));

async function postCommand(type: PlayerCommandType, metadata: object): Promise<CommandResult> {
  return Post<CommandResult>(store.commandUrl, {
    playerId: store.gameDetails!.playerId,
    command: {
      type,
      metadata,
    },
  });
}
