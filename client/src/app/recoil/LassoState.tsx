import { atom } from 'recoil';

type Prompt = {
  prompt: string;
  answers: string[];
}

type Lasso = {
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