import React, { useState, useRef, useEffect, KeyboardEvent } from "react";
import { throttle } from 'lodash';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCirclePlay,
  faCirclePause,
  faClockRotateLeft,
} from "@fortawesome/free-solid-svg-icons";
import { useRecoilState } from "recoil";
import { currentTimeState } from "../app/recoil/currentTimeState";

interface VideoViewerProps {
  currentModapts: string;
  videoSrc: string;
}

const VideoViewer: React.FC<VideoViewerProps> = ({
  currentModapts,
  videoSrc,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [currentTime, setCurrentTime] = useRecoilState(currentTimeState);
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
  }

  const updateTimestamp = () => {
    const video = videoRef.current;
    if (video){
      // console.log(video.currentTime)
      animationFrameRef.current = requestAnimationFrame(updateTimestamp);
      handleTimeUpdate(video.currentTime)
    }
  }

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(updateTimestamp);
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, []);

  useEffect

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
    // ms to 60frame rate
    const msToFrame = Math.floor((millisecs * 60) / 1000);

    const formattedTime = `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}:${msToFrame
      .toString()
      .padStart(2, "0")}`;
    return formattedTime;
  };

  const rewind = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime -= seconds;
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const colormap = (label: string) => {
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

  return (
    <div className="w-[90%]">
      <video ref={videoRef} src={videoSrc} />
      <div
        className="h-2.5 my-1.5 cursor-pointer bg-stone-300 rounded w-full"
        ref={progressRef}
        onClick={handleProgressBarClick}
      >
        <div
          className="h-2.5 rounded bg-blue-400"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className=" flex">
        <div className="h-10 w-3/4 pl-20 flex justify-center items-center">
          <button className="m-2" onClick={() => rewind(5)}>
            <FontAwesomeIcon icon={faClockRotateLeft} size="lg" />
          </button>
          <button className="m-2" onClick={handlePlayPause}>
            <FontAwesomeIcon icon={getPlayPauseIcon()} size="xl" />
          </button>
          <span className="m-2 font-mono">
            {videoRef.current ? formatTime(currentTime) : "00:00:00"}
          </span>
          <button className="m-2" onClick={() => rewind(-5)}>
            <FontAwesomeIcon
              icon={faClockRotateLeft}
              size="lg"
              flip="horizontal"
            />
          </button>
        </div>

        <div
          className={`w-14 ml-5 rounded-lg flex items-center justify-center`}
          style={{ backgroundColor: colormap(currentModapts) }}
        >
          <h2 className="font-mono text-white">{currentModapts}</h2>
        </div>
      </div>
    </div>
  );
};

export default VideoViewer;
