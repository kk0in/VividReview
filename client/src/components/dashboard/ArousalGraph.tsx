// ArousalGraph.tsx
import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
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
    onPointClick(payload[0].payload);
};

const ArousalGraph = ({
  data,
  onPointClick,
  positiveEmotion,
  negativeEmotion,
}) => {
  const validData = Array.isArray(data) ? data : [];

  const processedData = processData(
    validData,
    positiveEmotion,
    negativeEmotion
  );

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={processedData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="begin" hide />
        {/* <YAxis /> */}
        <Legend />
        <Tooltip content={<CustomTooltip onPointClick={onPointClick}/>} trigger="click"/>
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
        />{" "}
      </LineChart>
    </ResponsiveContainer>
  );
};

export default ArousalGraph;
