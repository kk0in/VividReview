import { atom } from "recoil";

export enum ViewerMode {
  DEFAULT,
  REVIEW
};

export interface IToCSubsection {
  title: string;
  page: number[];
}

export interface IToCSection {
  title: string;
  subsections: IToCSubsection[];
}

export interface IToCIndex {
  section: number;
  subsection: number;
}

export const pdfPageState = atom({
  key: "pdfPageState",
  default: 1,
});

export const tocState = atom<IToCSection[]>({
  key: "tocState",
  default: [],
});

export const tocIndexState = atom<IToCIndex>({
  key: "tocIndexState",
  default: {section: 0, subsection: 0},
});

export const modeState = atom<ViewerMode>({
  key: "modeState",
  default: ViewerMode.REVIEW,
});

export const matchedParagraphsState = atom<Object | null>({
  key: "matchedParagraphsState",
  default: null,
});
