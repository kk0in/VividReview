import { atom } from 'recoil';

export const toolState = atom<string | null>({
  key: 'toolState',
  default: null,
});

export const recordingState = atom<boolean>({
  key: 'recordingState',
  default: false,
});

export const gridModeState = atom<number>({
  key: 'gridModeState',
  default: 0,
});

export const searchQueryState = atom<string>({
  key: 'searchQueryState',
  default: '',
});