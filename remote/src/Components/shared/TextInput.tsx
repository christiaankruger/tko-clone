import React, { FC } from 'react';
import { createBemHelper } from '../../util/BEM';
import './TextInput.scss';

const BEM = createBemHelper('text-input');

export interface TextInputProps {
  label: string;
  autoCapitalizeCharacters?: boolean;
  onChange: (value: string) => void;
}

export const TextInput: FC<TextInputProps> = (props) => {
  const { label, autoCapitalizeCharacters = false, onChange } = props;

  const sanitizedOnChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  return (
    <div className={BEM()}>
      <div className={BEM('label')}>{label}</div>
      <input
        type="text"
        autoCapitalize={autoCapitalizeCharacters ? 'characters' : 'off'}
        onChange={sanitizedOnChange}
      />
    </div>
  );
};
