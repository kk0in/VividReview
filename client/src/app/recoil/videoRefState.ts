import { atom } from 'recoil';

export const videoRefState = atom<HTMLVideoElement | null>({
  key: 'videoRefState', 
  default: null, 
});