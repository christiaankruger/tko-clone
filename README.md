# TKO Clone

_This is a clone of Tee-KO by [Jackbox Games](https://www.jackboxgames.com/)_

## Changes

Well, not exactly. Some changes were made to how scoring works:

- Points are introduced to the game. (Classic Tee KO only pits two shirts against each other at a time, seeing who can win a running streak. This leads to shock value attempts winning the game, and long-running shirts eventually losing to fatigue.)
- In every round, each shirt is given a score by every player. The top two shirts of the round proceed to a voting round, during which the players vote for their favorite.
- In some rounds, the slogan and design's artists get a tip of 50% of the score.
- A new round is introduced where all players get the same design, but have to provide their own slogans.

## Introducing 'Presenter'

Instead of live-streaming a single instance of the "Game", all players watch the game locally through their browsers (referred to as 'Presenter').

## The same old 'Remote'

Players still input their designs and slogans via mobile devices, through 'Remote'.

## Games codes and reconnections stay

- We still connect to our game via the classic 4-letter game code.
- If, at any point, you disconnect from your game on the `presenter` or `remote`, just sign in with the same code (and same player name on remote). The server will recognize you, catch you up & continue as normal.

## Usage

- Run `yarn build` to build the server, remote and presenter.
- Run `yarn start` to start up the server on port 7024. `remote` is served on `/` and `presenter` is served on `/watch`.

## Where the magic happens

`server/Games/TKO.ts` is home to `TKO`, the class that represents a single session of a TKO game. This extends `BaseGame` which provides the interface the server uses to communicate with the session, and the session can use to communicate with the players and presenters via websockets.

Both `presenter` and `remote` are pretty dumb applications, only displaying what they've been sent by the server.

## Going forward

It's already possible to run multiple games in parallel, and to build games other than TKO with the same building blocks found in `remote` and `presenter`.

I still have to:

- Do a lot of code cleanup, which I'll get to in due time.
- Implement round 3 and the game's end.
