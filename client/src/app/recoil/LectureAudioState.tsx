import { atom } from "recoil";

export enum PlayerStateType {
  PLAYING,
  PAUSED,
  IDLE,
};

export enum PlayerRequestType {
  FORWARD,
  BACKWARD,
  NONE,
};

export const playerState = atom<PlayerStateType>({
  key: "playerState",
  default: PlayerStateType.PAUSED,
});

export const playerRequestState = atom<PlayerRequestType>({
  key: "playerRequestState",
  default: PlayerRequestType.NONE,
});
