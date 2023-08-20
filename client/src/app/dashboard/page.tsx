"use client";
import React, { useState, useEffect } from "react";
import VideoViewer from "../../components/VideoViewer";
import ModaptsTable from "../../components/ModaptsTable";
import KeypointsDrawing from "../../components/KeypointsDrawing";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileExport } from "@fortawesome/free-solid-svg-icons";

export default function Page() {
  const [csvData, setCSVData] = useState([]);
  const csvFilePath = "/kakao.csv";
  const videoSrc = "./kakao3.mp4";
  useEffect(() => {
    async function fetchCSVData() {
      const response = await fetch(csvFilePath);
      const data = await response.text();
      const rows = data.split("\n").map((row) => row.split(","));
      setCSVData(rows);
    }
    fetchCSVData();
  }, []);

  const [currentModapts, setcurrentModapts] = useState("null");

  return (
    <div className="h-full flex flex-col">
      <div className="flex-grow flex flex-row h-1/2 max-h-1/2">
        <div className="flex-auto bg-slate-900 p-4 text-white w-[30rem]">
          <h2 className="my-1">분석 영상</h2>
          <VideoViewer currentModapts={currentModapts} videoSrc={videoSrc} />
        </div>
        <div className="flex-auto bg-slate-900 p-4 text-white">
          <h2>전신</h2>
          <KeypointsDrawing position="wholeBody" />
          <div className="flex">
            <div className="mr-2">
              <h2>좌측 손</h2>
              <KeypointsDrawing position="RightHand" />
            </div>
            <div>
              <h2>우측 손</h2>
              <KeypointsDrawing position="LeftHand" />
            </div>
          </div>
        </div>
        <div className="flex-auto bg-slate-900 p-4 text-white">
          <div className="flex justify-between my-3">
            <h2>Modapts Table</h2>
            <button className="font-mono">
              <FontAwesomeIcon icon={faFileExport} size="xs" />
              Export
            </button>
          </div>
          <ModaptsTable
            csvData={csvData}
            setCurrentModapts={setcurrentModapts}
          />
        </div>
      </div>
      <div className="flex-grow bg-slate-900 p-4 text-white h-1/2">Video Timeline</div>
    </div>
  );
}
