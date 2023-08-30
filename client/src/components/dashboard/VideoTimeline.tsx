"use client";
import { useEffect, useState, Fragment, createRef, useRef } from "react";
import { Resizable } from "re-resizable";
import { useRecoilState, useRecoilValue } from "recoil";
import { currentTimeState } from "@/app/recoil/currentTimeState";
import { csvDataState } from "@/app/recoil/DataState";
import { Popover, Transition } from "@headlessui/react";
import { videoRefState } from "@/app/recoil/videoRefState";

export default function VideoTimeline() {
  const [csvData, setCSVData] = useRecoilState(csvDataState);
  const [currentTime, setCurrentTime] = useRecoilState(currentTimeState);
  const [openState, setOpenState] = useState(false);
  const [selectedCellIndex, setSelectedCellIndex] = useState<number | null>(
    null
  );
  const [scrollPosition, setScrollPosition] = useState<number | null>(null);
  const timecellRefs = useRef([]);
  const [totalWidth, setTotalWidth] = useState(0);
  const leftMarginRef = useRef<HTMLDivElement>();
  const [popoverLeft, setPopoverLeft] = useState(0);
  const resizingRef = useRef(false);
  const videoElement = useRecoilValue(videoRefState)
  const initialLeft = useRef(0);
  const initialWidth = useRef(0);
  const popoverRef = useRef();
  const mouseClickRef = useRef(false);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickPopoverOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickPopoverOutside);
    };
  }, []);

  const handleClickPopoverOutside = (event) => {
    if (popoverRef.current && !popoverRef.current.contains(event.target)) {
      event.preventDefault();
      event.stopPropagation();
      // console.log("You clicked outside of me!");
    }
  };

  useEffect(() => {
    timecellRefs.current = csvData.map(
      (_item, i) => timecellRefs.current[i] || createRef()
    );

    let width = 0;
    timecellRefs.current.forEach((ref, idx) => {
      if (ref.current) {
        width += ref.current.state.width;
        width += 10;
      }
    });

    // console.log(leftMarginRef.current.offsetWidth)
    width += leftMarginRef.current.offsetWidth;

    // console.log(timecellRefs.current)
    setTotalWidth(width);
    // console.log(width)

    const element = document.querySelector(".highlighted");
    const container = document.getElementById("scrollableTimelineContainer");

    if (element && container) {
      const indexMatch = element.className.match(/timeline-item-(\d+)/);
      if (indexMatch && indexMatch[1]) {
        const rowIndex = parseInt(indexMatch[1]);
        // Get time info from your csvData using rowIndex
        const row = csvData[rowIndex];
        if (row) {
          const startTime = timeToMilliseconds(row["In"]);
          const endTime = timeToMilliseconds(row["Out"]);
          const duration = endTime - startTime;

          // Find out where the currentTime falls within the highlighted Modapts
          const normalizedTime = (currentTime * 1000 - startTime) / duration;

          const elementRect = element.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();

          const scrollLeftPosition =
            elementRect.left -
            containerRect.left +
            container.scrollLeft -
            containerRect.width / 2 +
            elementRect.width * normalizedTime; // ratio of the current time to the duration of the highlighted modapts

          container.scrollLeft = scrollLeftPosition;
          container.scrollTo({
            left: scrollLeftPosition,
            behavior: "smooth",
          });
          // console.log("scrollLeftPosition: ", scrollLeftPosition);
          setScrollPosition(scrollLeftPosition);
        }
      }
    }
  }, [currentTime, csvData]);

  useEffect(() => {
    // console.log("selectedCellIndex:", selectedCellIndex);

    if (selectedCellIndex !== null) {
      // console.log(timecellRefs.current[selectedCellIndex])
      let left = 0;
      for (let i = 0; i < selectedCellIndex; i++) {
        if (timecellRefs.current[i].current) {
          left += timecellRefs.current[i].current.state.width;
          left += 10;
        }
      }
      left += timecellRefs.current[selectedCellIndex].current.state.width / 2;
      setPopoverLeft(left);
    }
  }, [selectedCellIndex]);
   
  function calculateLeftPosition(index: number) {
    const base = timeToMilliseconds(csvData[index]["In"]) / 5;
    const margin = index * 10; // 2px margin between each timeline
    return base + margin; //+ margin;
  }

  const adjustTimeline = (
    index: number,
    newWidth: number,
    direction: string
  ) => {
    
    const newCsvData = JSON.parse(JSON.stringify(csvData));
    const oldDuration = timeToMilliseconds(newCsvData[index].Duration);
    const oldWidth = oldDuration / 5;
    const deltaWidth = newWidth - oldWidth;
    const deltaDuration = deltaWidth * 5;

    if (direction == "left") {
      if (deltaWidth >= 0) {
        // when resizing to the left, it should overlap the previous timelines
        const _deltaDuration = deltaDuration;
        const _oldDuration = timeToMilliseconds(newCsvData[index].Duration);
        let remainingDuration = _deltaDuration;

        for (let i = index - 1; i >= 0 && remainingDuration > 0; i--) {
          const prevDuration = timeToMilliseconds(newCsvData[i].Duration);
          if (prevDuration <= remainingDuration) {
            remainingDuration -= prevDuration;
            newCsvData.splice(i, 1);
            index--;
          } else {
            newCsvData[i].Out = subtractTimes(
              newCsvData[i].Out,
              MillisecondsTotime(remainingDuration)
            );
            newCsvData[i].Duration = MillisecondsTotime(
              prevDuration - remainingDuration
            );
            newCsvData[i].In = subtractTimes(
              newCsvData[i].Out,
              newCsvData[i].Duration
            );
            remainingDuration = 0;
          }
        }
        newCsvData[index].Duration = MillisecondsTotime(
          _oldDuration + _deltaDuration - remainingDuration
        );
        newCsvData[index].In = subtractTimes(
          newCsvData[index].Out,
          newCsvData[index].Duration
        );
      } else {
        const _oldDuration = timeToMilliseconds(newCsvData[index].Duration);
        if (_oldDuration + deltaDuration <= 60) {
          // less than half modapts (129ms)
          const blankSpace = newCsvData[index];
          blankSpace.Modapts = "-";
          newCsvData[index] = blankSpace;
        } else {
          // Right reducing logic
          newCsvData[index].Duration = MillisecondsTotime(
            _oldDuration + deltaDuration
          );
          newCsvData[index].In = subtractTimes(
            newCsvData[index].Out,
            newCsvData[index].Duration
          );

          const blankSpace = {
            Modapts: "-",
            In: subtractTimes(
              newCsvData[index].In,
              MillisecondsTotime(deltaDuration)
            ),
            Out: newCsvData[index].In,
            Duration: MillisecondsTotime(deltaDuration),
          };
          newCsvData.splice(index, 0, blankSpace);
        }
      }
      if (
        index - 1 >= 0 &&
        newCsvData[index - 1].Out !== newCsvData[index].In
      ) {
        // adjust the previous timeline's out time to the current timeline's in time
        newCsvData[index - 1].Out = newCsvData[index].In;
        newCsvData[index - 1].Duration = subtractTimes(
          newCsvData[index - 1].Out,
          newCsvData[index - 1].In
        );
      }
    } else if (direction == "right") {
      if (deltaWidth >= 0) {
        // Right resize logic, need to overlapp the next timeline to indicate how long the timeline is moving
        let remainingDuration = deltaDuration;

        for (
          let i = index + 1;
          i < newCsvData.length && remainingDuration > 0;
          i++
        ) {
          // need to optimize?
          const nextDuration = timeToMilliseconds(newCsvData[i].Duration);

          if (nextDuration <= remainingDuration) {
            remainingDuration -= nextDuration;
            newCsvData.splice(i, 1);
            i--;
          } else {
            newCsvData[i].In = addTimes(
              newCsvData[i].In,
              MillisecondsTotime(remainingDuration)
            );
            newCsvData[i].Duration = MillisecondsTotime(
              nextDuration - remainingDuration
            );
            newCsvData[i].Out = addTimes(
              newCsvData[i].In,
              newCsvData[i].Duration
            );
            remainingDuration = 0;
          }
        }
        newCsvData[index].Duration = MillisecondsTotime(
          oldDuration + deltaDuration - remainingDuration
        );
        newCsvData[index].Out = addTimes(
          newCsvData[index].In,
          newCsvData[index].Duration
        );
      } else {
        if (oldDuration + deltaDuration <= 60) {
          // less than half modapts (129ms)
          const blankSpace = newCsvData[index];
          blankSpace.Modapts = "-";
          newCsvData[index] = blankSpace;
        } else {
          newCsvData[index].Duration = MillisecondsTotime(
            oldDuration + deltaDuration
          );
          newCsvData[index].Out = addTimes(
            newCsvData[index].In,
            newCsvData[index].Duration
          );

          const blankSpace = {
            Modapts: "-",
            In: newCsvData[index].Out,
            Out: addTimes(
              newCsvData[index].Out,
              MillisecondsTotime(-deltaDuration)
            ),
            Duration: MillisecondsTotime(-deltaDuration),
          };
          newCsvData.splice(index + 1, 0, blankSpace);
        }
      }
    }
    if (
      index + 1 < newCsvData.length &&
      newCsvData[index].Out !== newCsvData[index + 1].In
    ) {
      // adjust the next timeline's in time to the current timeline's out time
      newCsvData[index + 1].In = newCsvData[index].Out;
      newCsvData[index + 1].Duration = subtractTimes(
        newCsvData[index + 1].Out,
        newCsvData[index + 1].In
      );
    }
    // console.log("adjustTimeline after- newCsvData: ", newCsvData[index], "newCsvData[index].In-mili: ", timeToMilliseconds(newCsvData[index].In));
    setCSVData(newCsvData);
  };
  const isInCurrentTime = (start: string, end: string) => {
    const startTimeMillis = timeToMilliseconds(start);
    const endTimeMillis = timeToMilliseconds(end);
    const _currentTime = currentTime * 1000;

    return _currentTime >= startTimeMillis && _currentTime <= endTimeMillis;
  };
  
  const handleMouseMove = (e) => {
    const rect = e.target.getBoundingClientRect();
    const xPos = e.clientX - rect.left;
    const boundaryTolerance = 5; // distance in pixels near the edge
  
    if (mouseClickRef.current) {
      e.target.style.cursor = "col-resize";
    }
    else {
      if (xPos <= boundaryTolerance) {
        e.target.style.cursor = "w-resize"; // Cursor like "<|"
      } 
      else if (xPos >= rect.width - boundaryTolerance) {
        e.target.style.cursor = "e-resize"; // Cursor like "|>"
      }
      else {
        e.target.style.cursor = "grab";
      }
    }
  };

  const handleMouseDown = (e) => {
    mouseClickRef.current = true;
  };
  
  const handleMouseUp = (e) => {
    mouseClickRef.current = false;
  };

  return (
    <div className="relative w-full h-full pt-10">
      <div className="absolute z-50 mt-2 w-[0.2rem] h-24 left-[50%] right-[50%] bg-stone-300 border-slate-600 border-1"></div>
      {/* <div className="absolute left-[50%] top-32 transform -translate-x-[50%] font-mono">{secondsToTime(currentTime)}</div>       */}
    <div
      className="w-full relative overflow-x-scroll flex h-[10rem]"
      id="scrollableTimelineContainer"
    > 
      <div className="relative w-[50%]" ref={leftMarginRef}></div>
      <Popover className="flex-1 relative">
        {/* {({close}) => } */}
        <Popover.Button
          onKeyDown={(e) => {
            if (e.key === " ") {
              e.preventDefault();
            }
          }}
          onClick={() => {}}
          className="relative flex-1 w-full"
          onFocus={(e) => {
            e.preventDefault();
            e.stopPropagation();
            return;
          }}
          // ref={null}
        >
          {csvData.map((row, rowIndex) => (
            <div
              key={rowIndex}
              onClick={() => setSelectedCellIndex(rowIndex)}
                  className=""
                  onMouseMove={handleMouseMove} 
                  onMouseDown={handleMouseDown} 
                  onMouseUp={handleMouseUp}  
                >
                  <Resizable
                    key={`${rowIndex}-${row["Modapts"]}-${timeToMilliseconds(
                      row["Duration"]
                    )}`}
                    defaultSize={{
                      width: timeToMilliseconds(row["Duration"]) / 5,
                      height: 70,
                    }}
                    enable={{
                      top: false,
                      right: true,
                      bottom: false,
                      left: true,
                      topRight: false,
                      bottomRight: false,
                      bottomLeft: false,
                      topLeft: false,
                    }}
                    onResizeStart={(e, direction, ref) => {
                      resizingRef.current = true;
                      initialLeft.current = parseFloat(ref.style.left);
                      initialWidth.current = parseFloat(ref.style.width);
                      ref.style.zIndex = "10";
                      ref.style.opacity = "0.65";

                      if (direction === "left") {
                        if (videoElement){
                          videoElement.currentTime = timeToMilliseconds(row["In"]) / 1000;
                          setCurrentTime(videoElement.currentTime);
                        }
                      }
                      else {
                        if (videoElement){
                          videoElement.currentTime = timeToMilliseconds(row["Out"]) / 1000;
                          setCurrentTime(videoElement.currentTime);
                        }
                      }                      
                    }}
                    onResize={(e, direction, ref, d) => {
                      let adjustingTime = 0;
                      if (direction === "left") {
                        ref.style.left = `${initialLeft.current - d.width}px`; // 이동한 만큼 left position을 늘려주기
                        ref.style.width = `${initialWidth.current + d.width}px`; // 이동한 만큼 width를 줄여주기
                        let newWidth = initialWidth.current + d.width;
                        adjustingTime = timeToMilliseconds(row["In"]) - ((newWidth - initialWidth.current) * 5);
                      } 
                      else if (direction === "right") {
                        ref.style.width = `${initialWidth.current + d.width}px`; // 오른쪽 변을 늘리는 경우에는 width만 늘려주기
                        let newWidth = initialWidth.current + d.width;
                        adjustingTime = timeToMilliseconds(row["Out"]) + ((newWidth - initialWidth.current) * 5);
                        //console.log("initialTime: ", row["In"], "adjustingTime: ", adjustingTime, "adjustTimeFormat: ", MillisecondsTotime(adjustingTime));
                      }
                      if (videoElement){
                        videoElement.currentTime = adjustingTime / 1000;
                        setCurrentTime(videoElement.currentTime);
                      }
                    }}
                    onResizeStop={(e, direction, ref) => {
                      ref.style.zIndex = "1";
                      ref.style.opacity = "1";
                      adjustTimeline(rowIndex, ref.offsetWidth, direction);
                      resizingRef.current = false;
                }}
                style={{
                  left: `${calculateLeftPosition(rowIndex)}px`,
                  position: "absolute",
                }}
                ref={timecellRefs.current[rowIndex]}
              >
                <div
                  className={ 
                    `rounded py-5 px-1 flex items-center justify-center ${
                    isInCurrentTime(row["In"], row["Out"]) &&
                    resizingRef.current === false
                      ? "highlighted border-slate-300 border-2"
                      : `border-2 ${row["Modapts"] === '-' ? "border-slate-700" : "border-transparent"}  `
                  } timeline-item-${rowIndex}`}
                  style={{
                    width: "100%",
                    height: "100%",
                    backgroundColor: colormap(row["Modapts"]),
                  }}
                >
                  {row["Modapts"]}
                </div>
              </Resizable>
            </div>
          ))}
        </Popover.Button>
        {/* <Transition
              as={Fragment}
              show={false}
              enter="transition ease-out duration-200"
              enterFrom="opacity-0 translate-y-1"
              enterTo="opacity-100 translate-y-0"
              leave="transition ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0"
              leaveTo="opacity-0 translate-y-1"
            > */}
        {selectedCellIndex !== null && (
          <div className="relative">
            <Popover.Panel
              // static
              // key={rowIndex}
              ref={popoverRef}
              className={`absolute z-[100] mt-6 w-screen max-w-sm -translate-x-1/2 transform px-4 `}
              style={{ left: `${popoverLeft}px` }}
            >
              {({ close }) => (
                <div className="overflow-hidden rounded-lg shadow-lg ring-1 ring-black ring-opacity-5">
                  <div className="relative gap-8 bg-white p-3 lg:grid-cols-2 text-slate-800">
                    <div>
                      {selectedCellIndex} :{" "}
                      {csvData[selectedCellIndex]["Modapts"]}
                    </div>
                    <div className="flex text-sm">
                      <div className="flex-1">
                        In
                        <div>{csvData[selectedCellIndex]["In"]}</div>
                      </div>
                      <div className="flex-1">
                        Out
                        <div>{csvData[selectedCellIndex]["Out"]}</div>
                      </div>
                      <div className="flex-1">
                        Duration
                        <div>{csvData[selectedCellIndex]["Duration"]}</div>
                      </div>
                    </div>

                    <div className="mt-4 text-sm">
                      Top-K
                      <div className="flex gap-3">
                        {csvData[selectedCellIndex]["Topk"]?.map(
                          (topk, index) => (
                            <div key={index} className="flex-1 border">
                              <div>
                                {" "}
                                {topk.Modapts} {topk.Score.toFixed(2)}{" "}
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                    
                  <button
                    onClick={() => {
                      close(timecellRefs.current[selectedCellIndex].current);
                    }}
                  >
                    close
                  </button>
                  </div>
                </div>
              )}
            </Popover.Panel>
          </div>
        )}
        {/* </Transition> */}
      </Popover>
      {/* </div> */}
      <div
        className={`absolute h-1`}
        style={{ left: totalWidth, width: "50%" }}
      >
        {" "}
      </div>
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
    case "-": // BG
      return "transparent";
    default: // Blank
      return "transparent";
  }
};

function addTimes(time1: string, time2: string): string {
  let ms1 = timeToMilliseconds(time1);
  let ms2 = timeToMilliseconds(time2);
  return MillisecondsTotime(ms1 + ms2);
}

function subtractTimes(time1: string, time2: string): string {
  let ms1 = timeToMilliseconds(time1);
  let ms2 = timeToMilliseconds(time2);
  return MillisecondsTotime(ms1 - ms2);
}

function MillisecondsTotime(duration: number): string {
  let absoluteDuration = Math.abs(duration);

  const frames = Math.round(((absoluteDuration % 1000) * 60) / 1000);
  const seconds = Math.floor((absoluteDuration / 1000) % 60);
  const minutes = Math.floor((absoluteDuration / (1000 * 60)) % 60);

  return `${String(minutes).padStart(1, "0")}:${String(seconds).padStart(
    2,
    "0"
  )}:${String(frames).padStart(2, "0")}`;
}

function timeToMilliseconds(timeString: string): number {
  if (!timeString) return 0;
  const timeArray = timeString.split(":");
  const minute = parseInt(timeArray[0]);
  const second = parseInt(timeArray[1]);
  const frame = parseInt(timeArray[2]);
  //console.log(minute, second, frame)
  return minute * 60 * 1000 + second * 1000 + (frame * 1000) / 60;
}

function secondsToTime(seconds: number): string {
  // sec with decimal to M:SS:FF
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  const frames = Math.round((seconds % 1) * 60);
  return `${String(minutes).padStart(1, "0")}:${String(remainingSeconds).padStart(2, "0")}:${String(
    frames
  ).padStart(2, "0")}`;
}

  