"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import { currentTimeState } from "@/app/recoil/currentTimeState";
import { videoRefState } from "@/app/recoil/videoRefState";
import { csvDataState } from "@/app/recoil/DataState";

const ModaptsTable = ({ setCurrentModapts }) => {
  const [csvData, setCSVData] = useRecoilState(csvDataState);
  const [currentTime, setCurrentTime] = useRecoilState(currentTimeState);
  const [highlightedRow, setHighlightedRow] = useState(-1);
  const rowRef = useRef<HTMLTableRowElement | null>(null);
  const headerRef = useRef<HTMLTableSectionElement | null>(null);
  const tableContainerRef = useRef<HTMLDivElement | null>(null);
  const [editedCell, setEditedCell] = useState<Object | null>(null);
  const videoElement = useRecoilValue(videoRefState)
  const [sums, setSums] = useState({ ctSum: 0, stSum: 0 });


  useEffect(() => {
    // for (let i = 1; i < csvData.length; i++) {
    //   const row = csvData[i];
    //   const startTime = timeToMilliseconds(row[2]);
    //   const endTime = timeToMilliseconds(row[3]);
    //   const current = currentTime * 1000;
    //   console.log("row[2]", timeToMilliseconds(row[2]));
    //   if (current >= startTime && current <= endTime) {
    //     setHighlightedRow(i - 1);
    //     setCurrentModapts(row[1]);
    //     return;
    //   }

    // iterate through each csvdata, and check if current time is between start and end time
    if (csvData.length > 0) {
      csvData.forEach((row: any, index: number) => {
        const startTime = timeToMilliseconds(row["In"]);
        const endTime = timeToMilliseconds(row["Out"]);
        const current = currentTime * 1000;
        if (current >= startTime && current <= endTime) {
          setHighlightedRow(index);
          return;
        }
      });
    }
  }, [currentTime, csvData]);

  var ctSum = 0;
  var stSum = 0; 

  useEffect(() => {
    // update csvData to include duration in miliseconds and ST
    const updatedData = csvData.map((item) => ({
      Modapts: item["Modapts"],
      In: item["In"],
      Out: item["Out"],
      Duration: item["Duration"],
      "C/T": Number((timeToMilliseconds(item["Duration"]) / 1000).toFixed(2)),
      "S/T": Number((convertLastCharToNumber(item["Modapts"]) * 0.129 * 1.05).toFixed(2))
    }));
    setCSVData(updatedData);
    console.log(updatedData);
    updateTotalTime();
  }, []);

  useEffect(() => {
    updateTotalTime();
  }, [csvData]);

  useEffect(() => {
    if (rowRef.current && headerRef.current && tableContainerRef.current) {
      const headerHeight = headerRef.current.offsetHeight;
      const rowHeight = rowRef.current.offsetHeight;
      const rowTop = rowRef.current.offsetTop;
      const viewportHeight = tableContainerRef.current.offsetHeight;
      const scrollPosition =
        rowTop - headerHeight - (viewportHeight - headerHeight - rowHeight) / 2;
      tableContainerRef.current.scrollTo({
        top: scrollPosition,
        behavior: "smooth",
      });
    }
  }, [highlightedRow]);

  function updateTotalTime() {
    ctSum = csvData.reduce((sum, item) => sum + item["C/T"], 0);
    stSum = csvData.reduce((sum, item) => sum + item["S/T"], 0);
    setSums({ ctSum, stSum });
    console.log(`ctSum: ${ctSum}, stSum: ${stSum}`)
  }

  function timeToMilliseconds(timeString: string): number {
    // time string format hh:mm:ss.frame
    // fps = 60
    // console.log(timeString)
    if (timeString){
      const timeArray = timeString.split(":");
      // const hour = parseInt(timeArray[0]);
      const minute = parseInt(timeArray[0]);
      const second = parseInt(timeArray[1]);
      const frame = parseInt(timeArray[2]);
  
      const milliseconds =
        minute * 60 * 1000 +
        second * 1000 +
        (frame * 1000) / 60;
  
      return milliseconds;
    }
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === " ") {
        event.preventDefault();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleRowClick = (rowIndex: number) => {
    // move to the time of the row['start']
    console.log(rowIndex)
    const row = csvData[rowIndex];
    const startTime = timeToMilliseconds(row["In"]);
    if (videoElement){
      videoElement.currentTime = startTime / 1000;
      setCurrentTime(startTime);
    }
  }

  const handleCellClick = (rowIndex: number, key: string) => {
    setEditedCell({ rowIndex, key });
  };

  const handleCellHover = (rowIndex: number, key: string) => {
    // setHighlightedRow(rowIndex);
    console.log(rowIndex, key)
  }

  // const handleInputChange = (event: React.FocusEvent<HTMLInputElement, Element>, rowIndex: number, key: string) => {
  //   if (!event.target) return;
  //   const newData = [...csvData];
  //   newData[rowIndex][key] = event.target.value;
  //   setCSVData(newData);
  //   setEditedCell(null);
  // };

  return (
    <>
      <div className="w-full h-full overflow-y-scroll" ref={tableContainerRef}>
        <table className="w-[80%] table-auto h-full">
          <thead className="sticky top-0 bg-slate-700" ref={headerRef}>
            <tr>
              {/* read object keys to generate header */}
              {csvData[0] &&
                Object.keys(csvData[0]).map((key, index) => {
                  if (key === "Topk") return;
                  return (
                  <th
                    key={key}
                    className="border-slate-600 font-medium px-3 py-3 text-slate-100 text-left"
                  >
                    {key}
                  </th>
                )})}
            </tr>
          </thead>
          <tbody>
            {csvData.map((row: Object, rowIndex: number) => (
              <tr
                key={rowIndex}
                className={
                  rowIndex === highlightedRow ? "bg-yellow-200" : "bg-slate-800"
                }
                ref={rowIndex === highlightedRow ? rowRef : null}
                onClick={() => handleRowClick(rowIndex)}
              >
                {/* {console.log(Object.entries(row))} */}
                {Object.entries(row).map(([key, value], cellIndex) => {
                  if (key === "Topk") return;
                  return (
                  <td
                    key={cellIndex}
                    className={`border-b border-slate-700 px-3 py-2 font-mono ${
                      rowIndex === highlightedRow
                        ? "text-slate-800"
                        : "text-slate-200"
                    }`}
                    onMouseOver={() => handleCellHover(rowIndex, key)}
                    // onClick={() => handleCellClick(rowIndex, key)}
                  >
                    {/* {editedCell &&
                    editedCell.rowIndex === rowIndex &&
                    editedCell.key === key ? (
                      <input
                        type="text"
                        defaultValue={row[key]}
                        onBlur={(event) => handleInputChange(event, rowIndex, key)}
                      />
                    ) : (
                      value
                    )} */}
                    {value}
                  </td>
                )})}
                {/* {row.entries().map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className={`border-b border-slate-700 p-[0.5] pl-6 font-mono ${
                      rowIndex === highlightedRow
                        ? "text-slate-800"
                        : "text-slate-200"
                    }`}
                  >
                    {cell}
                  </td>
                ))} */}
              </tr>
            ))}
          </tbody>
          <tfoot className="sticky bottom-0 bg-slate-700" ref={headerRef}>
            <tr>
                {csvData[0] &&
                Object.keys(csvData[0]).map((key, index) => {
                  if (key === "S/T") return (
                    <td key={key} 
                      className={`border-b border-slate-700 px-3 py-2 font-mono "text-slate-200"`}>
                      {sums.stSum.toFixed(2)}
                    </td>
                  )
                  if (key === "C/T") return (
                    <td key={key} 
                      className={`border-b border-slate-700 px-3 py-2 font-mono "text-slate-200"`}>
                      {sums.ctSum.toFixed(2)}
                    </td>
                  )
                  if (key === "Topk") return;
                  else return ( <td></td> )
                })}
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
};


function convertLastCharToNumber(inputString: string): number {
  const lastNum = parseInt(inputString.slice(-1)); // Get the last character

  if (isNaN(lastNum)) {
    return 0;
  } else {
    return lastNum;
  }
}

export default ModaptsTable;
