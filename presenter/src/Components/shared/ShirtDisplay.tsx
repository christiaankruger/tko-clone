import React, { FC } from 'react';
import ShirtPng from '../../../../remote/assets/shirt.png';
import { Shirt } from '../../../../server/Games/TKOMechanics';
import { Badge } from '@material-ui/core';

export interface ShirtDisplayProps {
  shirt: Shirt;
  creatorName?: string;
}

export const ShirtDisplay: FC<ShirtDisplayProps> = (props) => {
  const { shirt, creatorName } = props;

  return (
    <>
      <div
        style={{
          display: 'flex',
          position: 'relative',
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
        {creatorName && (
          <div
            style={{
              position: 'absolute',
              bottom: '20px',
              right: '55px',
              background: `rgb(69, 129, 209)`,
              color: 'white',
              fontFamily: 'Montserrat, serif',
              padding: '12px',
              borderRadius: '2px',
            }}
          >
            {creatorName}
          </div>
        )}
      </div>
    </>
  );
};
