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

const GRAPH_HEIGHT = 150;
const X_AXIS_HEIGHT = 20;

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

  const [pageStartTime, setpageStartTime] = useState(0);
  const [pageEndTime, setpageEndTime] = useState(100);
  const [currentXTick, setCurrentXTick] = useState(0);
  const [isMouseDown, setIsMouseDown] = useState(false);

  const divRef = React.useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!hoverState.hoverPosition && hoverState.hoverTime) {
      const time_ = hoverState.hoverTime;
      const hoverState_ = {
        hoverPosition: calculateScalingFactor(time_),
        hoverTime: time_,
        activeLabel: time_,
      };
      setHoverState(hoverState_);
    }
  }, [hoverState]);

  useEffect(() => {
    if (divRef.current === null) {
      return;
    }
    const div = divRef.current;

    const getOffsetX = (event: MouseEvent | TouchEvent) => {
      return event instanceof MouseEvent
        ? event.offsetX
        : event.targetTouches[0].clientX - div.offsetLeft;
    };

    const handleMouseDown = (event: MouseEvent | TouchEvent) => {
      event.preventDefault();
      const offsetX = getOffsetX(event);
      console.log("touchstart", offsetX);
      const audioValue = (offsetX / div.offsetWidth) * maxX;

      handleAudioRef(audioValue);
      setHoverState({
        hoverPosition: offsetX,
        hoverTime: audioValue,
        activeLabel: audioValue,
      });
      setIsMouseDown(true);
    };

    const handleMouseMove = (event: MouseEvent | TouchEvent) => {
      if (!isMouseDown) {
        return;
      }

      const offsetX = getOffsetX(event);
      const audioValue = (offsetX / div.offsetWidth) * maxX;

      handleAudioRef(audioValue);
      setHoverState({
        hoverPosition: offsetX,
        hoverTime: audioValue,
        activeLabel: audioValue,
      });
    };

    const handleMouseUp = (event: MouseEvent | TouchEvent) => {
      event.preventDefault();
      if (!isMouseDown) {
        return;
      }

      const offsetX = hoverState.hoverPosition;
      console.log("touchend", offsetX);
      const audioValue = (offsetX / div.offsetWidth) * maxX;
      const newPage = findPage(audioValue);
      const newTocIndex = findTocIndex(newPage);
      newTocIndex && newTocIndex !== tocIndex && setTocIndex(newTocIndex);
      newPage > 0 && setPage(newPage);

      calculateStartAndEnd(newPage, gridMode, pageInfo, pages).then(
        ({ start, end }) => {
          setpageStartTime(start);
          setpageEndTime(end);
        }
      );
      setIsMouseDown(false);
    };

    div.addEventListener("touchstart", handleMouseDown);
    div.addEventListener("touchmove", handleMouseMove);
    div.addEventListener("touchend", handleMouseUp);

    div.addEventListener("mousedown", handleMouseDown);
    div.addEventListener("mousemove", handleMouseMove);
    div.addEventListener("mouseup", handleMouseUp);

    window.onmouseup = () => {
      setIsMouseDown(false);
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
    isMouseDown,
    findPage,
    findTocIndex,
    tocIndex,
    setTocIndex,
    setPage,
    handleAudioRef,
    gridMode,
    pageInfo,
    pages,
  ]);

  // useEffect(() => {
  //   if (!isMouseDown) {
  //     // handle page change when not dragging
  //     calculateStartAndEnd(page, gridMode, pageInfo, pages).then(
  //       ({ start, end }) => {
  //         setpageStartTime(start);
  //         setpageEndTime(end);

  //         const hoverState_ = {
  //           hoverPosition: calculateScalingFactor(start),
  //           hoverTime: start,
  //           activeLabel: start,
  //         };
  //         setHoverState(hoverState_);
  //       }
  //     );
  //   }
  // }, [pages, page, gridMode]);

  useEffect(() => {
    const page_ = findPage(hoverState.hoverTime || 0);
    calculateStartAndEnd(page_, gridMode, pageInfo, pages).then(
      ({ start, end }) => {
        setpageStartTime(start);
        setpageEndTime(end);
      }
    );
  }, [hoverState.hoverTime, gridMode]);

  return (
    <div className="relative w-full" ref={divRef}>
      <ResponsiveContainer width="100%" height={GRAPH_HEIGHT}>
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
                y={20}
                x_axis={0}
              />
            }
          />
          {hoverState.hoverPosition !== null && (
            <Customized
              component={
                <CurrentPositionLine
                  x={hoverState.hoverPosition}
                  y={20}
                  x_axis={0}
                />
              }
            />
          )}
          <Legend verticalAlign="top" content={<CustomLegend />} />
        </LineChart>
      </ResponsiveContainer>
      <ResponsiveContainer
        width="100%"
        height={GRAPH_HEIGHT}
        style={{ borderTopWidth: 1, borderTopColor: "#bbb" }}
      >
        <LineChart data={processedData}>
          <CartesianGrid strokeDasharray="3 3" />
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
                x_axis={70}
              />
            }
          />
          {hoverState.hoverPosition !== null && (
            <Customized
              component={
                <CurrentPositionLine
                  x={hoverState.hoverPosition}
                  y={0}
                  x_axis={70}
                />
              }
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
                    y={131}
                  />
                }
              />
            );
          })}
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
    </div>
  );
};

export default ArousalGraph;
