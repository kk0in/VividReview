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
  CustomDot
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

        calculateStartAndEnd(newPage, gridMode, pageInfo, pages).then(
          ({ start, end }) => {
            setpageStartTime(start);
            setpageEndTime(end);
          }
        );
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
      gridMode,
      pageInfo,
      pages,
    ]
  );

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
    <>
      <ResponsiveContainer width="100%" height={GRAPH_HEIGHT}>
        <LineChart
          data={processedData}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis hide domain={[minX, maxX]} />
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
        <LineChart
          data={processedData}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
        >
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
    </>
  );
};

export default ArousalGraph;
