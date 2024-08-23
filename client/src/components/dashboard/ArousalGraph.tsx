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

const processData = (data: any, positiveEmotion: string[], negativeEmotion: string[]) => {
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
  const timeToPagesMap = Object.keys(pageInfo).map((page: any) => ({
    start: parseFloat(pageInfo[page].start),
    end: parseFloat(pageInfo[page].end),
    page: parseInt(page, 10),
  }));
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

const findPageNumber = (ranges: any[], value: number) => {
  const range = ranges.find(
    (range: any) => range.start <= value && range.end > value
  );
  return range ? range.page : null;
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

const CustomXAxisTick = ({
  x,
  y,
  payload,
  currentXTick,
  tableOfContentsMap,
  timeToPagesMap,
  graphWidth,
}: {
  x: number;
  y: number;
  payload: any;
  currentXTick: number;
  tableOfContentsMap: any;
  timeToPagesMap: any;
  graphWidth: number;
}) => {
  const titleSubtitle = tableOfContentsMap[currentXTick];
  const pageNumber = findPageNumber(timeToPagesMap, payload.value);

  if (titleSubtitle && pageNumber === currentXTick) {
    const { subtitle } = titleSubtitle;
    const text = `${subtitle}`;

    const willTextOverflowRight = x + subtitle.length * 7 > graphWidth;
    let textAnchor = willTextOverflowRight ? "end" : "start";

    return (
      <g
        transform={`translate(${x},${y})`}
      >
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

const VerticalLine = ({
  x,
}: {
  x: number;
}) => (
    <line
      x1={x}
      y1={0}
      x2={x}
      y2={180}
      stroke="#008014"
      strokeWidth={3}  // Reduced thickness
      opacity={0.5}    // Added opacity for transparency
    />
);


const ArousalGraph = ({
  data,
  onPointClick,
  positiveEmotion,
  negativeEmotion,
  page,
  pages,
  pageInfo,
  tableOfContents,
  graphWidth,
  findPage,
  findTocIndex,
  tocIndex,
  setTocIndex,
  setPage,
}: {
  data: any;
  onPointClick: any;
  positiveEmotion: string[];
  negativeEmotion: string[];
  page: number;
  pages: number[];
  pageInfo: any;
  tableOfContents: any;
  graphWidth: number;
  findPage: any;
  findTocIndex: any;
  tocIndex: any;
  setTocIndex: any;
  setPage: any;
}) => {
  const validData = Array.isArray(data) ? data : [];
  const gridMode = useRecoilValue(gridModeState);

  const processedData = processData(validData, positiveEmotion, negativeEmotion);
  const timeToPagesMap = useMemo(() => processPageInfo(pageInfo), [pageInfo]);
  const tableOfContentsMap = useMemo(
    () => processTableOfContents(tableOfContents),
    [tableOfContents]
  );
  const ticks_ = timeToPagesMap.map((page: any) => page.start);
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
  const [activeLabel, setActiveLabel] = useState(0);

  const [currentXTick, setCurrentXTick] = useState(0);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);

  const calculateScalingFactor = (data: any) => {
    return (graphWidth * data) / maxX;
  };

  useEffect(() => {
    const page = findPageNumber(timeToPagesMap, activeLabel);
    if (page) {
      setCurrentXTick(page);
    }
  }, [activeLabel]);

  const handleMouseMove = (e: any) => {
    if (e && e.activeLabel && isMouseDown) {
      setActiveLabel(e.activeLabel);
      onPointClick(e.activePayload[0].payload);
      setHoverPosition(e.chartX);
    }
  };

  const handleMouseLeave = () => {
    if(isMouseDown) {
    setActiveLabel(0);
    setHoverPosition(null);
    }
  };

  const handleMouseDown = (e: any) => {
    console.log("Mouse down", e.activePayload[0].payload);
    onPointClick(e.activePayload[0].payload);
    setIsMouseDown(true);
  };

  const handleMouseUp = (e: any) => {
    if (isMouseDown) {
      const timeValue = e.activePayload[0].payload.begin;
      const newPage = findPage(timeValue);
      const newTocIndex = findTocIndex(newPage);
      newTocIndex && newTocIndex !== tocIndex && setTocIndex(newTocIndex);
      newPage > 0 && setPage(newPage);

      onPointClick(e.activePayload[0].payload);
      setIsMouseDown(false);
    }
  };

  useEffect(() => {
    let start: number = 0;
    let end: number = 0;
    switch (gridMode) {
      case 0:
        if (pageInfo && pageInfo[page]) {
          start = pageInfo[page].start;
          end = pageInfo[page].end;
        }
        break;
      default:
        if (
          pageInfo &&
          pageInfo[pages[0]] &&
          pageInfo[pages[pages.length - 1]]
        ) {
          start = pageInfo[pages[0]].start;
          end = pageInfo[pages[pages.length - 1]].end;
        }
        break;
    }
    setpageStartTime(start);
    setpageEndTime(end);
  }, [pages, page, gridMode]);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart
        data={processedData}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
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
              timeToPagesMap={timeToPagesMap}
              graphWidth={graphWidth}
              
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
        {hoverPosition !== null && (
          <Customized
            component={
              <VerticalLine
                x={hoverPosition}
              />
            }
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
};

export default ArousalGraph;
