import BEM from 'react-bem-helper';

export const createBemHelper = (name: string, prefix: string = 'jcr') => {
  return BEM({
    prefix: `${prefix}-`,
    name,
    outputIsString: true,
  });
};
