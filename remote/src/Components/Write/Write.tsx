import React, { Component } from 'react';
import { createBemHelper } from '../../util/BEM';
import './Write.scss';
import { Heading } from '../shared/Heading';
import { TextInput } from '../shared/TextInput';
import { Button } from '../shared/Button';
import { observable, action } from 'mobx';
import { observer } from 'mobx-react';

const BEM = createBemHelper('write');

export interface WriteProps {
  onSubmit: (text: string) => Promise<void>;
}

@observer
export class Write extends Component<WriteProps> {
  private currentText: string = '';
  @observable
  private count: number = 0;

  render() {
    return (
      <div className={BEM()}>
        <Heading>Write</Heading>
        <TextInput key={`count-${this.count}`} label={'Entry'} onChange={this.setCurrentText} />
        <Button onClick={this.submit}>Submit</Button>
      </div>
    );
  }

  private setCurrentText = (text: string) => {
    this.currentText = text;
  };

  @action
  private submit = () => {
    if (!this.currentText) {
      return;
    }
    this.props.onSubmit(this.currentText);
    this.count++;
    this.currentText = '';
  };
}
