import React, { useEffect, useState, useMemo } from "react";
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
  Tooltip,
} from "recharts";
import { gridModeState } from "@/app/recoil/ToolState";

const processData = (
  data: any,
  positiveEmotion: string[],
  negativeEmotion: string[]
) => {
  return data.map((d: any) => {
    const begin = parseFloat(d.begin);
    const end = parseFloat(d.end);
    const positiveSum = positiveEmotion.reduce((acc, cur) => {
      const value = d[cur];
      return acc + (isNaN(value) ? 0 : value);
    }, 0);

    const negativeSum = negativeEmotion.reduce((acc, cur) => {
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
      height={200} // Use 100 to fill the entire height
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
}: {
  x: number;
  y: number;
  payload: any;
  currentXTick: number;
  tableOfContentsMap: any;
  graphWidth: number;
  findPage: any;
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

const VerticalLine = ({ x }: { x: number }) => (
  <line
    x1={x}
    y1={0}
    x2={x}
    y2={180}
    stroke="#008014"
    strokeWidth={3} // Reduced thickness
    opacity={0.5} // Added opacity for transparency
  />
);

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
}) => {
  const validData = Array.isArray(data) ? data : [];
  const gridMode = useRecoilValue(gridModeState);

  const processedData = processData(
    validData,
    positiveEmotion,
    negativeEmotion
  );
  const ticks_ = useMemo(
    () => processPageInfo(pageInfo).map((page: any) => page.start),
    [pageInfo]
  );
  const tableOfContentsMap = useMemo(
    () => processTableOfContents(tableOfContents),
    [tableOfContents]
  );
  const yValues = processedData.flatMap((data: any) => [
    data.positive_score,
    data.negative_score,
  ]);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);

  const minX = Math.min(
    ...processedData.map((data: any) => [data.begin, data.end]).flat()
  );
  const maxX = Math.max(
    ...processedData.map((data: any) => [data.begin, data.end]).flat()
  );

  const [pageStartTime, setpageStartTime] = useState(0);
  const [pageEndTime, setpageEndTime] = useState(100);
  const [currentXTick, setCurrentXTick] = useState(0);
  const [isMouseDown, setIsMouseDown] = useState(false);

  const calculateScalingFactor = (data: any) => {
    return (graphWidth * data) / maxX;
  };

  useEffect(() => {
    const page = findPage(hoverState.activeLabel);
    if (page) {
      setCurrentXTick(page);
    }
  }, [hoverState.activeLabel]);

  const handleMouseDown = (e: any) => {
    handleAudioRef(e.activePayload[0].payload);
    setHoverState({
      hoverPosition: e.chartX,
      hoverTime: e.activePayload[0].payload.begin,
      activeLabel: e.activeLabel,
    });
    setIsMouseDown(true);
  };

  const handleMouseMove = (e: any) => {
    if (e && e.activeLabel && isMouseDown) {
      setHoverState({
        hoverPosition: e.chartX,
        hoverTime: e.activePayload[0].payload.begin,
        activeLabel: e.activeLabel,
      });
      handleAudioRef(e.activePayload[0].payload);
    }
  };

  const handleMouseUp = (e: any) => {
    if (isMouseDown) {
      const timeValue = e.activePayload[0].payload.begin;
      const newPage = findPage(timeValue);
      const newTocIndex = findTocIndex(newPage);
      newTocIndex && newTocIndex !== tocIndex && setTocIndex(newTocIndex);
      newPage > 0 && setPage(newPage);

      handleAudioRef(e.activePayload[0].payload);
      setIsMouseDown(false);
    }
  };
  useEffect(() => {
    const { start, end } = calculateStartAndEnd(
      page,
      gridMode,
      pageInfo,
      pages
    );
    setpageStartTime(start);
    setpageEndTime(end);
  }, [pages, page, gridMode]);

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
  }, [hoverState.hoverTime]);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart
        data={processedData}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      >
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
              findPage={findPage}
            />
          )}
          tickLine={false}
          domain={[minX, maxX]}
          interval={0}
          height={15}
        />
        <YAxis hide domain={[minY, maxY]} />
        <Line
          type="monotone"
          dataKey="positive_score"
          stroke="#8884d8"
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="negative_score"
          stroke="#82ca9d"
          dot={false}
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
            component={<VerticalLine x={hoverState.hoverPosition} />}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
};

export default ArousalGraph;
