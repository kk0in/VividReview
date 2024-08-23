import { atom } from 'recoil';

type Prompt = {
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