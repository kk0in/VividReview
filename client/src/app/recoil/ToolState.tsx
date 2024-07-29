import { atom } from 'recoil';

export const toolState = atom({
  key: 'toolState',
  default: null,
});

export const recordingState = atom<boolean>({
  key: 'recordingState',
  default: false,
});