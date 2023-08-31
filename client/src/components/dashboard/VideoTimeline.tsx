"use client";
import {
  useEffect,
  useState,
  Fragment,
  createRef,
  useRef,
  JSXElementConstructor,
  Key,
  PromiseLikeOfReactNode,
  ReactElement,
  ReactNode,
  ReactPortal,
} from "react";
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
  
  const [scrollPosition, setScrollPosition] = useState<number | null>(null);
  const timecellRefs = useRef([]);
  const [totalWidth, setTotalWidth] = useState(0);
  const leftMarginRef = useRef<HTMLDivElement>();
  const [popoverLeft, setPopoverLeft] = useState(0);
  const resizingRef = useRef(false);
  const videoElement = useRecoilValue(videoRefState);
  const initialLeft = useRef(0);
  const initialWidth = useRef(0);
  const popoverRef = useRef();
  const containerRef = useRef();
  const mouseClickRef = useRef(false);
  const [scrolledTime, setScrolledTime] = useState(0);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  //popover value state
  const [popoverIndex, setPopoverIndex] = useState<number | null>(
    null
  );
  const [popoverIn, setPopoverIn] = useState("");
  const [popoverOut, setPopoverOut] = useState("");
  const [popoverLabel, setPopoverLabel] = useState("");



  useEffect(() => {
    document.addEventListener("mousedown", handleClickPopoverOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickPopoverOutside);
    };
  }, []);

  const handleClickPopoverOutside = (event: {
    target: any;
    preventDefault: () => void;
    stopPropagation: () => void;
  }) => {
    if (popoverRef.current && !popoverRef.current.contains(event.target)) {
      event.preventDefault();
      event.stopPropagation();
      setIsPopoverOpen(false);
      setPopoverIndex(null);
      setPopoverIn("");
      setPopoverOut("");
      setPopoverLabel("");
      
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
        if (idx !== timecellRefs.current.length - 1) width += 10;
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
          const startTime = timeStringToSeconds(row["In"]);
          const endTime = timeStringToSeconds(row["Out"]);
          const duration = endTime - startTime;

          // Find out where the currentTime falls within the highlighted Modapts
          const normalizedTime = (currentTime - startTime) / duration;

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

  const handleCellClick = (index) => {
    // go to cell's time
    // const row = csvData[index];
    // const startTime = timeStringToSeconds(row["In"]);

    // scroll
    const element = document.querySelector(`.timeline-item-${index}`);
    const container = document.getElementById("scrollableTimelineContainer");

    const elementRect = element.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    const scrollLeftPosition =
      elementRect.left -
      containerRect.left +
      container.scrollLeft -
      containerRect.width / 2;

    // container.scrollLeft = scrollLeftPosition;
    container.scrollTo({
      left: scrollLeftPosition,
      behavior: "smooth",
    });

    const row = csvData[index];
    const startTime = timeStringToSeconds(row["In"]);
    setTimeout(() => {
      if (videoElement) {
        videoElement.currentTime = startTime;
        setCurrentTime(startTime);
      }
    }, 500);
  };

  function findRowIndexByTime(csvData, currentTime) {
    let left = 0;
    let right = csvData.length - 1;
    
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const row = csvData[mid];
      const startTime = timeStringToSeconds(row["In"]);
      const endTime = timeStringToSeconds(row["Out"]);      
      if (startTime <= currentTime && currentTime <= endTime) {
        return mid;
      }
      
      if (currentTime < startTime) {
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    }
    return -1;
  }

  const handleScroll = () => {
    const container = document.getElementById("scrollableTimelineContainer");

    if (container) {
      // Step 1: Get the scroll position
      const currentScrollPosition = container.scrollLeft;
      
      // Step 2: Calculate the visible range
      const lastElement = csvData[csvData.length - 1];
      const totalDuration = timeStringToSeconds(lastElement["Out"]);
      const totalWidth = (totalDuration * 500) + (10 * (csvData.length - 1));
      const tempCurrentTime = (currentScrollPosition / totalWidth) * totalDuration;
      
      // Step 3: Find the rowIndex and calculate the relative time
      const rowIndex = findRowIndexByTime(csvData, tempCurrentTime);
      if (rowIndex >= csvData.length || rowIndex < 0) {
        setScrolledTime(tempCurrentTime);
        return;
      }
      const elementWidth = timeStringToSeconds(csvData[rowIndex]["Duration"]) * 500;
      const calculatePreviousWidth = (timeStringToSeconds(csvData[rowIndex]["In"]) * 500) + (10 * rowIndex);
      const relativePosition = currentScrollPosition - calculatePreviousWidth;
      const baseTime = timeStringToSeconds(csvData[rowIndex]["In"]);
      const estimatedTime = (relativePosition / elementWidth) * timeStringToSeconds(csvData[rowIndex]["Duration"]) + baseTime;

      setScrolledTime(estimatedTime);
    }
  };

  useEffect(() => {
    // console.log("popoverIndex:", popoverIndex);

    if (popoverIndex !== null) {
      // console.log(timecellRefs.current[popoverIndex])
      let left = 0;
      for (let i = 0; i < popoverIndex; i++) {
        if (timecellRefs.current[i].current) {
          left += timecellRefs.current[i].current.state.width;
          left += 10;
        }
      }
      left += timecellRefs.current[popoverIndex].current.state.width / 2;
      setPopoverLeft(left);
    }
  }, [popoverIndex]);

  function calculateLeftPosition(index: number) {
    const base = timeStringToSeconds(csvData[index]["In"]) * 500;
    const margin = index * 10; // 2px margin between each timeline
    return base + margin; //+ margin;
  }

  const editTimeline = (
    index: number,
    newIn: string,
    newOut: string,
    newLabel: string
  ) => {
    const newCsvData = JSON.parse(JSON.stringify(csvData));
    const oldIn = newCsvData[index].In;
    const oldOut = newCsvData[index].Out;

    const newInTime = timeStringToSeconds(newIn);
    const oldInTime = timeStringToSeconds(oldIn);
    adjustLeftTimeline(index, -(newInTime - oldInTime), newCsvData);

    const newOutTime = timeStringToSeconds(newOut);
    const oldOutTime = timeStringToSeconds(oldOut);
    adjustRightTimeline(index, newOutTime - oldOutTime, newCsvData);

    newCsvData[index].label = newLabel;
    setCSVData(newCsvData);
  };

  const adjustTimeline = (
    index: number,
    newWidth: number,
    direction: string
  ) => {
    const newCsvData = JSON.parse(JSON.stringify(csvData));
    const oldDuration = timeStringToSeconds(newCsvData[index].Duration);
    const oldWidth = oldDuration * 500;
    const deltaWidth = newWidth - oldWidth;
    const deltaDuration = deltaWidth / 500;

    if (direction == "left") {
      adjustLeftTimeline(index, deltaDuration, newCsvData);
    } else if (direction == "right") {
      adjustRightTimeline(index, deltaDuration, newCsvData);
    }
    setCSVData(newCsvData);
  };

  const adjustLeftTimeline = (
    index: number,
    deltaDuration: number,
    newCsvData: any
  ) => {
    if (deltaDuration >= 0) {
      // Left resize logic
      handleLeftIncrease(index, deltaDuration, newCsvData);
    } else {
      handleLeftDecrease(index, deltaDuration, newCsvData);
    }
    if (index - 1 >= 0 && newCsvData[index - 1].Out !== newCsvData[index].In) {
      // adjust the previous timeline's out time to the current timeline's in time
      newCsvData[index - 1].Out = newCsvData[index].In;
      newCsvData[index - 1].Duration = subtractTimes(
        newCsvData[index - 1].Out,
        newCsvData[index - 1].In
      );
    }
  };

  const handleLeftIncrease = (
    index: number,
    deltaDuration: number,
    newCsvData: any[]
  ) => {
    // when resizing to the left, it should overlap the previous timelines
    const oldDuration = timeStringToSeconds(newCsvData[index].Duration);
    let remainingDuration = deltaDuration;

    for (let i = index - 1; i >= 0 && remainingDuration > 0; i--) {
      const prevDuration = timeStringToSeconds(newCsvData[i].Duration);
      if (prevDuration <= remainingDuration) {
        remainingDuration -= prevDuration;
        newCsvData.splice(i, 1);
        index--;
      } else {
        newCsvData[i].Out = subtractTimes(
          newCsvData[i].Out,
          secondsToTimeString(remainingDuration)
        );
        newCsvData[i].Duration = secondsToTimeString(
          prevDuration - remainingDuration
        );
        newCsvData[i].In = subtractTimes(
          newCsvData[i].Out,
          newCsvData[i].Duration
        );
        remainingDuration = 0;
      }
    }
    newCsvData[index].Duration = secondsToTimeString(
      oldDuration + deltaDuration - remainingDuration
    );
    newCsvData[index].In = subtractTimes(
      newCsvData[index].Out,
      newCsvData[index].Duration
    );
  };

  const handleLeftDecrease = (
    index: number,
    deltaDuration: number,
    newCsvData: any[]
  ) => {
    const oldDuration = timeStringToSeconds(newCsvData[index].Duration);
    if (oldDuration + deltaDuration <= 0.065) {
      // less than half modapts (129ms)
      const blankSpace = newCsvData[index];
      blankSpace.Modapts = "-";
      newCsvData[index] = blankSpace;
    } else {
      // Right reducing logic
      newCsvData[index].Duration = secondsToTimeString(
        oldDuration + deltaDuration
      );
      newCsvData[index].In = subtractTimes(
        newCsvData[index].Out,
        newCsvData[index].Duration
      );
      const blankSpace = {
        Modapts: "-",
        In: subtractTimes(
          newCsvData[index].In,
          secondsToTimeString(deltaDuration)
        ),
        Out: newCsvData[index].In,
        Duration: secondsToTimeString(deltaDuration),
      };
      newCsvData.splice(index, 0, blankSpace);
    }
  };

  const adjustRightTimeline = (
    index: number,
    deltaDuration: number,
    newCsvData: any
  ) => {
    // console.log("adjustTimeline before- newCsvData: ", newCsvData[index], "newCsvData[index].In-mili: ", timeStringToSeconds(newCsvData[index].In));
    if (deltaDuration >= 0) {
      // Left resize logic
      handleRightIncrease(index, deltaDuration, newCsvData);
    } else {
      handleRightDecrease(index, deltaDuration, newCsvData);
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
  };

  const handleRightIncrease = (
    index: number,
    deltaDuration: number,
    newCsvData: any[]
  ) => {
    // Right resize logic, need to overlapp the next timeline to indicate how long the timeline is moving
    console.log(newCsvData[index]);
    const oldDuration = timeStringToSeconds(newCsvData[index].Duration);
    let remainingDuration = deltaDuration;

    for (
      let i = index + 1;
      i < newCsvData.length && remainingDuration > 0;
      i++
    ) {
      // need to optimize?
      const nextDuration = timeStringToSeconds(newCsvData[i].Duration);

      if (nextDuration <= remainingDuration) {
        remainingDuration -= nextDuration;
        newCsvData.splice(i, 1);
        i--;
      } else {
        newCsvData[i].In = addTimes(
          newCsvData[i].In,
          secondsToTimeString(remainingDuration)
        );
        newCsvData[i].Duration = secondsToTimeString(
          nextDuration - remainingDuration
        );
        newCsvData[i].Out = addTimes(newCsvData[i].In, newCsvData[i].Duration);
        remainingDuration = 0;
      }
    }
    newCsvData[index].Duration = secondsToTimeString(
      oldDuration + deltaDuration - remainingDuration
    );
    newCsvData[index].Out = addTimes(
      newCsvData[index].In,
      newCsvData[index].Duration
    );
  };

  const handleRightDecrease = (
    index: number,
    deltaDuration: number,
    newCsvData: any[]
  ) => {
    const oldDuration = timeStringToSeconds(newCsvData[index].Duration);
    if (oldDuration + deltaDuration <= 0.065) {
      // less than half modapts (129ms)
      const blankSpace = newCsvData[index];
      blankSpace.Modapts = "-";
      newCsvData[index] = blankSpace;
    } else {
      newCsvData[index].Duration = secondsToTimeString(
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
          secondsToTimeString(-deltaDuration)
        ),
        Duration: secondsToTimeString(-deltaDuration),
      };
      newCsvData.splice(index + 1, 0, blankSpace);
    }
  };

  const isInCurrentTime = (start: string, end: string) => {
    const startTimeMillis = timeStringToSeconds(start);
    const endTimeMillis = timeStringToSeconds(end);

    return currentTime >= startTimeMillis && currentTime < endTimeMillis;
  };

  const handleMouseMove = (e: {
    target: { getBoundingClientRect: () => any; style: { cursor: string } };
    clientX: number;
  }) => {
    const rect = e.target.getBoundingClientRect();
    const xPos = e.clientX - rect.left;
    const boundaryTolerance = 5; // distance in pixels near the edge

    if (mouseClickRef.current) {
      e.target.style.cursor = "col-resize";
    } else {
      if (xPos <= boundaryTolerance) {
        e.target.style.cursor = "w-resize"; // Cursor like "<|"
      } else if (xPos >= rect.width - boundaryTolerance) {
        e.target.style.cursor = "e-resize"; // Cursor like "|>"
      } else {
        e.target.style.cursor = "grab";
      }
    }
  };

  const handleMouseDown = (e: any) => {
    mouseClickRef.current = true;
  };

  const handleMouseUp = (e: any) => {
    mouseClickRef.current = false;
  };

  const handlePopoverSave = () => {
    if (popoverIndex !== null) {
      editTimeline(popoverIndex, popoverIn, popoverOut, popoverLabel);
      setIsPopoverOpen(false);
    }
  }

  return (
    <div className="relative w-full h-full pt-5">
      <div className="absolute z-50 mt-2 w-[0.2rem] h-24 left-[50%] right-[50%] bg-stone-300 border-slate-600 border-1"></div>
      <div className="absolute left-[50%] top-40 transform -translate-x-[50%] font-mono">
        {videoElement?.paused ? secondsToTimeString(scrolledTime) : secondsToTimeString(currentTime)}
        </div>
      <div
        className="w-full relative overflow-x-scroll flex h-[18rem]"
        id="scrollableTimelineContainer"
        ref={containerRef}
        onScroll={handleScroll}
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
                onContextMenu={(e) => {
                  e.preventDefault();
                  setPopoverIn(row["In"]);
                  setPopoverOut(row["Out"]);
                  setPopoverLabel(row["Modapts"]);
                  setPopoverIndex(rowIndex);
                  setIsPopoverOpen(true);
                }}
                onClick={(e) => {
                  handleCellClick(rowIndex);
                  e.stopPropagation();
                }}
                className=""
                onMouseMove={handleMouseMove}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
              >
                <Resizable
                  key={`${rowIndex}-${row["Modapts"]}-${timeStringToSeconds(
                    row["Duration"]
                  )}`}
                  defaultSize={{
                    width: timeStringToSeconds(row["Duration"]) * 500,
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

                    const timeKey = direction === "left" ? "In" : "Out";

                    if (videoElement) {
                      videoElement.currentTime = timeStringToSeconds(
                        row[timeKey]
                      );
                      setCurrentTime(videoElement.currentTime);
                    }
                  }}
                  onResize={(e, direction, ref, d) => {
                    const newWidth = initialWidth.current + d.width;
                    const timeKey = direction === "left" ? "In" : "Out";
                    if (direction === "left") {
                      ref.style.left = `${initialLeft.current - d.width}px`;
                    }
                    ref.style.width = `${newWidth}px`;
                    const adjustingTime =
                      timeStringToSeconds(row[timeKey]) +
                      (direction === "left" ? -1 : 1) *
                        ((newWidth - initialWidth.current) / 500);
                    if (videoElement) {
                      videoElement.currentTime = adjustingTime;
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
                    className={`rounded py-5 px-1 flex items-center justify-center ${
                      isInCurrentTime(row["In"], row["Out"]) &&
                      resizingRef.current === false
                        ? "highlighted border-slate-300 border-2"
                        : `border-2 ${
                            row["Modapts"] === "-"
                              ? "border-slate-700"
                              : "border-transparent"
                          }  `
                    } timeline-item-${rowIndex}`}
                    style={{
                      width: "100%",
                      height: "100%",
                      backgroundColor: colormap(row["Modapts"]),
                    }}
                  >
                    <div className="flex-grow text-center">
                      {row["Modapts"]}
                    </div>
                    {/* <div className="ml-auto">수정</div> */}
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
          {popoverIndex !== null && isPopoverOpen && (
            <div className="relative">
              <Popover.Panel
                static
                // key={rowIndex}
                ref={popoverRef}
                className={`absolute z-[100] mt-6 w-screen max-w-sm -translate-x-1/2 transform px-4 `}
                style={{ left: `${popoverLeft}px` }}
              >
                {({ close }) => (
                  <div className="overflow-hidden rounded-lg shadow-lg ring-1 ring-black ring-opacity-5">
                    <div className="relative gap-8 bg-white p-3 lg:grid-cols-2 text-slate-800">
                      <div className="flex flex-row">
                        <div>{popoverIndex + 1}</div>
                        {/* {csvData[popoverIndex]["Modapts"]} */}
                        <input
                          className="text-sm p-1 w-full"
                          placeholder={csvData[popoverIndex]["Modapts"]}
                          onChange={(e) => {setPopoverLabel(e.target.value)}}
                          value={popoverLabel}
                        ></input>
                      </div>
                      <div className="flex text-sm font-semibold gap-3 mt-2">
                        <div className="flex-1">
                          In
                          {/* <div>{csvData[popoverIndex]["In"]}</div> */}
                          <input
                            className="mt-1 text-sm p-1 w-full font-normal rounded-md bg-slate-100 border-slate-200"
                            placeholder={csvData[popoverIndex]["In"]}
                            onChange={(e) => {setPopoverIn(e.target.value)}}
                          ></input>
                        </div>
                        <div className="flex-1">
                          Out
                          {/* <div>{csvData[popoverIndex]["Out"]}</div> */}
                          <input
                            className="mt-1 text-sm p-1 w-full font-normal rounded-md bg-slate-100 border-slate-200"
                            placeholder={csvData[popoverIndex]["Out"]}
                            onChange={e => {setPopoverOut(e.target.value)}}
                          ></input>
                        </div>
                        <div className="flex-1">
                          Duration
                          <div className="mt-1 p-1 font-normal">
                            {subtractTimes(csvData[popoverIndex]["Out"], csvData[popoverIndex]["In"])}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 text-sm font-semibold">
                        Top-K
                        <div className="flex gap-3 mt-2">
                          {csvData[popoverIndex]["Topk"]?.map(
                            (topk, index) => (
                              <div
                                key={index}
                                className={`flex-1 rounded px-2 py-1 hover:shadow-md hover:-translate-y-0.5 transition duration-200`}
                                style={{
                                  backgroundColor: topKColormap(topk.Modapts),
                                }}
                                onClick={() => setPopoverLabel(topk.Modapts)}
                              >
                                <div className="flex flex-row text-white">
                                  <div>{topk.Modapts}</div>
                                  <div className="ml-auto">
                                    {topk.Score.toFixed(2)}
                                  </div>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                      <div className="flex flex-row">
                        <div className="flex mx-auto mt-2 text-sm">
                        <button
                          className="flex mx-3"
                          onClick={() => {
                            setIsPopoverOpen(false);
                            setPopoverIndex(null);
                            setPopoverIn("");
                            setPopoverOut("");
                            setPopoverLabel("");
                            close();
                          }}
                        >
                          CLOSE
                        </button>
                        <button className="flex mx-3" onClick={handlePopoverSave}>SAVE</button>
                        </div>
                      </div>
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

const topKColormap = (label: string) => {
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
      return "#BAB0AC";
    default: // Blank
      return "transparent";
  }
};

function addTimes(time1: string, time2: string): string {
  let ms1 = timeStringToSeconds(time1);
  let ms2 = timeStringToSeconds(time2);
  return secondsToTimeString(ms1 + ms2);
}

function subtractTimes(time1: string, time2: string): string {
  let ms1 = timeStringToSeconds(time1);
  let ms2 = timeStringToSeconds(time2);
  return secondsToTimeString(ms1 - ms2);
}

// function timeToMilliseconds(duration: number): string {
//   let absoluteDuration = Math.abs(duration);

//   const frames = Math.round(((absoluteDuration % 1000) * 60) / 1000);
//   const seconds = Math.floor((absoluteDuration / 1000) % 60);
//   const minutes = Math.floor((absoluteDuration / (1000 * 60)) % 60);

//   return `${String(minutes).padStart(1, "0")}:${String(seconds).padStart(
//     2,
//     "0"
//   )}:${String(frames).padStart(2, "0")}`;
// }

// function timeStringToSeconds(timeString: string): number {
//   if (!timeString) return 0;
//   const timeArray = timeString.split(":");
//   const minute = parseInt(timeArray[0]);
//   const second = parseInt(timeArray[1]);
//   const frame = parseInt(timeArray[2]);
//   //console.log(minute, second, frame)
//   return minute * 60 * 1000 + second * 1000 + (frame * 1000) / 60;
// }

function secondsToTimeString(seconds: number): string {
  let absoluteSeconds = Math.abs(seconds);
  // sec with decimal to M:SS:FF
  const minutes = Math.floor(absoluteSeconds / 60);
  const remainingSeconds = Math.floor(absoluteSeconds % 60);
  const frames = Math.round((absoluteSeconds % 1) * 60);
  return `${String(minutes).padStart(1, "0")}:${String(
    remainingSeconds
  ).padStart(2, "0")}:${String(frames).padStart(2, "0")}`;
}

function timeStringToSeconds(timeString: string): number {
  const timeArray = timeString.split(":");
  const minute = parseInt(timeArray[0]);
  const second = parseInt(timeArray[1]);
  const frame = parseInt(timeArray[2]);
  return minute * 60 + second + frame / 60;
}
