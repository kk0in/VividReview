"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import { currentTimeState } from "@/app/recoil/currentTimeState";
import { videoRefState } from "@/app/recoil/videoRefState";
import { csvDataState } from "@/app/recoil/DataState";
import isEqual from 'lodash/isEqual';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck } from "@fortawesome/free-solid-svg-icons";

// render the modapts table
const ModaptsTable = ({ setCurrentModapts }) => {
  const [csvData, setCSVData] = useRecoilState(csvDataState);
  const [currentTime, setCurrentTime] = useRecoilState(currentTimeState);
  const [highlightedRow, setHighlightedRow] = useState(-1);
  const rowRef = useRef<HTMLTableRowElement | null>(null);
  const headerRef = useRef<HTMLTableSectionElement | null>(null);
  const tableContainerRef = useRef<HTMLDivElement | null>(null);
  const [editedCell, setEditedCell] = useState<Object | null>(null);
  const videoElement = useRecoilValue(videoRefState);
  const [sums, setSums] = useState({ ctSum: 0, stSum: 0 });
  const inputRef = useRef<HTMLInputElement | null>(null); 
  const [labelEditMode, setLabelEditMode] = useState(false);

  useEffect(() => {
    // iterate through each csvdata, and check if current time is between start and end time
    if (csvData.length > 0) {
      csvData.forEach((row: any, index: number) => {
        const startTime = timeToSeconds(row["In"]);
        const endTime = timeToSeconds(row["Out"]);
        const current = currentTime;
        if (current >= startTime && current <= endTime) {
          setHighlightedRow(index);
          return;
        }
      });
    }
  }, [currentTime, csvData]);

  useEffect(() => {
    // update csvData to include duration in miliseconds and ST
    const updatedData = csvData.map((row: Object, rowIndex: number) => ({
      No: rowIndex+1,
      Modapts: row["Modapts"],
      In: row["In"],
      Out: row["Out"],
      Duration: row["Duration"],
      Topk: row["Topk"],
      "C/T": Number(timeToSeconds(row["Duration"]).toFixed(2)),
      "S/T": Number((convertLastCharToNumber(row["Modapts"]) * 0.129 * 1.05).toFixed(2))
    }));
    if (!isEqual(csvData, updatedData)) {
      setCSVData(updatedData);
    }
    console.log(updatedData);
    updateTotalTime();
  }, [csvData]);

  // useEffect(() => {
  //   updateTotalTime();
  // }, [csvData]);

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

  // update total time in the footer
  function updateTotalTime() {
    const ctSum = csvData.reduce((sum, item) => sum + item["C/T"], 0);
    const stSum = csvData.reduce((sum, item) => sum + item["S/T"], 0);
    setSums({ ctSum, stSum });
  }

  // convert time string to seconds
  function timeToSeconds(timeString: string): number {
    // time string format hh:mm:ss.frame
    // fps = 60
    // console.log(timeString)
    if (timeString) {
      const timeArray = timeString.split(":");
      // const hour = parseInt(timeArray[0]);
      const minute = parseInt(timeArray[0]);
      const second = parseInt(timeArray[1]);
      const frame = parseInt(timeArray[2]);

      const seconds = minute * 60 + second + frame / 60;

      return seconds;
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
  
  // when click on a row, move to the time of the row['start']
  const handleRowClick = (rowIndex: number) => {
    // move to the time of the row['start']
    console.log(rowIndex);
    const row = csvData[rowIndex];
    const startTime = timeToSeconds(row["In"]);
    if (videoElement) {
      videoElement.currentTime = startTime;
      setCurrentTime(startTime);
    }
  };

  // when click on a modapts cell, edit the label
  const handleCellClick = (rowIndex: number, key: string) => {
    if (key !== "Modapts") return;
    setEditedCell({ rowIndex, key });
  };

  const handleCellHover = (rowIndex: number, key: string) => {
    // setHighlightedRow(rowIndex);
    // console.log(rowIndex, key)
  }

  const cancelLabelEdit = () => {
    setEditedCell(null);
  }

  // on completing label edit, update the csvData
  const handleLabelEdit = (rowIndex: number, key: string) => {
    console.log(`rowIndex: ${rowIndex}, key: ${key}, value: ${inputRef.current.value}`) 
    setEditedCell(null);
    if (inputRef.current == null || inputRef.current.value === "") return;
    const newData = csvData.map((item, index) =>
      index === rowIndex ? { ...item, [key]: inputRef.current.value } : item
    );
    setCSVData(newData);
  }

  return (
    <>
      <div className="w-full h-[90%] mt-5 overflow-y-scroll" ref={tableContainerRef}>
        <table className="w-full table-auto h-full">
          <thead className="sticky top-0 bg-slate-700" ref={headerRef}>
            <tr>
              {/* read object keys to generate header */}
              {csvData[0] &&
                Object.keys(csvData[0]).map((key, index) => {
                  if (key === "Topk") return;
                  return (
                    <th
                      key={key}
                      className="border-slate-600 font-medium px-2 py-2 text-slate-100 text-left"
                    >
                      {key}
                    </th>
                  );
                })}
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
                {Object.entries(row).map(([key, value], cellIndex) => {
                  if (key === "Topk") return;
                  return (
                    <td
                      key={cellIndex}
                      className={`border-b border-slate-700 px-2 py-[0.4rem] font-mono ${
                        rowIndex === highlightedRow
                          ? "text-slate-800"
                          : "text-slate-200"
                      }`}
                      onMouseOver={() => handleCellHover(rowIndex, key)}
                      onClick={() => handleCellClick(rowIndex, key)}
                    >
                      { editedCell &&
                        editedCell.rowIndex === rowIndex &&
                        editedCell.key === key ? (
                          <div 
                            style={{ display: 'flex', alignItems: 'center' }}
                              onBlur={(event) => {
                                setTimeout(() => {
                                  setEditedCell(null);
                                }, 150); // delay to allow button click
                              }}
                          >
                            <input
                              ref={inputRef}
                              size={2}
                              type="text"
                              style={{ 
                                color: 'black',
                                height: '1.5em', 
                                paddingLeft: '5px',
                                paddingRight: '5px',
                              }}
                              placeholder={row[key]}
                              autoFocus
                            />
                            <button 
                              style={{ paddingLeft: '10px' }}
                              onClick={() => {
                                handleLabelEdit(rowIndex, key);
                              }}
                            >
                              <FontAwesomeIcon icon={faCheck} size="s" />
                            </button>
                          </div>
                        ) : (
                          value
                    )}
                  </td>
                )})}
              </tr>
            ))}
          </tbody>
          <tfoot className="sticky bottom-0 bg-slate-700">
            <tr>
              {csvData[0] &&
                Object.keys(csvData[0]).map((key, index) => {
                  if (key === "S/T")
                    return (
                      <td
                        key={key}
                        className={`border-b border-slate-700 px-3 py-2 font-mono "text-slate-200"`}
                      >
                        {sums.stSum.toFixed(2)}
                      </td>
                    );
                  if (key === "C/T")
                    return (
                      <td
                        key={key}
                        className={`border-b border-slate-700 px-3 py-2 font-mono "text-slate-200"`}
                      >
                        {sums.ctSum.toFixed(2)}
                      </td>
                    );
                  if (key === "Topk") return;
                  else return ( <td key={key} ></td> )
                })}
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  )
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
