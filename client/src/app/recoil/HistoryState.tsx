import { atom } from 'recoil';
import { CanvasLayer } from '../../components/dashboard/PdfViewer';

export const historyState = atom<CanvasLayer[][]>({
  key: 'historyState',
  default: [],
});

export const redoStackState = atom<CanvasLayer[][]>({
  key: 'redoStackState',
  default: [],
});