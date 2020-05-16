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
import { Round } from './Components/Round/Round';
import { ExplainAndWait } from './Components/ExplainAndWait/ExplainAndWait';
import { Player } from '../../server/Games/Game';
import { dummyShirtOptions } from './dummy/shirt';
import { Shirt } from '../../server/Games/TKOMechanics';
import { Announcement } from './Components/Announcement/Announcement';
import { VSVote } from './Components/VSVote/VSVote';

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
    if (store.currentPage === Pages.ROUND) {
      return <Round roundName={store.metadata.roundName!} roundNumber={store.metadata.roundNumber!} />;
    }
    if (store.currentPage === Pages.EXPLAIN_AND_WAIT) {
      const explainStats = store.metadata.explainStats!;
      const explainText = store.metadata.explainText!;

      // const explainStats: any[] = [];
      // const explainText = {
      //   heading: 'This is a heading',
      //   explainer: 'See how it looks',
      //   shirt: new Shirt({
      //     createdBy: 'abc',
      //     design: {
      //       base64: dummyShirtOptions[0],
      //       createdBy: 'a',
      //       id: 'b',
      //     },
      //     slogan: {
      //       createdBy: 'a',
      //       id: 'b',
      //       text: 'This is a funny slogan, see how it looks',
      //     },
      //   }),
      // };

      return <ExplainAndWait timer={store.timer} explainStats={explainStats} explainText={explainText} />;
    }
    if (store.currentPage === Pages.ANNOUNCEMENT) {
      const heading = store.metadata.announcementHeading!;
      const subtext = store.metadata.announcementSubtext;

      return <Announcement heading={heading} subtext={subtext} />;
    }
    if (store.currentPage === Pages.VS_VOTE) {
      const contenders = dummyShirtOptions.map((s) => {
        return new Shirt({
          createdBy: 'a',
          design: {
            base64: s,
            createdBy: 'a',
            id: 'a',
          },
          slogan: {
            createdBy: 'b',
            id: 'b',
            text: 'I is a zupper funny slogan',
          },
        });
      });
      // const contenders = store.metadata.vsVoteContenders!;
      return <VSVote timer={store.timer} contenders={contenders} />;
    }

    return <div>Girl, what?</div>;
  };
}

render(<Presenter />, document.getElementById('main'));
