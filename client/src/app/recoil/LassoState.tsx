import { atom } from 'recoil';

type Prompt = {
  prompt: string;
  answers: string[];
}

export const defaultPrompts: Prompt[] = [
  {prompt: "summarize", answers: []},
  {prompt: "translate to korean", answers: []}
]

export type Lasso = {
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  lassoId: number | null;
  prompts: Prompt[];
}

export const lassoState = atom<Record<string, Record<number, Lasso[]>>>({
  key: 'lassoState',
  default: {},
});

export const focusedLassoState = atom<Lasso | null>({
  key: 'focusedLassoState',
  default: null,
});