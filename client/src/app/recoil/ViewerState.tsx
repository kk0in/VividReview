import { atom } from "recoil";
export interface IToCSubsection {
  title: string;
  page: number[];
}

export interface IToCSection {
  title: string;
  subsections: IToCSubsection[];
}

export const pdfPageState = atom({
  key: "pdfPageState",
  default: 1,
});

export const subsectionState = atom<IToCSubsection>({
  key: "subsectionState",
  default: {title: "", page: []},
});

export const tocState = atom<IToCSection[]>({
  key: "tocState",
  default: [],
});