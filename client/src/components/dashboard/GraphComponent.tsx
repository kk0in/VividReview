import React, { useState } from "react";
import {
  Rectangle,
} from "recharts";

const GRAPH_HEIGHT = 200;
const X_AXIS_HEIGHT = 20;

export const ToggleSwitch = ({
  label,
  checked,
  onChange,
  color,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  color: string;
}) => {
  return (
    <label style={{ display: "flex", alignItems: "center", marginRight: 10 }}>
      <div
        style={{
          position: "relative",
          display: "inline-block",
          width: "24px",
          height: "12px",
        }}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          style={{
            opacity: 0,
            width: 0,
            height: 0,
          }}
        />
        <span
          style={{
            position: "absolute",
            cursor: "pointer",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: checked ? color : "#D8D6F9", // Updated colors
            transition: ".4s",
            borderRadius: "12px",
          }}
        />
        <span
          style={{
            position: "absolute",
            content: "",
            height: "8px",
            width: "8px",
            borderRadius: "50%",
            backgroundColor: "white",
            transition: ".4s",
            transform: checked ? "translateX(12px)" : "translateX(0)",
            top: "2px",
            left: "2px",
          }}
        />
      </div>
      <span style={{ marginLeft: 8, color: "#333", fontSize: "14px" }}>
        {label}
      </span>
    </label>
  );
};

export const CustomToggleSwitch = ({
  positiveEmotion,
  negativeEmotion,
  selectedPositives,
  selectedNegatives,
  handlePositiveToggle,
  handleNegativeToggle,
}: {
  positiveEmotion: string[];
  negativeEmotion: string[];
  selectedPositives: boolean[];
  selectedNegatives: boolean[];
  handlePositiveToggle: (index: number) => void;
  handleNegativeToggle: (index: number) => void;
}) => {
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          height: 20,
          marginTop: 15,
          paddingTop: 10,
          backgroundColor: "#E5E7EB",
          borderWidth: 0,
        }}
      >
        {positiveEmotion.map((label, index) => (
          <ToggleSwitch
            key={`positive-${index}`}
            label={label}
            checked={selectedPositives[index]}
            onChange={() => handlePositiveToggle(index)}
            color="#8884d8"
          />
        ))}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          height: 20,
          backgroundColor: "#E5E7EB",
          borderWidth: 0,
        }}
      >
        {negativeEmotion.map((label, index) => (
          <ToggleSwitch
            key={`negative-${index}`}
            label={label}
            checked={selectedNegatives[index]}
            onChange={() => handleNegativeToggle(index)}
            color="#82ca9d"
          />
        ))}
      </div>
    </div>
  );
};

export const CustomXAxisTick = ({
  x,
  y,
  payload,
  currentXTick,
  tableOfContentsMap,
  graphWidth,
  findPage,
  images,
}: {
  x: number;
  y: number;
  payload: any;
  currentXTick: number;
  tableOfContentsMap: any;
  graphWidth: number;
  findPage: any;
  images: any;
}) => {
  const titleSubtitle = tableOfContentsMap[currentXTick];
  const pageNumber = findPage(payload.value);

  if (titleSubtitle && pageNumber === currentXTick) {
    const { subtitle } = titleSubtitle;
    const text = `${subtitle}`;

    const willTextOverflowRight = x + subtitle.length * 7 > graphWidth;
    let textAnchor = willTextOverflowRight ? "end" : "start";

    return (
      <g transform={`translate(${x},${y})`}>
        <image
          x={textAnchor == "end" ? -80 : 0}
          y={-100}
          width={100}
          height={100}
          href={images[currentXTick - 1]?.image} // `href` 속성을 사용하여 이미지 삽입
          opacity={0.5}
        />
        <text
          x={0}
          y={0}
          dy={7}
          textAnchor={textAnchor}
          fill={"#666"}
          fontSize={12}
        >
          {text}
        </text>
      </g>
    );
  }

  return null;
};

export const CurrentPositionLine = ({ x, y, x_axis }: { x: number; y: number; x_axis: number}) => (
  <line
    x1={x}
    y1={y}
    x2={x}
    y2={GRAPH_HEIGHT-x_axis}
    stroke="#008014"
    strokeWidth={3} // Reduced thickness
    opacity={0.5} // Added opacity for transparency
  />
);

export const HorizontalLine = ({
  x1,
  x2,
  color,
  y,
}: {
  x1: number;
  x2: number;
  color: string;
  y: number;
}) => {
  return <line x1={x1} y1={y} x2={x2} y2={y} stroke={color} strokeWidth={4} />;
};

export const CustomLegend = (props: any) => {
  const FONT_COLOR = "#333";
  const FONT_SIZE = "10px";
  const { payload } = props;
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        marginBottom: 5,
        height: 10,
      }}
    >
      {payload.map((entry: any, index: number) => (
        <div
          key={`item-${index}`}
          style={{ display: "flex", alignItems: "center", marginRight: 20 }}
        >
          <div
            style={{
              width: 20,
              height: 3,
              backgroundColor: entry.color,
              marginRight: 5,
            }}
          />
          <span style={{ color: FONT_COLOR, fontSize: FONT_SIZE }}>
            {"Engagement"}
          </span>
        </div>
      ))}
      <div
          key={"negative"}
          style={{ display: "flex", alignItems: "center", marginRight: 20 }}
        >
          <div
            style={{
              width: 20,
              height: 3,
              backgroundColor: "#82ca9d",
              marginRight: 5,
            }}
          />
          <span style={{ color: FONT_COLOR, fontSize: FONT_SIZE }}>
            {"Relaxation"}
          </span>
        </div>
      <div style={{ display: "flex", alignItems: "center", marginRight: 20 }}>
        <div
          style={{
            width: 20,
            height: 3,
            backgroundColor: "red",
            marginRight: 5,
          }}
        />
        <span style={{ color: FONT_COLOR, fontSize: FONT_SIZE }}>
          Miss
        </span>
      </div>
    </div>
  );
};

export const CustomRectangle = ({
  pageStartTime,
  pageEndTime,
  y,
  x_axis,
}: {
  pageStartTime: number;
  pageEndTime: number;
  y: number;
  x_axis: number;
}) => {
  return (
    <Rectangle
      x={pageStartTime}
      y={y || 0}
      width={pageEndTime - pageStartTime}
      height={GRAPH_HEIGHT - x_axis} // Use 100 to fill the entire height
      fill="rgba(0,0,0,0.3)"
    />
  );
};

export const CustomDot = ({
  cx,
  cy,
  value,
  threshold,
}: {
  cx: number;
  cy: number;
  value: number;
  threshold: number;
}) => {
  if (value >= threshold) {
    return (
      <circle
        cx={cx}
        cy={cy}
        r={2}
        stroke="#000000"
        strokeWidth={1}
        fill="#000000"
      />
    );
  }
  return null;
};
