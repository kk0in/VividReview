"use client";
import React, { useState, useEffect } from "react";
import { useRecoilState } from "recoil";
import { currentTimeState } from "./currentTimeState";

const ModaptsTable = ({ csvData, setCurrentModapts }) => {
  const [currentTime, setCurrentTime] = useRecoilState(currentTimeState);
  const [highlightedRow, setHighlightedRow] = useState(-1);

  useEffect(() => {
    for (let i = 1; i < csvData.length; i++) {
      const row = csvData[i];
      const startTime = timeToMilliseconds(row[2]);
      const endTime = timeToMilliseconds(row[3]);
      const current = currentTime * 1000;
      console.log("row[2]", timeToMilliseconds(row[2]));
      if (current >= startTime && current <= endTime) {
        setHighlightedRow(i - 1);
        setCurrentModapts(row[1]);
        return;
      }
    }
  }, [currentTime, csvData]);

  function timeToMilliseconds(timeString: string): number {
    const [minute, second, millisecond] = timeString.split(":").map(Number);
    return minute * 60 * 1000 + second * 1000 + millisecond;
  }

  return (
    <>
      <div className="w-auto max-h-80 overflow-y-scroll bg-orange">
        <table>
          <thead>
            <tr>
              <th className="px-2 py-2 border text-xs font-semibold font-mono">
                No
              </th>
              <th className="px-2 py-2 border text-xs font-semibold font-mono">
                Modapts
              </th>
              <th class="px-2 py-2 border text-xs font-semibold font-mono">
                From
              </th>
              <th className="px-2 py-2 border text-xs font-semibold font-mono">
                To
              </th>
              <th className="px-2 py-2 border text-xs font-semibold font-mono">
                Start
              </th>
              <th className="px-2 py-2 border text-xs font-semibold font-mono">
                End
              </th>
            </tr>
          </thead>
          <tbody>
            {csvData.slice(1).map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={rowIndex === highlightedRow ? "bg-yellow-200" : ""}
              >
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className="px-1 py-1 border text-xs font-mono"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default ModaptsTable;
