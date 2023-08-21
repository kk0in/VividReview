"use client";
import React, { useEffect, useRef } from "react";
import keypointData from "../../public/keypoint.json";
import { useRecoilValue } from "recoil";
import { currentTimeState } from "../app/recoil/currentTimeState";

interface KeypointsDrawingProps {
  position: string;
}

function withCurrentTime<P>(WrappedComponent: React.ComponentType<P & { currentTime: number }>): React.ComponentType<P> {
  return function WithCurrentTime(props: P) {
    const currentTime = useRecoilValue(currentTimeState);
    return <WrappedComponent currentTime={currentTime} {...props} />;
  };
}

function KeypointsDrawing(props: KeypointsDrawingProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { position } = props;
  const currentTime = useRecoilValue(currentTimeState);

  const loadData = (instanceIndex: number) => {
    const keypoints =
      keypointData.instance_info[instanceIndex].instances[0].keypoints;
    return keypoints;
  };

  const drawLines = (keypoints: number[][]) => {
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
    } else if (position === "RightHand") {
      skeleton_links = keypointData.meta_info.skeleton_links.filter(
        (link) =>
          link[0] >= 91 && link[0] <= 111 && link[1] >= 91 && link[1] <= 111
      );
    } else if (position === "LeftHand") {
      skeleton_links = keypointData.meta_info.skeleton_links.filter(
        (link) => link[0] >= 112 && link[1] >= 112
      );
    } else {
      skeleton_links = keypointData.meta_info.skeleton_links; // 기본값
    }

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    context.clearRect(0, 0, canvas.width, canvas.height);
    const one =
      position === "wholeBody"
        ? canvasWidth / 1.0
        : position === "RightHand"
        ? 100 / 0.35
        : 100 / 0.1;
    const two =
      position === "wholeBody"
        ? canvasHeight / 3
        : position === "RightHand"
        ? 500 / 3.5
        : 500 / 1.1;

    skeleton_links.forEach((link) => {
      const [startIdx, endIdx] = link;
      const [x1, y1] = keypoints[startIdx];
      const [x2, y2] = keypoints[endIdx];

      const scale = 0.45;

      const scaledX1 = x1 * scale - one;
      const scaledY1 = y1 * scale - two;
      const scaledX2 = x2 * scale - one;
      const scaledY2 = y2 * scale - two;

      context.beginPath();
      context.moveTo(scaledX1, scaledY1);
      context.lineTo(scaledX2, scaledY2);
      context.strokeStyle = "black";
      context.lineWidth = 1;
      context.stroke();
    });
  };

  useEffect(() => {
    const instanceIndex = Math.ceil((currentTime * 1000) / 33.33);
    const keypoints = loadData(instanceIndex);
    drawLines(keypoints);

    const drawInterval = setInterval(() => {
      const nextIndex = instanceIndex + 1;
      const keypoints = loadData(nextIndex);
      drawLines(keypoints);
    }, 33.33);

    return () => clearInterval(drawInterval);
  }, [currentTime, position]);

  const canvasSizeWidth =
    position === "wholeBody" ? 200 : position === "RightHand" ? 150 : 150;
  const canvasSizeHeight =
    position === "wholeBody" ? 200 : position === "RightHand" ? 150 : 150;

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

export default withCurrentTime(KeypointsDrawing);
