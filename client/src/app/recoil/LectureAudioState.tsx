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

export enum NavigationStateType {
  IN_NAVIGATION,
  NAVIGATION_COMPLETE,
  PAGE_CHANGED,
  NONE
};

export const playerState = atom<PlayerStateType>({
  key: "playerState",
  default: PlayerStateType.PAUSED,
});

export const playerRequestState = atom<PlayerRequestType>({
  key: "playerRequestState",
  default: PlayerRequestType.NONE,
});

export const audioTimeState = atom<number>({
  key: "audioState",
  default: 0,
});

export const audioDurationState = atom<number>({
  key: "audioDurationState",
  default: 0,
});

export const progressValueState = atom<number>({
  key: "progressValueState",
  default: 0,
});

export const navigationState = atom<NavigationStateType>({
  key: "navigationState",
  default: NavigationStateType.NONE,
});
