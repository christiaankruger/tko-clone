import React, { Component } from 'react';
import { createBemHelper } from '../../util/BEM';
import './Select.scss';
import { Heading } from '../shared/Heading';
import { TextInput } from '../shared/TextInput';
import { Button } from '../shared/Button';
import { observable, action } from 'mobx';
import { observer } from 'mobx-react';
import { equals } from 'ramda';

const BEM = createBemHelper('select');

export interface SelectOption {
  id: string;
  text: string;
}

export interface SelectProps {
  options: SelectOption[];
  numberToSelect: number;
  onSubmit: (result: { id: string }[]) => Promise<void>;
}

@observer
export class Select extends Component<SelectProps> {
  private currentText: string = '';
  @observable
  private count: number = 0;
  @observable
  private selectArray: string[] = [];

  @action
  private addToSelectArray = (item: string) => {
    if (this.selectArray.length >= this.props.numberToSelect) {
      return;
    }
    this.selectArray.push(item);
  };

  @action
  private removeFromSelectArray = (item: string) => {
    this.selectArray = this.selectArray.filter((x) => x !== item);
  };

  @action
  private tapItem = (item: string) => {
    const action = this.selectArray.includes(item) ? this.removeFromSelectArray : this.addToSelectArray;
    action(item);
  };

  render() {
    return (
      <div className={BEM()}>
        <Heading>Select</Heading>
        <div className={BEM('list')}>
          {this.props.options.map((option) => {
            const selected = this.selectArray.findIndex((x) => x === option.id) !== -1;

            return (
              <div className={BEM('item')} onClick={() => this.tapItem(option.id)}>
                <span>{option.text}</span>
                <span>{selected ? '+' : ''}</span>
              </div>
            );
          })}
        </div>

        <Button onClick={this.submit}>Submit</Button>
      </div>
    );
  }

  @action
  private submit = async () => {
    if (this.selectArray.length !== this.props.numberToSelect) {
      return;
    }

    await this.props.onSubmit(this.selectArray.map((x) => ({ id: x })));
  };
}
