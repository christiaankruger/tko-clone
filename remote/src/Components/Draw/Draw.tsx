import React, { Component } from 'react';
import { createBemHelper } from '../../util/BEM';
import { Heading } from '../shared/Heading';
import CanvasDraw from 'react-canvas-draw';
import './Draw.scss';
import { Button } from '../shared/Button';
import { observer } from 'mobx-react';
import { observable, runInAction } from 'mobx';

export interface DrawProps {
  onSave: (asBase64: string) => Promise<void>;
}

const BEM = createBemHelper('draw');

const PAINT_COLORS = ['#FF0000', '#00FF00', '#0000FF', '#ffa500', '#ffff00', '#000000', '#FFFFFF'];

@observer
export class Draw extends Component<DrawProps> {
  private canvasRef: CanvasDraw | null = null;
  @observable
  private currentBrushColor: string = '#FF0000';

  constructor(props: DrawProps) {
    super(props);

    (window as any).canvasRef = () => this.canvasRef;
  }

  render() {
    return (
      <div className={BEM()}>
        <Heading>Draw</Heading>
        <div className={BEM('color-block-bar')}>
          {interlace(PAINT_COLORS.map(this.colorBlock), <div className={BEM('spacer')} />)}
        </div>
        <CanvasDraw ref={(ref) => (this.canvasRef = ref)} brushColor={this.currentBrushColor} />
        <div className={BEM('button-bar')}>
          <Button onClick={this.undo}>Undo</Button>
          <div className={BEM('spacer')} />
          <Button onClick={this.save}>Save</Button>
        </div>
      </div>
    );
  }

  private undo = () => {
    if (this.canvasRef) {
      this.canvasRef.undo();
    }
  };

  private save = () => {
    if (this.canvasRef) {
      // For some reason this isn't documented in the types:
      const dataUrl = (this.canvasRef as any).canvas.drawing.toDataURL();
      this.props.onSave(dataUrl);
    }
  };

  private colorBlock = (colorHexCode: string) => {
    return (
      <div
        className={BEM('color-block')}
        onClick={this.setBrushColorCurried(colorHexCode)}
        style={{
          backgroundColor: colorHexCode,
        }}
      />
    );
  };

  private setBrushColorCurried = (color: string) => {
    return () => {
      runInAction(() => (this.currentBrushColor = color));
    };
  };
}

function interlace<T, U>(list: T[], el: U) {
  const result = [];
  for (let i = 0; i < list.length - 1; i++) {
    result.push(list[i]);
    result.push(el);
  }
  result.push(list[list.length - 1]);
  return result;
}
