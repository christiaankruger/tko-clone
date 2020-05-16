import { v4 } from 'uuid';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Base 58 uppercase

export const generateRoomCode = () => {
  const set = shuffle([...ALPHABET.split(''), ...ALPHABET.split(''), ...ALPHABET.split('')]);
  return set.slice(0, 4).join('');
};

export const miniIdentifier = () => {
  const [mini] = v4().split('-');
  return mini;
};

export const shuffle = <T>(array: T[]): T[] => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

export const sample = <T>(array: T[]): T => {
  return array[Math.floor(Math.random() * array.length)];
};
