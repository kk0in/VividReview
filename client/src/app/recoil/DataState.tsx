import { atom } from "recoil";

export const csvDataState = atom({
  key: "csvDataState",
  default: [],
//   effects_UNSTABLE: [
//     ({ setSelf, onSet }) => {
//       const savedValue = localStorage.getItem('csvDataState');
//       if (savedValue != null) {
//         setSelf(JSON.parse(savedValue));
//       }
//       onSet(newValue => {
//         localStorage.setItem('csvDataState', JSON.stringify(newValue));
//       });
//     },
//   ],
});

export const keypointDataState = atom({
  key: "keypointDataState",
  default: null,
});

export const videoDataState = atom({
  key: "videoDataState",
  default: '',
});
