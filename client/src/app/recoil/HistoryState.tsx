import { atom } from 'recoil';
import { CanvasLayer } from '../../components/dashboard/PdfViewer';

const idGenerator = () => {
  let counter = 1;
  return () => counter++;
}

export const getNewHistoryId = idGenerator();

export type HistoryType = {
  pageNumber: number,
  layers: CanvasLayer[],
  id: number
}

export const historyState = atom<HistoryType[]>({
  key: 'historyState',
  default: [],
});

export const redoStackState = atom<HistoryType[]>({
  key: 'redoStackState',
  default: [],
});
