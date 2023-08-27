"use client";
import { useEffect, useState } from "react";
import { usePapaParse } from "react-papaparse";
import { Resizable } from "re-resizable";
import { useRecoilState, useRecoilValue } from "recoil";
import { currentTimeState } from "@/app/recoil/currentTimeState";
import { csvDataState } from "@/app/recoil/DataState";

export default function VideoTimeline() {
  const [csvData, setCSVData] = useRecoilState(csvDataState);
  const currentTime = useRecoilValue(currentTimeState);

  useEffect(() => {
    const element = document.querySelector(".highlighted");
    const container = document.getElementById("scrollableTimelineContainer");

    if (element && container) {
        const elementRect = element.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        console.log("Element Rect:", elementRect);
        console.log("Container Rect:", containerRect);

        const scrollLeftPosition = 
            elementRect.left - 
            containerRect.left + 
            container.scrollLeft - 
            (containerRect.width / 2) + 
            (elementRect.width / 2);  // Centers the highlighted section

        container.scrollLeft = scrollLeftPosition;
        container.scrollTo({
          left: scrollLeftPosition,
          behavior: 'smooth'
       });
    }
}, [currentTime]);



  function calculateLeftPosition(index: number) {
    return timeToMilliseconds(csvData[index]['start']) / 5;
  }

  const adjustTimeline = (index: number, newWidth: number) => {
    const newCsvData = JSON.parse(JSON.stringify(csvData));
    const oldDuration = timeToMilliseconds(newCsvData[index].duration);
    const oldWidth = oldDuration / 5;
    const deltaWidth = newWidth - oldWidth;
    const deltaDuration = deltaWidth * 5;

    if (deltaWidth < 0) {
        if (oldDuration+deltaDuration <= 60) { // less than half modapts (129ms)
          const blankSpace = newCsvData[index]
          blankSpace.label = "";
          newCsvData[index] = blankSpace
        }
        else {
          // Left resize logic, while moving the timeline to the left, all other timelines are moving together.. need to improve
          newCsvData[index].duration = MillisecondsTotime(oldDuration + deltaDuration);
          newCsvData[index].end = addTimes(newCsvData[index].start, newCsvData[index].duration);

          const blankSpace = {
            label: "",
            start: newCsvData[index].end,
            end: addTimes(newCsvData[index].end, MillisecondsTotime(-deltaDuration)),
            duration: MillisecondsTotime(-deltaDuration)
          };
          console.log("newCsvData[index]: ", newCsvData[index])
          console.log("blankSpace: ", blankSpace);
          newCsvData.splice(index + 1, 0, blankSpace);
        }

    } else {
        // Right resize logic, need to overlapp the next timeline to indicate how long the timeline is moving
        let remainingDuration = deltaDuration;

        for (let i = index + 1; i < newCsvData.length && remainingDuration > 0; i++) { // need to optimize?
            const nextDuration = timeToMilliseconds(newCsvData[i].duration);
            
            if (nextDuration <= remainingDuration) {
                remainingDuration -= nextDuration;
                newCsvData.splice(i, 1);
                i--;
            } else {
                newCsvData[i].start = addTimes(newCsvData[i].start, MillisecondsTotime(remainingDuration));
                newCsvData[i].duration = MillisecondsTotime(nextDuration - remainingDuration);
                newCsvData[i].end = addTimes(newCsvData[i].start, newCsvData[i].duration);
                remainingDuration = 0;
            }
        }
        newCsvData[index].duration = MillisecondsTotime(oldDuration + deltaDuration - remainingDuration);
        newCsvData[index].end = addTimes(newCsvData[index].start, newCsvData[index].duration);
    }

    setCSVData(newCsvData);
};

const isInCurrentTime = (start: string, end: string) => {
  const startTimeMillis = timeToMilliseconds(start);
  const endTimeMillis = timeToMilliseconds(end);
  const _currentTime = currentTime * 1000;
  console.log("currentTime: ", _currentTime, "startTimeMillis: ", startTimeMillis, "endTimeMillis: ", endTimeMillis)
  return _currentTime >= startTimeMillis && _currentTime <= endTimeMillis;
};

return (
<div className="w-full overflow-x-scroll overflow-y-hidden" id="scrollableTimelineContainer" style={{ height: "50px", position: 'relative' }}>
    <div className="flex">
      {csvData.map((row, rowIndex) => (
          <Resizable 
              key={`${rowIndex}-${row['label']}-${timeToMilliseconds(row['duration'])}`}
              defaultSize={{ width: timeToMilliseconds(row['duration']) / 5, height: 30 }}
              minWidth={0} 
              maxWidth={1000} 
              enable={{ top:false, right:true, bottom:false, left:false, topRight:false, bottomRight:false, bottomLeft:false, topLeft:false }}
              onResizeStart={(e, direction, ref) => {
                ref.style.zIndex = "10";
              }}
              onResizeStop={(e, direction, ref) => {
                adjustTimeline(rowIndex, ref.offsetWidth);
                ref.style.zIndex = "1";
              }}
              style={{ left: `${calculateLeftPosition(rowIndex)}px`, position: 'absolute' }}
          >
              <div 
                  className={`rounded py-2 px-1 border flex items-center justify-center ${!row['label'] ? '' : 'border-opacity-0'} ${isInCurrentTime(row['start'], row['end']) ? 'highlighted' : ''}`}
                  style={{ width: '100%', height: '100%', backgroundColor: colormap(row['label']) }}
              >
                {row["label"]}
              </div>
          </Resizable>
        
      ))}
    </div>
  </div>
);
}

const colormap = (label: string) => {
  let label_alphabet = label ? label[0] : "";
  switch (label_alphabet) {
    case "M":
      return "#4E79A7";
    case "G":
      return "#F28E2B";
    case "P":
      return "#E15759";
    case "R":
      return "#76B7B2";
    case "A":
      return "#59A14F";
    case "B": // BG
      return "#BAB0AC";
    default:  // Blank
      return "transparent";
  }
};

function addTimes(time1: string, time2: string): string {
  let ms1 = timeToMilliseconds(time1);
  let ms2 = timeToMilliseconds(time2);
  return MillisecondsTotime(ms1 + ms2);
}

function MillisecondsTotime(duration: number): string {
  let absoluteDuration = Math.abs(duration);

  const frames = Math.round((absoluteDuration % 1000) * 60 / 1000);
  const seconds = Math.floor((absoluteDuration / 1000) % 60);
  const minutes = Math.floor((absoluteDuration / (1000 * 60)) % 60);

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(frames).padStart(2, '0')}`;
}

function timeToMilliseconds(timeString: string): number {
  if (!timeString) return 0;
  const timeArray = timeString.split(":");
  const minute = parseInt(timeArray[0]);
  const second = parseInt(timeArray[1].split(".")[0]);
  const frame = parseInt(timeArray[1].split(".")[1]);
  //console.log(minute, second, frame)
  return minute * 60 * 1000 + second * 1000 + (frame * 1000) / 60;
}