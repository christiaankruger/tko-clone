import React, { Component } from 'react';
import { createBemHelper } from '../../util/BEM';
import './Rank.scss';
import { Heading } from '../shared/Heading';
import { TextInput } from '../shared/TextInput';
import { Button } from '../shared/Button';
import { observable, action } from 'mobx';
import { observer } from 'mobx-react';
import { equals } from 'ramda';

const BEM = createBemHelper('rank');

export interface RankOption {
  id: string;
  text: string;
}

export interface RankProps {
  options: RankOption[];
  numberToRank: number;
  onSubmit: (result: { id: string }[]) => Promise<void>;
}

@observer
export class Rank extends Component<RankProps> {
  private currentText: string = '';
  @observable
  private count: number = 0;
  @observable
  private rankArray: string[] = [];

  @action
  private addToRankArray = (item: string) => {
    if (this.rankArray.length >= this.props.numberToRank) {
      return;
    }
    this.rankArray.push(item);
  };

  @action
  private removeFromRankArray = (item: string) => {
    this.rankArray = this.rankArray.filter((x) => x !== item);
  };

  @action
  private tapItem = (item: string) => {
    const action = this.rankArray.includes(item) ? this.removeFromRankArray : this.addToRankArray;
    action(item);
  };

  render() {
    return (
      <div className={BEM()}>
        <Heading>Rank</Heading>
        <div className={BEM('list')}>
          {this.props.options.map((option) => {
            const myRank = this.rankArray.findIndex(equals(option.id));

            return (
              <div className={BEM('item')} onClick={() => this.tapItem(option.id)}>
                <span>{option.text}</span>
                <span>{myRank !== -1 ? myRank + 1 : ''}</span>
              </div>
            );
          })}
        </div>

        <Button onClick={this.submit}>Submit</Button>
      </div>
    );
  }

  @action
  private submit = () => {
    if (this.rankArray.length !== this.props.numberToRank) {
      return;
    }

    this.props.onSubmit(this.rankArray.map((x) => ({ id: x })));
  };
}
