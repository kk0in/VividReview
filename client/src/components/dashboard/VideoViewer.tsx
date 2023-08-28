import React, { useState, useRef, useEffect, KeyboardEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCirclePlay,
  faCirclePause,
  faReply,
  faCircle,
  faRepeat,
} from "@fortawesome/free-solid-svg-icons";
import { useRecoilState } from "recoil";
import { currentTimeState } from "@/app/recoil/currentTimeState";
import { csvDataState } from "@/app/recoil/DataState";

interface VideoViewerProps {
  videoSrc: string;
}

const VideoViewer: React.FC<VideoViewerProps> = ({ videoSrc }) => {
  const [csvData, setCSVData] = useRecoilState(csvDataState);
  // console.log(csvDataState);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [currentTime, setCurrentTime] = useRecoilState(currentTimeState);
  const [currentModapts, setCurrentModapts] = useState(null);
  const [currentModaptsTime, setCurrentModaptsTime] = useState<
    [number, number]
  >([0, 0]);

  const animationFrameRef = useRef(0);
  const handleTimeUpdate = (newTime) => {
    const video = videoRef.current;
    if (video) {
      //   const newTime = video.currentTime;
      setCurrentTime(newTime);
      const duration = video.duration;
      const calculatedProgress = (newTime / duration) * 100;
      setProgress(calculatedProgress);
    }
  };

  useEffect(() => {
    if (csvData.length > 0) {
      csvData.forEach((row, index) => {
        const startTime = timeToMilliseconds(row["start"]);
        const endTime = timeToMilliseconds(row["end"]);
        const current = currentTime * 1000;
        if (current >= startTime && current <= endTime) {
          setCurrentModapts(row["label"]);
          setCurrentModaptsTime([startTime / 1000, endTime / 1000]);
          return;
        }
      });
    }
  }, [currentTime, csvData]);
  function timeToMilliseconds(timeString: string): number {
    if (timeString) {
      const timeArray = timeString.split(":");
      // const hour = parseInt(timeArray[0]);
      const minute = parseInt(timeArray[0]);
      const second = parseInt(timeArray[1].split(".")[0]);
      const frame = parseInt(timeArray[1].split(".")[1]);

      const milliseconds =
        minute * 60 * 1000 + second * 1000 + (frame * 1000) / 60;

      return milliseconds;
    }
  }
  const updateTimestamp = () => {
    const video = videoRef.current;
    if (video) {
      animationFrameRef.current = requestAnimationFrame(updateTimestamp);
      handleTimeUpdate(video.currentTime);
    }
  };

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(updateTimestamp);
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [currentTime]);

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !videoRef.current) {
      return;
    }

    const progressBar = progressRef.current;
    const progressBarWidth = progressBar.clientWidth;
    const clickedPosition =
      e.clientX - progressBar.getBoundingClientRect().left;

    if (clickedPosition >= 0 && clickedPosition <= progressBarWidth) {
      const newTime =
        (clickedPosition / progressBarWidth) * videoRef.current.duration;
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const getPlayPauseIcon = () => {
    return isPlaying ? faCirclePause : faCirclePlay;
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === " ") {
        handlePlayPause();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPlaying]);

  const formatTime = (timeInSeconds: number): string => {
    const date = new Date(null);
    date.setSeconds(timeInSeconds);

    const mins = date.getUTCMinutes();
    const secs = date.getUTCSeconds();
    const millisecs = Math.floor(
      (timeInSeconds - Math.floor(timeInSeconds)) * 1000
    );

    const msToFrame = Math.floor((millisecs * 60) / 1000);

    const formattedTime = `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}:${msToFrame.toString().padStart(2, "0")}`;
    return formattedTime;
  };

  const [isPlayingRange, setIsPlayingRange] = useState<boolean>(false);
  const [playingRange, setPlayingRange] = useState<[number, number]>();

  const rewind = (seconds: number) => {
    if (videoRef.current) {
      const newCurrentTime = videoRef.current.currentTime - seconds;
      videoRef.current.currentTime = newCurrentTime;
      setCurrentTime(newCurrentTime);
      // setCurrentTime(videoRef.current.currentTime);
      if (isPlayingRange) {
        csvData.forEach((row, index) => {
          const startTime = timeToMilliseconds(row["start"]);
          const endTime = timeToMilliseconds(row["end"]);
          const current = newCurrentTime * 1000;
          if (current >= startTime && current <= endTime) {
            setPlayingRange([startTime / 1000, endTime / 1000]);
            setCurrentModaptsTime([
              startTime / 1000 + 0.001,
              endTime / 1000 - 0.001,
            ]);

            return;
          }
        });
      }
    }
  };

  const [isInputMode, setIsInputMode] = useState<boolean>(false);
  const [inputTime, setInputTime] = useState<string>("");

  const handleTimeSpanClick = () => {
    setIsInputMode(true);
    setInputTime(formatTime(currentTime));
    if (videoRef.current && isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputTime(e.target.value);
  };

  const handleInputKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleInputBlur();
    }
  };

  const handleInputBlur = () => {
    setIsInputMode(false);
    const timeComponents = inputTime.split(":");

    if (timeComponents.length !== 3) {
      // The input does not follow the format, show an error message or handle it as needed
      console.log("Invalid time format");
      return;
    }

    const [mins, secs, frames] = timeComponents.map((component) =>
      parseInt(component)
    );

    if (isNaN(mins) || isNaN(secs) || isNaN(frames)) {
      // Invalid numeric values, show an error message or handle it as needed
      console.log("Invalid numeric values");
      return;
    }

    if (
      mins < 0 ||
      mins > 59 ||
      secs < 0 ||
      secs > 59 ||
      frames < 0 ||
      frames > 59
    ) {
      // Invalid time values, show an error message or handle it as needed
      console.log("Invalid time values");
      return;
    }

    const newTimeInSeconds = mins * 60 + secs + frames / 60;
    if (!isNaN(newTimeInSeconds) && videoRef.current) {
      videoRef.current.currentTime = newTimeInSeconds;
      setCurrentTime(newTimeInSeconds);
    }
  };

  const [isDragging, setIsDragging] = useState<boolean>(false);

  const handleProgressBarMouseDown = () => {
    setIsDragging(true);
  };

  const handleProgressBarMouseUp = () => {
    setIsDragging(false);
  };

  const handleProgressBarMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    // refresh speed control
    if (isDragging) {
      updateProgressWidth(e.clientX);
    }
  };

  const updateProgressWidth = (clientX: number) => {
    if (!progressRef.current) {
      return;
    }

    const progressBar = progressRef.current;
    const progressBarWidth = progressBar.clientWidth;
    const clickedPosition = clientX - progressBar.getBoundingClientRect().left;

    if (clickedPosition >= 0 && clickedPosition <= progressBarWidth) {
      const newProgress = (clickedPosition / progressBarWidth) * 100;
      setProgress(newProgress);

      if (videoRef.current) {
        const newTime = (newProgress / 100) * videoRef.current.duration;
        videoRef.current.currentTime = newTime;
        setCurrentTime(newTime);
      }
    }
  };

  const colormap = (label: string) => {
    if (!label) {
      return;
    }
    if (label === "BG") return "#BAB0AC";
    let label_alphabet = label[0];
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
    }
  };

  const handlePlayRangeToggle = () => {
    if (isPlayingRange) {
      setIsPlayingRange(false);
    } else {
      setIsPlayingRange(true);
      setPlayingRange([
        currentModaptsTime[0] + 0.001,
        currentModaptsTime[1] - 0.001,
      ]);
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (isPlayingRange && video && currentTime >= playingRange[1]) {
      video.currentTime = playingRange[0];
      setCurrentTime(playingRange[0]);
    }
  }, [isPlayingRange, currentTime, playingRange]);

  return (
    <div className="w-[80%]">
      <video ref={videoRef} src={videoSrc} />
      <div
        className="h-2.5 my-1.5 cursor-pointer bg-stone-300 rounded w-full"
        ref={progressRef}
        onClick={handleProgressBarClick}
        onMouseDown={handleProgressBarMouseDown}
        onMouseUp={handleProgressBarMouseUp}
        onMouseMove={handleProgressBarMouseMove}
      >
        <div className="flex">
          <div
            className="h-2.5 bg-blue-400"
            style={{ width: `${progress}%`, zIndex: 1 }}
          />
          <FontAwesomeIcon
            icon={faCircle}
            size="sm"
            style={{ zIndex: 2, marginLeft: "-5px", marginTop: "-1.5px" }}
          />
        </div>
      </div>
      <div className=" flex">
        <div className="h-10 w-3/4 pl-20 flex justify-center items-center">
          <button className={`m-2`} onClick={() => rewind(1)}>
            <FontAwesomeIcon icon={faReply} size="lg" />
          </button>
          <button className="m-2" onClick={handlePlayPause}>
            <FontAwesomeIcon icon={getPlayPauseIcon()} size="xl" />
          </button>

          <span
            className={`m-2 font-mono ${isInputMode ? "hidden" : "block"}`}
            onClick={handleTimeSpanClick}
          >
            {videoRef.current ? formatTime(currentTime) : "00:00:00"}
          </span>
          {isInputMode && (
            <input
              className="m-2 w-24 font-mono border p-1 text-black bg-white"
              type="text"
              value={inputTime}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              onKeyUp={handleInputKeyUp}
              autoFocus
            />
          )}
          <button className={`m-2`} onClick={() => rewind(-1)}>
            <FontAwesomeIcon icon={faReply} size="lg" flip="horizontal" />
          </button>

          <div
            className={`ml-5 ${
              isPlayingRange ? "bg-white rounded bg-opacity-50" : ""
            }`}
          >
            <button onClick={handlePlayRangeToggle}>
              <FontAwesomeIcon icon={faRepeat} size="lg" />
            </button>
          </div>
        </div>

        <div
          className={`w-14 ml-2 rounded-lg flex items-center justify-center`}
          style={{ backgroundColor: colormap(currentModapts) }}
        >
          <h2 className="font-mono text-white">{currentModapts}</h2>
        </div>
      </div>
    </div>
  );
};

export default VideoViewer;
