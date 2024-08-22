// ArousalGraph.tsx
import React, { useEffect, useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Customized,
  Rectangle,
} from "recharts";

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
  const timeToPagesMap = Object.keys(pageInfo).map((page: any) => ({
    start: parseFloat(pageInfo[page].start),
    end: parseFloat(pageInfo[page].end),
    page: parseInt(page, 10),
  }));
  return timeToPagesMap;
};

const processTableOfContents = (tableOfContents: any) => {
  const pageToTitleSubtitleMap: { [key: number]: { title: string; subtitle: string } } = {};

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

const CustomTooltip = ({
  payload,
  onPointClick,
}: {
  payload: any;
  onPointClick: any;
}) => {
  if (payload && payload[0]) {
    onPointClick(payload[0].payload);
  }

  return null; // Return a valid JSX element, such as a <div> or <span>.
};

const CustomRectangle = ({
  pageStart,
  pageEnd,
}: {
  pageStart: number;
  pageEnd: number;
}) => {
  console.log("rectangle", pageStart, pageEnd);
  return (
    <Rectangle
      x={pageStart}
      y={0}
      width={pageEnd - pageStart}
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
}: {
  x: number;
  y: number;
  payload: any;
  currentXTick: number;
  tableOfContentsMap: any;
  timeToPagesMap: any;
}) => {
  const titleSubtitle = tableOfContentsMap[currentXTick];
  const pageNumber = findPageNumber(timeToPagesMap, payload.value);

  if (titleSubtitle && pageNumber === currentXTick) {
    const { title, subtitle } = titleSubtitle;
    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={0}
          dy={16}
          textAnchor="middle"
          fill="#666"
        >
          {`${title} - ${subtitle}`}
        </text>
      </g>
    );
  }
  return null;
};

const ArousalGraph = ({
  data,
  onPointClick,
  positiveEmotion,
  negativeEmotion,
  page,
  pageInfo,
  tableOfContents,
  graphWidth
}: {
  data: any;
  onPointClick: any;
  positiveEmotion: string[];
  negativeEmotion: string[];
  page: number;
  pageInfo: any;
  tableOfContents: any;
  graphWidth: number;
}) => {
  const validData = Array.isArray(data) ? data : [];
  const processedData = processData(
    validData,
    positiveEmotion,
    negativeEmotion
  );
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

  const minX = Math.min(...processedData.map((data: any) => [data.begin, data.end]).flat());
  const maxX = Math.max(...processedData.map((data: any) => [data.begin, data.end]).flat());

  const [pageStart, setPageStart] = React.useState(0);
  const [pageEnd, setPageEnd] = React.useState(100);
  const [activeLabel, setActiveLabel] = useState(0);

  const [currentXTick, setCurrentXTick] = useState(0);

  const calculateScalingFactor = (data: any) => {
    return graphWidth * data / maxX;
  }

  useEffect(() => {
    const page = findPageNumber(timeToPagesMap, activeLabel);
    if (page) {
      setCurrentXTick(page);
    }
  }, [activeLabel]);

  const handleMouseMove = (e: any) => {
    if (e && e.activeLabel) {
      setActiveLabel(e.activeLabel);
    }
  };

  const handleMouseLeave = () => {
    setActiveLabel(0);
  };

  useEffect(() => {
    if (pageInfo && pageInfo[page]) {
      const { start, end } = pageInfo[page];
      setPageStart(start);
      setPageEnd(end);
    }
  }, [page]);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart
        data={processedData}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
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
              />
          )}
          tickLine={false}
          domain={[minX, maxX]}
          interval={0}
          onMouseMove={handleMouseMove}
        />
        <YAxis hide domain={[minY, maxY]} />
        <Tooltip
          content={(props) => (
            <CustomTooltip {...props} onPointClick={onPointClick} />
          )}
          trigger="click"
        />
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
            <CustomRectangle pageStart={calculateScalingFactor(pageStart)} pageEnd={calculateScalingFactor(pageEnd)} />
          }
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
export default ArousalGraph;
