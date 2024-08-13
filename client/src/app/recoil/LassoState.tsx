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

export type LassoList = {
  projectId: string;
  pageNumber: number;
  lassoList: Lasso[];
}

export const lassoState = atom<Record<string, LassoList[]>>({
  key: 'lassoState',
  default: {},
});