import { atom } from "recoil";

export enum Player {
  PLAY,
  PAUSE,
  STOP,
};

export const audioTimeState = atom<number>({
  key: "audioTimeState",
  default: 0,
});

export const audioDurationState = atom<number>({
  key: "audioDurationState",
  default: 0,
});


export const playerState = atom<Player>({
  key: "playerState",
  default: Player.PAUSE,
});