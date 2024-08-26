import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useRecoilValue } from "recoil";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Customized,
  Rectangle,
  Legend,
} from "recharts";
import { gridModeState } from "@/app/recoil/ToolState";
import { CategoricalChartFunc } from "recharts/types/chart/generateCategoricalChart";

const GRAPH_HEIGHT = 200;
const X_AXIS_HEIGHT = 20;

const processData = (
  data: any,
  positiveEmotion: string[],
  negativeEmotion: string[],
  selectedPositives: boolean[],
  selectedNegatives: boolean[],
) => {
  if (!data) return [];
  return data.map((d: any) => {
    const begin = parseFloat(d.begin);
    const end = parseFloat(d.end);
    const positiveSum = positiveEmotion.reduce((acc, cur) => {
      if (!selectedPositives[positiveEmotion.indexOf(cur)]) return acc;
      const value = d[cur];
      return acc + (isNaN(value) ? 0 : value);
    }, 0);

    const negativeSum = negativeEmotion.reduce((acc, cur) => {
      if (!selectedNegatives[negativeEmotion.indexOf(cur)]) return acc;
      const value = d[cur];
      return acc + (isNaN(value) ? 0 : value);
    }, 0);
    return {
      ...d,
      begin,
      end,
      positive_score: positiveSum,
      negative_score: negativeSum,
    };
  });
};

const processPageInfo = (pageInfo: any) => {
  const timeToPagesMap = pageInfo
    ? Object.keys(pageInfo).map((page: any) => ({
        start: parseFloat(pageInfo[page].start),
        end: parseFloat(pageInfo[page].end),
        page: parseInt(page, 10),
      }))
    : [];
  return timeToPagesMap;
};

const processTableOfContents = (tableOfContents: any) => {
  const pageToTitleSubtitleMap: {
    [key: number]: { title: string; subtitle: string };
  } = {};

  tableOfContents.forEach((content: any) => {
    content.subsections.forEach((sub: any) => {
      sub.page.forEach((page: number) => {
        pageToTitleSubtitleMap[page] = {
          title: content.title,
          subtitle: sub.title,
        };
      });
    });
  });

  return pageToTitleSubtitleMap;
};

const CustomRectangle = ({
  pageStartTime,
  pageEndTime,
}: {
  pageStartTime: number;
  pageEndTime: number;
}) => {
  return (
    <Rectangle
      x={pageStartTime}
      y={0}
      width={pageEndTime - pageStartTime}
      height={GRAPH_HEIGHT - X_AXIS_HEIGHT} // Use 100 to fill the entire height
      fill="rgba(0,0,0,0.3)"
    />
  );
};

const calculateStartAndEnd = (
  pageKey: number | string,
  gridMode: number,
  pageInfo: any,
  pages: any[]
) => {
  let start: number = 0;
  let end: number = 0;
  switch (gridMode) {
    case 0:
      if (pageInfo && pageInfo[pageKey]) {
        start = pageInfo[pageKey].start;
        end = pageInfo[pageKey].end;
      }
      break;
    default:
      if (pageInfo && pageInfo[pages[0]] && pageInfo[pages[pages.length - 1]]) {
        start = pageInfo[pages[0]].start;
        end = pageInfo[pages[pages.length - 1]].end;
      }
      break;
  }
  return { start, end };
};

const CustomXAxisTick = ({
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
          x={0}
          y={-100}
          width={100}
          height={100}
          href={images[currentXTick - 1]} // `href` 속성을 사용하여 이미지 삽입
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

const CurrentPositionLine = ({ x }: { x: number }) => (
  <line
    x1={x}
    y1={0}
    x2={x}
    y2={GRAPH_HEIGHT - X_AXIS_HEIGHT}
    stroke="#008014"
    strokeWidth={3} // Reduced thickness
    opacity={0.5} // Added opacity for transparency
  />
);

const HorizontalLine = ({
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
  return <line x1={x1} y1={y} x2={x2} y2={y} stroke={color} strokeWidth={3} />;
};

const CustomLegend = (props) => {
  const FONT_COLOR = "#333";
  const FONT_SIZE = "10px";
  const { payload } = props;
  return (
    <div
      style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}
    >
      {payload.map((entry, index) => (
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
          <span style={{ color: FONT_COLOR, fontSize: FONT_SIZE }}>{entry.value}</span>
        </div>
      ))}
      <div style={{ display: "flex", alignItems: "center", marginRight: 20 }}>
        <div
          style={{
            width: 20,
            height: 3,
            backgroundColor: "red",
            marginRight: 5,
          }}
        />
        <span style={{ color: FONT_COLOR, fontSize: FONT_SIZE }}>Missed Part</span>
      </div>
      <div style={{ display: "flex", alignItems: "center" }}>
        <div
          style={{
            width: 20,
            height: 3,
            backgroundColor: "green",
            marginRight: 5,
          }}
        />
        <span style={{ color: FONT_COLOR, fontSize: FONT_SIZE }}>Important Part</span>
      </div>
    </div>
  );
};

const useProcessedData = (
  data: unknown,
  positiveEmotion: string[],
  negativeEmotion: string[],
  selectedPositives: boolean[],
  selectedNegatives: boolean[]
): any[] =>
  useMemo(
    () => processData(data, positiveEmotion, negativeEmotion, selectedPositives, selectedNegatives),
    [data, positiveEmotion, negativeEmotion, selectedPositives, selectedNegatives]
  );

const useProcessedPageInfo = (pageInfo: unknown) =>
  useMemo(
    () => processPageInfo(pageInfo).map((page) => page.start),
    [pageInfo]
  );

const useTableOfContentsMap = (tableOfContents: unknown) =>
  useMemo(() => processTableOfContents(tableOfContents), [tableOfContents]);

const useMinMaxValues = (processedData: any[]) => {
  const yValues = processedData.flatMap(
    (data: { positive_score: any; negative_score: any }) => [
      data.positive_score,
      data.negative_score,
    ]
  );
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);

  const minX = Math.min(
    ...processedData
      .map((data: { begin: any; end: any }) => [data.begin, data.end])
      .flat()
  );
  const maxX = Math.max(
    ...processedData
      .map((data: { begin: any; end: any }) => [data.begin, data.end])
      .flat()
  );

  return { minY, maxY, minX, maxX };
};

const ToggleSwitch = ({
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
      <div style={{ position: "relative", display: "inline-block", width: "24px", height: "12px" }}>
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
            backgroundColor: checked ? color : "#D8D6F9",  // Updated colors
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
      <span style={{ marginLeft: 8, color: "#333", fontSize: "12px" }}>
        {label}
      </span>
    </label>
  );
};

const CustomToggleSwitch = ({
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
      }}
    >
      {positiveEmotion.map((label, index) => (
        <ToggleSwitch
          key={`positive-${index}`}
          label={label}
          checked={selectedPositives[index]}
          onChange={() => handlePositiveToggle(index)}
          color = "#8884d8"
        />
      ))}
    </div>
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        height: 20,
        backgroundColor: "#E5E7EB",
      }}
    >
      {negativeEmotion.map((label, index) => (
        <ToggleSwitch
          key={`negative-${index}`}
          label={label}
          checked={selectedNegatives[index]}
          onChange={() => handleNegativeToggle(index)}
          color = "#82ca9d"
        />
      ))}
    </div>
    </div>
  );
};

const ArousalGraph = ({
  data,
  handleAudioRef,
  positiveEmotion,
  negativeEmotion,
  page,
  pages,
  pageInfo,
  progressRef,
  tableOfContents,
  graphWidth,
  findPage,
  findTocIndex,
  tocIndex,
  hoverState,
  setHoverState,
  setTocIndex,
  setPage,
  images,
  missedAndImportantParts,
}: {
  data: any;
  handleAudioRef: any;
  positiveEmotion: string[];
  negativeEmotion: string[];
  page: number;
  pages: number[];
  pageInfo: any;
  progressRef: any;
  tableOfContents: any;
  graphWidth: number;
  findPage: any;
  findTocIndex: any;
  tocIndex: any;
  hoverState: any;
  setHoverState: any;
  setTocIndex: any;
  setPage: any;
  images: any;
  missedAndImportantParts: any;
}) => {
  const gridMode = useRecoilValue(gridModeState);
  const [selectedPositives, setSelectedPositives] = useState(
    Array(positiveEmotion.length).fill(true)
  );
  const [selectedNegatives, setSelectedNegatives] = useState(
    Array(negativeEmotion.length).fill(true)
  );

  const processedData = useProcessedData(
    data,
    positiveEmotion,
    negativeEmotion,
    selectedPositives,
    selectedNegatives,
  );
  const ticks_ = useProcessedPageInfo(pageInfo);
  const tableOfContentsMap = useTableOfContentsMap(tableOfContents);
  const { minY, maxY, minX, maxX } = useMinMaxValues(processedData);

  const [pageStartTime, setpageStartTime] = useState(0);
  const [pageEndTime, setpageEndTime] = useState(100);
  const [currentXTick, setCurrentXTick] = useState(0);
  const [isMouseDown, setIsMouseDown] = useState(false);

  const handlePositiveToggle = (index: number) => {
    setSelectedPositives((prevState) => {
      const newState = [...prevState];
      newState[index] = !newState[index];
      return newState;
    });
  };

  const handleNegativeToggle = (index: number) => {
    setSelectedNegatives((prevState) => {
      const newState = [...prevState];
      newState[index] = !newState[index];
      return newState;
    });
  };

  const calculateScalingFactor = useCallback(
    (data: number) => (graphWidth * data) / maxX,
    [graphWidth, maxX]
  );

  useEffect(() => {
    const page = findPage(hoverState.activeLabel);
    if (page) {
      setCurrentXTick(page);
    }
  }, [hoverState.activeLabel, findPage]);

  const handleMouseDown: CategoricalChartFunc = useCallback(
    (e: any) => {
      handleAudioRef(e.activePayload[0].payload);
      setHoverState({
        hoverPosition: e.chartX,
        hoverTime: e.activePayload[0].payload.begin,
        activeLabel: e.activeLabel,
      });
      setIsMouseDown(true);
    },
    [handleAudioRef, setHoverState]
  );

  const handleMouseMove: CategoricalChartFunc = useCallback(
    (nextState: CategoricalChartState) => {
      const e = nextState as {
        activeLabel: any;
        chartX: any;
        activePayload: { payload: any }[];
      };
      if (e && e.activeLabel && isMouseDown) {
        setHoverState({
          hoverPosition: e.chartX,
          hoverTime: e.activePayload[0].payload.begin,
          activeLabel: e.activeLabel,
        });
        handleAudioRef(e.activePayload[0].payload);
      }
    },
    [isMouseDown, handleAudioRef, setHoverState]
  );

  const handleMouseUp: CategoricalChartFunc = useCallback(
    (e: any) => {
      if (isMouseDown) {
        const timeValue = e.activePayload[0].payload.begin;
        const newPage = findPage(timeValue);
        const newTocIndex = findTocIndex(newPage);
        newTocIndex && newTocIndex !== tocIndex && setTocIndex(newTocIndex);
        newPage > 0 && setPage(newPage);

        handleAudioRef(e.activePayload[0].payload);
        setIsMouseDown(false);
      }
    },
    [
      isMouseDown,
      findPage,
      findTocIndex,
      tocIndex,
      setTocIndex,
      setPage,
      handleAudioRef,
    ]
  );

  useEffect(() => {
    const { start, end } = calculateStartAndEnd(
      page,
      gridMode,
      pageInfo,
      pages
    );
    setpageStartTime(start);
    setpageEndTime(end);
  }, [pages, page, gridMode, pageInfo]);

  useEffect(() => {
    const page_ = findPage(hoverState.hoverTime || 0);
    const { start, end } = calculateStartAndEnd(
      page_,
      gridMode,
      pageInfo,
      pages
    );
    setpageStartTime(start);
    setpageEndTime(end);
  }, [hoverState.hoverTime, gridMode, pageInfo, findPage]);

  return (
    <ResponsiveContainer width="100%" height={GRAPH_HEIGHT} style={{}}>
      <LineChart
        data={processedData}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <YAxis hide domain={[minY, maxY]} />
        <Line
          type="monotone"
          dataKey="positive_score"
          stroke="#8884d8"
          dot={false}
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="negative_score"
          stroke="#82ca9d"
          dot={false}
          isAnimationActive={false}
        />
        <Customized
          component={
            <CustomRectangle
              pageStartTime={calculateScalingFactor(pageStartTime)}
              pageEndTime={calculateScalingFactor(pageEndTime)}
            />
          }
        />
        {hoverState.hoverPosition !== null && (
          <Customized
            component={<CurrentPositionLine x={hoverState.hoverPosition} />}
          />
        )}
        <XAxis
          dataKey="begin"
          ticks={ticks_}
          type="number"
          tick={(props) => (
            <CustomXAxisTick
              {...props}
              currentXTick={currentXTick}
              tableOfContentsMap={tableOfContentsMap}
              graphWidth={graphWidth}
              findPage={findPage}
              images={images}
            />
          )}
          tickLine={false}
          domain={[minX, maxX]}
          interval={0}
          height={15}
        />
        <Customized
          component={
            <CustomRectangle
              pageStartTime={calculateScalingFactor(pageStartTime)}
              pageEndTime={calculateScalingFactor(pageEndTime)}
            />
          }
        />
        {hoverState.hoverPosition !== null && (
          <Customized
            component={<CurrentPositionLine x={hoverState.hoverPosition} />}
          />
        )}
        {missedAndImportantParts?.missed.map((part: any) => {
          // horizontal line
          return (
            <Customized
              component={
                <HorizontalLine
                  x1={calculateScalingFactor(part[0])}
                  x2={calculateScalingFactor(part[1])}
                  color={"red"}
                  y={180}
                />
              }
            />
          );
        })}
        {missedAndImportantParts?.important.map((part: any) => {
          // horizontal line
          return (
            <Customized
              component={
                <HorizontalLine
                  x1={calculateScalingFactor(part[0])}
                  x2={calculateScalingFactor(part[1])}
                  color={"green"}
                  y={177}
                />
              }
            />
          );
        })}
        <Legend verticalAlign="top" content={<CustomLegend />} />
      </LineChart>
      <CustomToggleSwitch
        positiveEmotion={positiveEmotion}
        negativeEmotion={negativeEmotion}
        selectedPositives={selectedPositives}
        selectedNegatives={selectedNegatives}
        handlePositiveToggle={handlePositiveToggle}
        handleNegativeToggle={handleNegativeToggle}
      />
    </ResponsiveContainer>
  );
};

export default ArousalGraph;
