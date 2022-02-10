import React, { FC } from 'react';
import { createBemHelper } from '../../util/BEM';
import './RankingResults.scss';
import { Heading } from '../shared/Heading';

const BEM = createBemHelper('ranking-result');

export interface RankingResultProps {
  correctRanking: {
    text: string;
  }[];
  playerResults: {
    name: string;
    score: number;
    summary: string[];
  }[];
}

export const RankingResult: FC<RankingResultProps> = ({ correctRanking, playerResults }) => {
  const sortedPlayerResults = playerResults.sort((a, b) => b.score - a.score);

  return (
    <div className={BEM()}>
      <Heading>Results</Heading>

      <div className={BEM('container')}>
        <div className={BEM('correct-ranking-container')}>
          <div className={BEM('list-container')}>
            {correctRanking.map((correct, index) => {
              return (
                <div className={BEM('list-item')}>
                  {index + 1}: {correct.text}
                </div>
              );
            })}
          </div>
        </div>
        <div className={BEM('player-results-container')}>
          {sortedPlayerResults.map((result, index) => {
            return (
              <div className={BEM('player-result')}>
                <div className={BEM('player-name')}>
                  {index + 1}: {result.name} ({result.score})
                </div>
                <div className={BEM('result-block-container')}>
                  {result.summary.map((s) => {
                    return <div className={BEM('result-block', s)} />;
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
