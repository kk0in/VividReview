"use client";
import React, { Component } from "react";
import keypointData from "../../public/keypoint.json";
import { useRecoilValue } from "recoil";
import { currentTimeState } from "./currentTimeState";
function withCurrentTime(WrappedComponent) {
  return function WithCurrentTime(props) {
    const currentTime = useRecoilValue(currentTimeState);
    return <WrappedComponent currentTime={currentTime} {...props} />;
  };
}

class KeypointsDrawing extends Component {
  constructor(props) {
    super(props);
    this.state = {
      keypoints: [],
      instanceIndex: 0,
      skeleton_links: [],
      position: "", // position 값 추가
    };
  }

  componentDidMount() {
    this.loadData(this.state.instanceIndex); // 초기 데이터 로딩
    this.drawInterval = setInterval(
      this.changeInstanceAndDraw.bind(this),
      33.33
    );
  }

  componentWillUnmount() {
    clearInterval(this.drawInterval);
  }

  loadData(instanceIndex) {
    const keypoints =
      keypointData.instance_info[instanceIndex].instances[0].keypoints;
    this.setState({ keypoints, instanceIndex });
  }

  changeInstanceAndDraw() {
    const { currentTime } = this.props;

    const interval = 33.33;

    const frame_id = Math.ceil((currentTime * 1000) / interval);
    const nextIndex = frame_id;
    this.loadData(nextIndex);
    this.drawLines();
  }

  drawLines() {
    const canvas = this.canvasRef;
    const context = canvas.getContext("2d");

    const { keypoints } = this.state; // position 값 가져오기
    const position = this.props.position;

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
        ? canvasWidth / 1.1
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

      const scale = 0.4;

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
  }

  render() {
    const { position } = this.props;
    const canvasSizeWidth =
      position === "wholeBody" ? 200 : position === "RightHand" ? 100 : 100;
    const canvasSizeHeight =
      position === "wholeBody" ? 180 : position === "RightHand" ? 100 : 100;

    return (
      <div style={{}}>
        <canvas
          ref={(ref) => (this.canvasRef = ref)}
          width={canvasSizeWidth}
          height={canvasSizeHeight}
          className="bg-white"
        />
      </div>
    );
  }
}

export default withCurrentTime(KeypointsDrawing);
