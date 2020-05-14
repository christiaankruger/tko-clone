import React, { Component, Suspense } from 'react';
import { render } from 'react-dom';
import { observer } from 'mobx-react';
import SocketIO from 'socket.io-client';
import { Alert, AlertTitle } from '@material-ui/lab';

import './Presenter.scss';
import { Store, Pages } from './store/Store';
import { Post } from '../../frontend-shared/util/API';
import { Landing } from './Components/Landing/Landing';
import { Lobby } from './Components/Lobby/Lobby';
import { SOCKET_EVENTS, OutgoingPresenterCommand } from '../../lib/SharedTypes';

const socket = SocketIO('http://localhost:7024');
const store = new Store();

(window as any).socket = socket;
(window as any).POST = Post;
(window as any).store = store;

socket.on(SOCKET_EVENTS.COMMAND, (command: OutgoingPresenterCommand) => {
  store.consumeCommand(command);
});

@observer
export class Presenter extends Component {
  render() {
    return (
      <Suspense fallback={<div>Loading...</div>}>
        {store.load
          ? store.load.case({
              pending: this.renderPage,
              fulfilled: this.renderPage,
              rejected: (e) => {
                return (
                  <>
                    <Alert severity="error">
                      <AlertTitle>Mayday!</AlertTitle>
                      {e.message}
                    </Alert>
                    {this.renderPage()}
                  </>
                );
              },
            })
          : this.renderPage()}
      </Suspense>
    );
  }

  private renderPage = () => {
    if (store.currentPage === Pages.LANDING) {
      return (
        <Landing
          onCreate={async () => {
            await store.create(() => {
              console.log('Emitting', SOCKET_EVENTS.CLIENT_SOCKET_IDENTIFIER, { id: store.presenterDetails.id });
              socket.emit(SOCKET_EVENTS.CLIENT_SOCKET_IDENTIFIER, { id: store.presenterDetails.id });
            });
          }}
          onJoin={async (code) => {
            await store.join(code, () => {
              socket.emit(SOCKET_EVENTS.CLIENT_SOCKET_IDENTIFIER, { id: store.presenterDetails.id });
            });
          }}
        />
      );
    }
    if (store.currentPage === Pages.LOBBY) {
      const onStart = store.presenterDetails.isCreator
        ? async () => {
            const result = await Post(`/${store.gameCode}/start`, {});
          }
        : undefined;

      return <Lobby gameCode={store.gameCode} players={store.players} onStart={onStart} />;
    }

    return <div>Girl, what?</div>;
  };
}

render(<Presenter />, document.getElementById('main'));
