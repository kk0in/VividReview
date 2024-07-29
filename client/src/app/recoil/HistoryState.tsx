import { atom } from 'recoil';

export const historyState = atom<string[][]>({
  key: 'historyState',
  default: [],
});

export const redoStackState = atom<string[][]>({
  key: 'redoStackState',
  default: [],
});
