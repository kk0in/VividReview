import React, { useEffect, useState, useMemo, useCallback, use } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Customized,
  Legend,
} from "recharts";
import { gridModeState } from "@/app/recoil/ToolState";
import { CategoricalChartFunc } from "recharts/types/chart/generateCategoricalChart";
import {
  CustomRectangle,
  CustomLegend,
  CurrentPositionLine,
  CustomToggleSwitch,
  CustomXAxisTick,
  HorizontalLine,
  CustomDot,
} from "./GraphComponent";
import { CategoricalChartState } from "recharts/types/chart/types";
import {
  useMinMaxValues,
  useProcessedData,
  useProcessedPageInfo,
  useTableOfContentsMap,
  calculateStartAndEnd,
} from "../../utils/graph";
import {
  calibratePrecision,
  findPage,
  findTimeRange,
} from "../../utils/lecture";
import {
  audioDurationState,
  navigationState,
  NavigationStateType,
  progressValueState,
} from "@/app/recoil/LectureAudioState";
import {
  pdfPageState,
  tocIndexState,
  tocState,
} from "@/app/recoil/ViewerState";

const GRAPH_HEIGHT = 150;
const X_AXIS_HEIGHT = 20;

const ArousalGraph = ({
  data,
  positiveEmotion,
  negativeEmotion,
  pages,
  pageInfo,
  progressRef,
  tableOfContents,
  graphWidth,
  graphHeight,
  images,
  missedAndImportantParts,
  pageStartTime,
  pageEndTime,
  setpageStartTime,
  setpageEndTime,
}: {
  data: any;
  positiveEmotion: string[];
  negativeEmotion: string[];
  page: number;
  pages: number[];
  pageInfo: any;
  progressRef: any;
  tableOfContents: any;
  graphWidth: number;
  graphHeight: number;
  images: any;
  missedAndImportantParts: any;
  pageStartTime: number;
  pageEndTime: number;
  setpageStartTime: any;
  setpageEndTime: any;
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
    selectedNegatives
  );
  const ticks_ = useProcessedPageInfo(pageInfo);
  const tableOfContentsMap = useTableOfContentsMap(tableOfContents);
  const {
    minY,
    maxY,
    minX,
    maxX,
    minYpos,
    maxYpos,
    minYneg,
    maxYneg,
    per90YPos,
    per90YNeg,
  } = useMinMaxValues(processedData);

  const [currentXTick, setCurrentXTick] = useState(0);
  const [circlePosition, setCirclePosition] = useState(0);
  const [progressValue, setProgressValue] = useRecoilState(progressValueState);
  const audioDuration = useRecoilValue(audioDurationState);
  const [currentNavigation, setCurrentNavigation] =
    useRecoilState(navigationState);
  const toc = useRecoilValue(tocState);
  const tocIndex = useRecoilValue(tocIndexState);
  const page = useRecoilValue(pdfPageState);

  const divRef = React.useRef<HTMLDivElement>(null);

  const handlePositiveToggle = (index: number) => {
    setSelectedPositives((prevState) => {
      const newState = [...prevState];
      newState[index] = !newState[index];
      if (newState.every((v) => !v)) return prevState;
      return newState;
    });
  };

  const handleNegativeToggle = (index: number) => {
    setSelectedNegatives((prevState) => {
      const newState = [...prevState];
      newState[index] = !newState[index];
      if (newState.every((v) => !v)) return prevState;
      return newState;
    });
  };

  const calculateScalingFactor = useCallback(
    (data: number) => {
      if (graphWidth === null) {
        return 0;
      }
      return (graphWidth * data) / maxX + 5;
    },
    [graphWidth, maxX]
  );

  useEffect(() => {
    if (progressRef.current !== null) {
      const progress = progressRef.current;
      progress.value = progressValue;
      setCirclePosition((progressValue / audioDuration) * progress.offsetWidth);
    }

    const page_ =
      currentNavigation === NavigationStateType.IN_NAVIGATION
        ? findPage(progressValue, pageInfo)
        : page;

    setCurrentXTick(page_);
    const timeRange = findTimeRange(page_, pageInfo, gridMode, toc, tocIndex);
    setpageStartTime(timeRange.start);
    setpageEndTime(timeRange.end);
  }, [
    progressValue,
    audioDuration,
    gridMode,
    toc,
    tocIndex,
    currentNavigation,
  ]);

  useEffect(() => {
    if (divRef.current === null) {
      return;
    }
    const div = divRef.current;

    const getOffsetX = (event: MouseEvent | TouchEvent) => {
      return event instanceof MouseEvent
        ? event.offsetX
        : event.targetTouches[0].clientX - div.parentElement!.offsetLeft;
    };

    const getAudioValue = (offsetX: number) => {
      const temp = (offsetX / div.offsetWidth) * audioDuration;
      return calibratePrecision(temp);
    };

    const handleMouseDown = (event: MouseEvent | TouchEvent) => {
      event.preventDefault();
      const offsetX = getOffsetX(event);
      const audioValue = getAudioValue(offsetX);
      console.log("touchstart", audioValue);

      setProgressValue(audioValue);
      setCurrentNavigation(NavigationStateType.IN_NAVIGATION);
    };

    const handleMouseMove = (event: MouseEvent | TouchEvent) => {
      if (currentNavigation !== NavigationStateType.IN_NAVIGATION) {
        return;
      }

      const offsetX = getOffsetX(event);
      const audioValue = getAudioValue(offsetX);
      setProgressValue(audioValue);
    };

    const handleMouseUp = (event: MouseEvent | TouchEvent) => {
      event.preventDefault();
      if (currentNavigation !== NavigationStateType.IN_NAVIGATION) {
        return;
      }

      console.log("touchend", progressValue);
      setCurrentNavigation(NavigationStateType.NAVIGATION_COMPLETE);
    };

    div.addEventListener("touchstart", handleMouseDown);
    div.addEventListener("touchmove", handleMouseMove);
    div.addEventListener("touchend", handleMouseUp);

    div.addEventListener("mousedown", handleMouseDown);
    div.addEventListener("mousemove", handleMouseMove);
    div.addEventListener("mouseup", handleMouseUp);

    window.onmouseup = () => {
      setCurrentNavigation(NavigationStateType.NONE);
    };

    return () => {
      div.removeEventListener("touchstart", handleMouseDown);
      div.removeEventListener("touchmove", handleMouseMove);
      div.removeEventListener("touchend", handleMouseUp);

      div.removeEventListener("mousedown", handleMouseDown);
      div.removeEventListener("mousemove", handleMouseMove);
      div.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    currentNavigation,
    audioDuration,
    gridMode,
    toc,
    tocIndex,
    pageInfo,
    pages,
    page,
  ]);

  return (
    <div className="w-full h-full flex flex-col items-center">
      <ResponsiveContainer width="100%" height="40%">
        <LineChart data={processedData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="begin"
            ticks={ticks_}
            type="number"
            domain={[minX, maxX]}
            interval={0}
            height={15}
            hide
          />
          <YAxis hide domain={[minYpos, maxYpos]} />
          <Legend verticalAlign="top" content={<CustomLegend />} />
          <Line
            type="monotone"
            dataKey="positive_score"
            stroke="#8884d8"
            dot={<CustomDot threshold={per90YPos} />}
            isAnimationActive={false}
          />
          <Customized
            component={
              <CustomRectangle
                pageStartTime={calculateScalingFactor(pageStartTime)}
                pageEndTime={calculateScalingFactor(pageEndTime)}
                y={22}
                y2={graphHeight * 0.4}
              />
            }
          />
          <Customized
            component={
              <CurrentPositionLine
                x={circlePosition + 5}
                y1={22}
                y2={graphHeight * 0.4}
              />
            }
          />
          {missedAndImportantParts?.missed.map((part: any, index: number) => {
            return (
              <Customized
                key={`missed-${index}`} // Add a unique key prop
                component={
                  <HorizontalLine
                    key={`missed-${index}`} // Add a unique key prop
                    x1={calculateScalingFactor(part[0])}
                    x2={calculateScalingFactor(part[1])}
                    color={"red"}
                    y={graphHeight * 0.4 - 2}
                  />
                }
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
      <ResponsiveContainer width="100%" height="40%">
        <LineChart data={processedData}>
          <CartesianGrid strokeDasharray="3 3" />
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
                pageInfo={pageInfo}
                images={images}
              />
            )}
            tickLine={false}
            domain={[minX, maxX]}
            interval={0}
            height={17}
          />
          <YAxis hide domain={[minYneg, maxYneg]} />
          <Line
            type="monotone"
            dataKey="negative_score"
            stroke="#82ca9d"
            dot={<CustomDot threshold={per90YNeg} />}
            isAnimationActive={false}
          />
          <Customized
            component={
              <CustomRectangle
                pageStartTime={calculateScalingFactor(pageStartTime)}
                pageEndTime={calculateScalingFactor(pageEndTime)}
                y={0}
                y2={graphHeight * 0.4 - 31}
              />
            }
          />
          <Customized
            component={
              <CurrentPositionLine
                x={circlePosition + 5}
                y1={0}
                y2={graphHeight * 0.4 - 31}
              />
            }
          />
          {missedAndImportantParts?.missed.map((part: any, index: number) => {
            return (
              <Customized
                key={`missed-${index}`} // Add a unique key prop
                component={
                  <HorizontalLine
                    key={`missed-${index}`} // Add a unique key prop
                    x1={calculateScalingFactor(part[0])}
                    x2={calculateScalingFactor(part[1])}
                    color={"red"}
                    y={2}
                  />
                }
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>

      <div className="relative w-[calc(100%-10px)] h-4">
        <progress className="absolute w-full h-4" ref={progressRef} />
        <div
          style={{ left: `calc(${circlePosition}px - 0.5rem` }}
          className={`absolute rounded-full h-4 w-4 pointer-events-none bg-[#82ca9d]`}
          draggable={false}
        />
      </div>
      <div
        className={`absolute inset-x-[5px] w-[calc(100%-10px)] h-full`}
        ref={divRef}
      ></div>
      <CustomToggleSwitch
        positiveEmotion={positiveEmotion}
        negativeEmotion={negativeEmotion}
        selectedPositives={selectedPositives}
        selectedNegatives={selectedNegatives}
        handlePositiveToggle={handlePositiveToggle}
        handleNegativeToggle={handleNegativeToggle}
      />
    </div>
  );
};

export default ArousalGraph;
