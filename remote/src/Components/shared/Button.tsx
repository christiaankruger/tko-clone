import React, { FC } from 'react';
import { createBemHelper } from '../../util/BEM';

import './Button.scss';

const BEM = createBemHelper('button');

export interface ButtonProps {
  onClick: () => void;
}

export const Button: FC<ButtonProps> = (props) => {
  const { children, onClick } = props;
  return (
    <div className={BEM()} onClick={onClick}>
      {children}
    </div>
  );
};

/*
  <Button>Click me!</Button>
*/
