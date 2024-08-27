import { atom } from "recoil";

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

export const matchedParagraphsState = atom<Object | null>({
  key: "matchedParagraphsState",
  default: null,
});

export const pdfImagesState = atom<{image: string, dimensions: [number, number]}[]>({
  key: "pdfImagesState",
  default: [],
});