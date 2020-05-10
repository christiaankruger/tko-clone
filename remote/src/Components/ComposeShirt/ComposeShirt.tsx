import React, { Component } from 'react';
import { createBemHelper } from '../../util/BEM';
import './ComposeShirt.scss';
import ShirtPng from '../../../assets/shirt.png';
import { Heading } from '../shared/Heading';
import { observer } from 'mobx-react';
import { observable, action } from 'mobx';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { Button } from '../shared/Button';

const BEM = createBemHelper('compose-shirt');

export interface ComposeShirtProps {
  designs: {
    id: string;
    base64: string;
  }[];
  slogans: {
    id: string;
    text: string;
  }[];
  onSubmit: (designId: string, sloganId: string) => Promise<void>;
}

@observer
export class ComposeShirt extends Component<ComposeShirtProps> {
  @observable
  private designIndex = 0;

  @observable
  private sloganIndex = 0;

  render() {
    return (
      <div className={BEM()}>
        <Heading>Compose</Heading>
        <div
          className={BEM('shirt-container')}
          style={{
            backgroundImage: `url("${ShirtPng}")`,
            backgroundSize: 'contain',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            height: '400px',
            maxHeight: '400px',
          }}
        >
          {this.designPicker()}
          {this.sloganPicker()}
        </div>
        <Button onClick={this.submit}>Submit</Button>
      </div>
    );
  }

  private submit = () => {
    const designId = this.props.designs[this.designIndex].id;
    const sloganId = this.props.slogans[this.sloganIndex].id;
    this.props.onSubmit(designId, sloganId);
  };

  private designPicker() {
    return (
      <div className={BEM('picker')}>
        <FiChevronLeft size={'2em'} onClick={this.previousDesign} />
        <img
          style={{
            userSelect: 'none',
          }}
          width={'40%'}
          src={this.props.designs[this.designIndex].base64}
        />
        <FiChevronRight size={'2em'} onClick={this.nextDesign} />
      </div>
    );
  }

  private sloganPicker() {
    return (
      <div className={BEM('picker')}>
        <FiChevronLeft size={'2em'} onClick={this.previousSlogan} />
        <div
          className={BEM('slogan-option')}
          style={{
            width: '40%',
            textAlign: 'center',
          }}
        >
          {this.props.slogans[this.sloganIndex].text}
        </div>
        <FiChevronRight size={'2em'} onClick={this.nextSlogan} />
      </div>
    );
  }

  @action
  private nextDesign = () => {
    this.designIndex = (this.designIndex + 1) % this.props.designs.length;
  };

  @action
  private nextSlogan = () => {
    this.sloganIndex = (this.sloganIndex + 1) % this.props.slogans.length;
  };

  @action
  private previousDesign = () => {
    this.designIndex--;
    if (this.designIndex < 0) {
      this.designIndex = this.props.designs.length - 1;
    }
  };

  @action
  private previousSlogan = () => {
    this.sloganIndex--;
    if (this.sloganIndex < 0) {
      this.sloganIndex = this.props.slogans.length - 1;
    }
  };
}
