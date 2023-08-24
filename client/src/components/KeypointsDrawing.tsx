// "use client";
import React, { useEffect, useRef, useState } from "react";
// import keypointData from "../../public/keypoint.json";
import { useRecoilValue } from "recoil";
import { keypointDataState } from "@/app/recoil/DataState";
import { currentTimeState } from "../app/recoil/currentTimeState";

interface TestProps {
  position: string;
}

function withCurrentTime<P>(
  WrappedComponent: React.ComponentType<P & { currentTime: number }>
): React.ComponentType<P> {
  return function WithCurrentTime(props: P) {
    const currentTime = useRecoilValue(currentTimeState);
    return <WrappedComponent currentTime={currentTime} {...props} />;
  };
}

function Test(props: TestProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keypointData = useRecoilValue(keypointDataState);
  const { position } = props;
  const currentTime = useRecoilValue(currentTimeState);
  const canvasSize_wholeBody = 200;
  const canvasSize_hand = 110;
  const canvasSizeWidth =
    position === "wholeBody" ? canvasSize_wholeBody : canvasSize_hand;
  const canvasSizeHeight =
    position === "wholeBody" ? canvasSize_wholeBody : canvasSize_hand;

  const total_skeleton_links = keypointData.meta_info.skeleton_links;
  const total_skeleton_colors =
    keypointData.meta_info.skeleton_link_colors["__ndarray__"];

  const skeleton_color_dic = {};

  // total_skeleton_links 배열의 각 요소와 total_skeleton_colors 배열의 각 요소를 연결하여 객체를 생성
  for (let i = 0; i < total_skeleton_links.length; i++) {
    const key = total_skeleton_links[i];
    const value = total_skeleton_colors[i];
    skeleton_color_dic[key] = value;
    // console.log(key)
    // console.log(skeleton_color_dic[key])
  }
  let size = 0;
  if (
    keypointData.instance_info[0] &&
    keypointData.instance_info[0].instances &&
    keypointData.instance_info[0].instances[0]
  ) {
    for (let i = 0; i < 10; i++) {
      const keypoints_ = keypointData.instance_info[i].instances[0].keypoints;
      const [x1, y1] = keypoints_[5];
      const [x2, y2] = keypoints_[6];
      size += x1 - x2;
    }
  }

  size /= 10;
  const scale =
    position === "wholeBody"
      ? 0.3 / (size / canvasSize_wholeBody)
      : 0.5 / (size / canvasSize_wholeBody);

  console.log(scale);

  const loadData = (instanceIndex: number) => {
    if (
      keypointData.instance_info[instanceIndex] &&
      keypointData.instance_info[instanceIndex].instances &&
      keypointData.instance_info[instanceIndex].instances[0]
    ) {
      const keypoints =
        keypointData.instance_info[instanceIndex].instances[0].keypoints;

      return keypoints;
    } else {
      return null;
    }
  };

  const drawLines = (keypoints: number[][]) => {
    if (keypoints == null) {
      return;
    }
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!context) return;

    let skeleton_links;

    if (position === "wholeBody") {
      skeleton_links = keypointData.meta_info.skeleton_links.filter(
        (link) =>
          !(
            (link[0] >= 0 && link[0] <= 4) ||
            (link[1] >= 0 && link[1] <= 4) ||
            (link[0] >= 13 && link[0] <= 22) ||
            (link[1] >= 13 && link[1] <= 22) ||
            (link[0] >= 23 && link[0] <= 90) ||
            (link[1] >= 23 && link[1] <= 90)
          )
      );
    } else if (position === "LeftHand") {
      skeleton_links = keypointData.meta_info.skeleton_links.filter(
        (link) =>
          link[0] >= 91 && link[0] <= 111 && link[1] >= 91 && link[1] <= 111
      );
    } else if (position === "RightHand") {
      skeleton_links = keypointData.meta_info.skeleton_links.filter(
        (link) =>
          link[0] >= 112 && link[0] <= 132 && link[1] >= 112 && link[1] <= 132
      );
    } else {
      skeleton_links = keypointData.meta_info.skeleton_links;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    let center_left_x = 0;
    let center_left_y = 0;
    for (let i = 91; i < 112; i++) {
      center_left_x += keypoints[i][0];
      center_left_y += keypoints[i][1];
    }
    center_left_x /= 21;
    center_left_y /= 21;
    let center_right_x = 0;
    let center_right_y = 0;
    for (let i = 112; i < 133; i++) {
      center_right_x += keypoints[i][0];
      center_right_y += keypoints[i][1];
    }
    center_right_x /= 21;
    center_right_y /= 21;
    const centerX =
      position === "wholeBody"
        ? (keypoints[5][0] +
            keypoints[6][0] +
            keypoints[11][0] +
            keypoints[12][0]) /
          4
        : position === "LeftHand"
        ? center_left_x
        : center_right_x;
    const centerY =
      position === "wholeBody"
        ? (keypoints[11][1] +
            keypoints[5][1] +
            keypoints[12][1] +
            keypoints[6][1]) /
          4
        : position === "LeftHand"
        ? center_left_y
        : center_right_y;

    skeleton_links.forEach((link) => {
      const [startIdx, endIdx] = link;
      const [x1, y1] = keypoints[startIdx];
      const [x2, y2] = keypoints[endIdx];

      const scaledX1 = (x1 - centerX) * scale + canvasSizeWidth / 2;
      const scaledY1 = (y1 - centerY) * scale + canvasSizeHeight / 2;
      const scaledX2 = (x2 - centerX) * scale + canvasSizeWidth / 2;
      const scaledY2 = (y2 - centerY) * scale + canvasSizeHeight / 2;

      const color = skeleton_color_dic[link];

      context.beginPath();
      context.moveTo(scaledX1, scaledY1);
      context.lineTo(scaledX2, scaledY2);
      context.strokeStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
      context.lineWidth = 2;
      context.stroke();
    });
  };

  useEffect(() => {
    // current time to frame (instance) index
    const instanceIndex = Math.ceil(currentTime * 60);
    //const instanceIndex = Math.ceil((currentTime * 1000) / 33.33);
    const keypoints = loadData(instanceIndex);
    drawLines(keypoints);

    const drawInterval = setInterval(() => {
      const nextIndex = instanceIndex + 1;
      const keypoints = loadData(nextIndex);
      drawLines(keypoints);
    }, 33.33);

    return () => clearInterval(drawInterval);
  }, [currentTime, position]);

  return (
    <div style={{}}>
      <canvas
        ref={canvasRef}
        width={canvasSizeWidth}
        height={canvasSizeHeight}
        className="bg-white"
      />
    </div>
  );
}

export default withCurrentTime(Test);
