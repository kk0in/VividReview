import { atom } from 'recoil';

export type Prompt = {
  prompt: string;
  answers: string[];
}

export const defaultPrompts: Prompt[] = [
  {prompt: "summarize", answers: []},
  {prompt: "translate to korean", answers: []}
]

export const focusedLassoState = atom<number | null>({
  key: 'focusedLassoState',
  default: null,
});

export const reloadFlagState = atom<boolean>({
  key: 'reloadFlagState',
  default: false,
});

export const rerenderFlagState = atom<boolean>({
  key: 'rerenderFlagState',
  default: false,
});

export const activePromptState = atom<[number, string, number]>({
  key: 'activePromptState',
  default: [0, "", 0],
});
