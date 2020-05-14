import React, { FC } from 'react';

export const Heading: FC = (props) => {
  return (
    <div
      className={'jcp-heading'}
      style={{
        fontSize: '24px',
        fontFamily: "'Montserrat', serif",
      }}
    >
      {props.children}
    </div>
  );
};
