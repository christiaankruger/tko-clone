import React, { FC } from 'react';

export const Heading: FC = (props) => {
  return (
    <div
      className={'jcp-heading'}
      style={{
        fontSize: '24px',
        fontFamily: "'Montserrat', serif",
        color: '#4581d1', // Background color darkened 10%
      }}
    >
      {props.children}
    </div>
  );
};
