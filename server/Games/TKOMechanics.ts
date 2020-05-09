import { v4 } from 'uuid';

export const shortId = (namespace: string) => {
  return `${namespace}-${v4().split('-')[0]}`;
};

export class Design {
  createdBy!: string;
  base64!: string;
  id: string = shortId('design');

  constructor(props: { createdBy: string; base64: string }) {
    Object.assign(this, props);
  }
}

export class Slogan {
  createdBy!: string;
  text!: string;
  id: string = shortId('slogan');

  constructor(props: { createdBy: string; text: string }) {
    Object.assign(this, props);
  }
}

export class Shirt {
  createdBy!: string;
  design!: Design;
  slogan!: Slogan;
  id: string = shortId('shirt');

  constructor(props: { createdBy: string; text: string }) {
    Object.assign(this, props);
  }
}
