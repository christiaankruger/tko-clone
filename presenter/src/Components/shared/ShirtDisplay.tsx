import React, { FC } from 'react';
import ShirtPng from '../../../../remote/assets/shirt.png';
import { Shirt } from '../../../../server/Games/TKOMechanics';

export interface ShirtDisplayProps {
  shirt: Shirt;
}

export const ShirtDisplay: FC<ShirtDisplayProps> = (props) => {
  const { shirt } = props;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundImage: `url("${ShirtPng}")`,
        backgroundSize: 'contain',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        height: '300px',
        maxHeight: '300px',
      }}
    >
      <img
        style={{
          userSelect: 'none',
        }}
        width={'30%'}
        src={shirt.design.base64}
      />
      <div
        style={{
          width: '30%',
          textAlign: 'center',
        }}
      >
        {shirt.slogan.text}
      </div>
    </div>
  );
};
