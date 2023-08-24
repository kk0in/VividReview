// "use client";
import React, { useEffect, useRef } from "react";
// import keypointData from "../../public/keypoint.json";
import { useRecoilValue } from "recoil";
import { keypointDataState } from "@/app/recoil/DataState"
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
      // Handle the case where the required data is not available
      // console.log("keypoint data is not available", instanceIndex)
      return null; // Or throw an error, return a default value, etc.
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
      skeleton_links = keypointData.meta_info.skeleton_links; // 기본값
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    const scale = position === "wholeBody" ? 0.45 : 0.7;

    const centerX =
      position === "wholeBody"
        ? keypoints[8][0] - 80
        : position === "LeftHand"
        ? keypoints[91][0] - 80
        : keypoints[112][0] - 80;
    const centerY =
      position === "wholeBody"
        ? keypoints[1][1] - 50
        : position === "LeftHand"
        ? keypoints[91][1] - 50
        : keypoints[112][1] - 50;

    skeleton_links.forEach((link) => {
      const [startIdx, endIdx] = link;
      const [x1, y1] = keypoints[startIdx];
      const [x2, y2] = keypoints[endIdx];

      const scaledX1 = (x1 - centerX) * scale;
      const scaledY1 = (y1 - centerY) * scale;
      const scaledX2 = (x2 - centerX) * scale;
      const scaledY2 = (y2 - centerY) * scale;
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

  const canvasSizeWidth = position === "wholeBody" ? 200 : 110;
  const canvasSizeHeight = position === "wholeBody" ? 180 : 110;

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
