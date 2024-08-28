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

export const searchQueryState = atom<{ query: string; type: string }>({
  key: 'searchQueryState',
  default: {
    query: '', // 검색어
    type: 'semantic', // 기본 검색 타입
  },
});

export const inputTextState = atom<string>({
  key: 'inputTextState',
  default: '', // 초기 값
});

export const searchTypeState = atom<string>({
  key: 'searchTypeState',
  default: 'semantic', // 초기 값
});

export const isSaveClickedState = atom<boolean>({
  key: 'isSaveClickedState', // unique ID (with respect to other atoms/selectors)
  default: false, // default value (aka initial value)
});