"use client";

import React, { useState, useRef, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCirclePlay,
  faCirclePause,
  faClockRotateLeft,
} from "@fortawesome/free-solid-svg-icons";
import { currentTimeState } from "../app/recoil/currentTimeState";
import { useRecoilState } from "recoil";

const VideoViewer = ({ currentModapts, videoSrc }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [currentTime, setCurrentTime] = useRecoilState(currentTimeState);

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (video) {
      const newTime = video.currentTime;
      setCurrentTime(newTime);
      const duration = video.duration;
      const calculatedProgress = (newTime / duration) * 100;
      setProgress(calculatedProgress);
    }
  };

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

  const [isPlaying, setIsPlaying] = useState(false);

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
      if (event.key === ' ') {
        handlePlayPause()
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
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

    const formattedTime = `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}:${millisecs
        .toString()
        .padStart(3, "0")
        .substring(0, 2)}`;
    return formattedTime;
  };

  const rewind = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime -= seconds;
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  return (
    <div className="w-[90%]">
      <video ref={videoRef} src={videoSrc} onTimeUpdate={handleTimeUpdate} />

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
          <text className="m-2 font-mono">
            {videoRef.current ? formatTime(currentTime) : "00:00:00"}
          </text>
          <button className="m-2" onClick={() => rewind(-5)}>
            <FontAwesomeIcon
              icon={faClockRotateLeft}
              size="lg"
              flip="horizontal"
            />
          </button>
        </div>

        <div
          className={`w-14 ml-5 rounded-lg flex items-center justify-center ${currentModapts
              ? currentModapts.startsWith("M")
                ? "bg-blue-500"
                : currentModapts.startsWith("G")
                  ? "bg-orange-500"
                  : currentModapts.startsWith("R")
                    ? "bg-green-500"
                    : "bg-red-500"
              : "bg-purple-500"
            }`}
        >
          <h2 className="font-mono text-white">{currentModapts}</h2>
        </div>
      </div>
    </div>
  );
};

export default VideoViewer;
