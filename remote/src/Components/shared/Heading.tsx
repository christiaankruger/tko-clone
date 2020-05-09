import React, { FC } from 'react';

export const Heading: FC = (props) => {
  return (
    <div
      style={{
        fontSize: '20px',
        fontFamily: "'Merriweather', serif",
      }}
    >
      {props.children}
    </div>
  );
};
