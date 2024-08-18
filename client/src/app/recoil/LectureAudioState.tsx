import { atom } from "recoil";

export enum PlayerState {
  PLAYING,
  PAUSED,
  IDLE,
};

export enum PlayerRequestType {
  FORWARD,
  BACKWARD,
  NONE,
};

export const audioTimeState = atom<number>({
  key: "audioTimeState",
  default: 0,
});

export const audioDurationState = atom<number>({
  key: "audioDurationState",
  default: 0,
});

export const playerState = atom<PlayerState>({
  key: "playerState",
  default: PlayerState.PAUSED,
});

export const playerRequestState = atom<PlayerRequestType>({
  key: "playerRequestState",
  default: PlayerRequestType.NONE,
});
