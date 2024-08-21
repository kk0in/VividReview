// ArousalGraph.tsx
import React, { useEffect } from "react";
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

const processData = (data, positiveEmotion, negativeEmotion) => {
  return data.map((d) => {
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
      positive_score: positiveSum,
      negative_score: negativeSum,
    };
  });
};

const CustomTooltip = ({ active, payload, label, onPointClick }) => {
  onPointClick(payload[0]?.payload);
};

const CustomizedRectangle = ({ pageStart, pageEnd }) => {
  console.log("props", pageStart, pageEnd);

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

const ArousalGraph = ({
  data,
  onPointClick,
  positiveEmotion,
  negativeEmotion,
  page,
  pageInfo,
}) => {
  const validData = Array.isArray(data) ? data : [];
  const [pageStart, setPageStart] = React.useState(0);
  const [pageEnd, setPageEnd] = React.useState(100);

  const processedData = processData(
    validData,
    positiveEmotion,
    negativeEmotion
  );
  const yValues = processedData.flatMap((data) => [
    data.positive_score,
    data.negative_score,
  ]);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);

  useEffect(() => {
    if (pageInfo && pageInfo[page]) {
      const { start, end } = pageInfo[page];
      setPageStart(start);
      setPageEnd(end);
    }
  }, [page]);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={processedData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="begin" hide />
        <YAxis hide domain={[minY, maxY]} />
        <Tooltip
          content={<CustomTooltip onPointClick={onPointClick} />}
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
            <CustomizedRectangle pageStart={pageStart} pageEnd={pageEnd} />
          }
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default ArousalGraph;
