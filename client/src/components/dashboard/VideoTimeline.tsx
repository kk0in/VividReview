"use client";
import { useEffect, useState, Fragment } from "react";
import { Resizable } from "re-resizable";
import { useRecoilState, useRecoilValue } from "recoil";
import { currentTimeState } from "@/app/recoil/currentTimeState";
import { csvDataState } from "@/app/recoil/DataState";
import { Popover, Transition } from "@headlessui/react";

export default function VideoTimeline() {
  const [csvData, setCSVData] = useRecoilState(csvDataState);
  const [currentTime, setCurrentTime] = useRecoilState(currentTimeState);
  const [openState, setOpenState] = useState(false);
  const [selectedCellIndex, setSelectedCellIndex] = useState<number | null>(
    null
  );

  let initialLeft = 0;
  let initialWidth = 0;

  useEffect(() => {
    // console.log(csvData);
    const element = document.querySelector(".highlighted");
    const container = document.getElementById("scrollableTimelineContainer");

    if (element && container) {
      const elementRect = element.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      const scrollLeftPosition =
        elementRect.left -
        containerRect.left +
        container.scrollLeft -
        containerRect.width / 2 +
        elementRect.width / 2; // Centers the highlighted section

      container.scrollLeft = scrollLeftPosition;
      container.scrollTo({
        left: scrollLeftPosition,
        behavior: "smooth",
      });
    }
  }, [currentTime]);

  function calculateLeftPosition(index: number) {
    const base = timeToMilliseconds(csvData[index]["In"]) / 5;
    const margin = index * 4; // 2px margin between each timeline
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
          blankSpace.label = "";
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
            label: "",
            start: subtractTimes(
              newCsvData[index].In,
              MillisecondsTotime(deltaDuration)
            ),
            end: newCsvData[index].In,
            duration: MillisecondsTotime(deltaDuration),
          };
          newCsvData.splice(index, 0, blankSpace);
        }
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
          blankSpace.label = "";
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
            label: "",
            start: newCsvData[index].Out,
            end: addTimes(
              newCsvData[index].Out,
              MillisecondsTotime(-deltaDuration)
            ),
            duration: MillisecondsTotime(-deltaDuration),
          };
          newCsvData.splice(index + 1, 0, blankSpace);
        }
      }
    }
    setCSVData(newCsvData);
  };
  const isInCurrentTime = (start: string, end: string) => {
    const startTimeMillis = timeToMilliseconds(start);
    const endTimeMillis = timeToMilliseconds(end);
    const _currentTime = currentTime * 1000;

    return _currentTime >= startTimeMillis && _currentTime <= endTimeMillis;
  };

  return (
    <div
      className="flex w-full overflow-x-scroll h-full"
      id="scrollableTimelineContainer"
    >
      <div className="flex w-full h-full flex-row overflow-scroll">
        <div className="flex w-1/2">a</div>
        <div className="">
          <Popover className="flex relative w-full">
            {/* {({close}) => } */}
            <Popover.Button>
              {csvData.map((row, rowIndex) => (
                <div
                  key={rowIndex}
                  onClick={() => setSelectedCellIndex(rowIndex)}
                  className=""
                >
                  <Resizable
                    key={`${rowIndex}-${row["Modapts"]}-${timeToMilliseconds(
                      row["Duration"]
                    )}`}
                    defaultSize={{
                      width: timeToMilliseconds(row["Duration"]) / 5,
                      height: 30,
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
                      initialLeft = parseFloat(ref.style.left);
                      initialWidth = parseFloat(ref.style.width);
                      ref.style.zIndex = "10";
                      ref.style.opacity = "0.65";
                    }}
                    onResize={(e, direction, ref, d) => {
                      if (direction === "left") {
                        ref.style.left = `${initialLeft - d.width}px`; // 이동한 만큼 left position을 늘려주기
                        ref.style.width = `${initialWidth + d.width}px`; // 이동한 만큼 width를 줄여주기
                      } else if (direction === "right") {
                        ref.style.width = `${initialWidth + d.width}px`; // 오른쪽 변을 늘리는 경우에는 width만 늘려주기
                      }
                    }}
                    onResizeStop={(e, direction, ref) => {
                      ref.style.zIndex = "1";
                      ref.style.opacity = "1";
                      adjustTimeline(rowIndex, ref.offsetWidth, direction);
                    }}
                    style={{
                      left: `${calculateLeftPosition(rowIndex)}px`,
                      position: "absolute",
                    }}
                  >
                    <div
                      className={`rounded py-5 px-1 border flex items-center justify-center ${
                        !row["Modapts"] ? "" : "border-opacity-0"
                      } ${
                        isInCurrentTime(row["In"], row["Out"])
                          ? "highlighted"
                          : ""
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
            {selectedCellIndex && (
              <Popover.Panel
                // key={rowIndex}
                style={{
                  left: `${calculateLeftPosition(selectedCellIndex)}px`,
                }}
                className="absolute z-10 mt-3 w-screen max-w-sm -translate-x-1/2 transform px-4 "
              >
                <div className="overflow-hidden rounded-lg shadow-lg ring-1 ring-black ring-opacity-5">
                  <div className="relative grid gap-8 bg-white p-7 lg:grid-cols-2 text-slate-800">
                    POPOVER PANEL
                    {selectedCellIndex}
                    <br />
                  </div>
                </div>
              </Popover.Panel>
            )}
            {/* </Transition> */}
          </Popover>
        </div>
        <div className="flex w-1/2">a</div>
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
      return "#BAB0AC";
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
