import React, { FC } from 'react';
import MButton from '@material-ui/core/Button';

import './Button.scss';

export interface ButtonProps {
  onClick: () => void;
}

export const Button: FC<ButtonProps> = (props) => {
  const { children, onClick } = props;

  return (
    <MButton variant="contained" color={'primary'} onClick={onClick}>
      {children}
    </MButton>
  );
};
