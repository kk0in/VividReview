"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRecoilState } from "recoil";
import { currentTimeState } from "../app/recoil/currentTimeState";

const ModaptsTable = ({ csvData, setCurrentModapts }) => {
  const [currentTime, setCurrentTime] = useRecoilState(currentTimeState);
  const [highlightedRow, setHighlightedRow] = useState(-1);
  const rowRef = useRef<HTMLTableRowElement | null>(null);
  const headerRef = useRef<HTMLTableSectionElement | null>(null); 
  const tableContainerRef = useRef<HTMLDivElement | null>(null);


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

  useEffect(() => {
    if (rowRef.current && headerRef.current && tableContainerRef.current) {
      const headerHeight = headerRef.current.offsetHeight;
      const rowHeight = rowRef.current.offsetHeight;
      const rowTop = rowRef.current.offsetTop;
      const viewportHeight = tableContainerRef.current.offsetHeight;
      const scrollPosition = rowTop - headerHeight - (viewportHeight - headerHeight - rowHeight) / 2;
      tableContainerRef.current.scrollTo({ top: scrollPosition, behavior: 'smooth' }
      );
    }
  }, [highlightedRow]);

  function timeToMilliseconds(timeString: string): number {
    const [minute, second, millisecond] = timeString.split(":").map(Number);
    return minute * 60 * 1000 + second * 1000 + millisecond;
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === ' ') {
        event.preventDefault();
      }
    }; 

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);


  return (
    <>
      <div className="w-full max-h-80 overflow-y-scroll" ref={tableContainerRef}>
        <table className="w-[80%] table-auto">
          <thead className="sticky top-0 bg-slate-700" ref={headerRef}>
            <tr>
              <th className="border-slate-600 font-medium py-3 px-4 text-slate-100 text-left">
                No
              </th>
              <th className="border-slate-600 font-medium py-3 px-4 text-slate-100 text-left">
                Modapts
              </th>
              <th className="border-slate-600 font-medium py-3 px-4 text-slate-100 text-left">
                From
              </th>
              <th className="border-slate-600 font-medium py-3 px-4 text-slate-100 text-left">
                To
              </th>
              <th className="border-slate-600 font-medium py-3 px-4 text-slate-100 text-left">
                Start
              </th>
              <th className="border-slate-600 font-medium py-3 px-4 text-slate-100 text-left">
                End
              </th>
            </tr>
          </thead>
          <tbody>
            {csvData.slice(1).map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={rowIndex === highlightedRow ? "bg-yellow-200" : "bg-slate-800"}
                ref={rowIndex === highlightedRow ? rowRef : null}
              >
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex} 
                    className={`border-b border-slate-700 p-[0.5] pl-6 font-mono ${rowIndex === highlightedRow ? "text-slate-800" : "text-slate-200"}`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>

          </tfoot>
        </table>
      </div>
    </>
  );
};

export default ModaptsTable;
