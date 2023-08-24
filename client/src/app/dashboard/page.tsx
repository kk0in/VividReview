"use client";
import React, { useState, useEffect } from "react";
import VideoViewer from "../../components/VideoViewer";
import ModaptsTable from "../../components/ModaptsTable";
import KeypointsDrawing from "../../components/KeypointsDrawing";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileExport } from "@fortawesome/free-solid-svg-icons";
import VideoTimeline from "@/components/VideoTimeline";
import { readRemoteFile } from "react-papaparse";

import { useRecoilState, useRecoilValue } from "recoil";
import { csvDataState, videoDataState } from "../recoil/DataState";

export default function Page() {
  // const [csvData, setCSVData] = useState([]);
  const csvFilePath = "/X_fv_0701_MX_0001.csv";
  // const videoSrc = "/0701_MX_0001.mp4";
  // const videoSrc = "/kakao3.mp4";
  // recoil csvDataState
  const [csvData, setCSVData] = useRecoilState(csvDataState);
  const videoData = useRecoilValue(videoDataState);

  // const handleRemoteFile = () => {
  //   readRemoteFile(csvFilePath, {
  //     complete: (results: any) => {
  //       console.log(csvData);
  //       setCSVData(results.data);
  //     },
  //     download: true,
  //     header: true,
  //   });
  // };

  useEffect(() => {
    console.log(csvData);
  }, []);

  const [currentModapts, setcurrentModapts] = useState("null");

  return (
    <div className="h-full flex flex-col">
      <div className="flex-grow flex flex-row h-1/2 max-h-1/2">
        <div className="flex-auto bg-slate-900 p-4 text-white w-[30rem]">
          <div className="flex justify-between mb-3 pr-5">
            <h5 className="my-1 text-sm font-bold">분석 영상</h5>
          </div>
          <VideoViewer currentModapts={currentModapts} videoSrc={videoData} />
        </div>
        <div className="flex-auto bg-slate-900 p-4 text-white">
          <div className="flex justify-between mt-1 mb-3 pr-5">
            <h5 className="my-1 text-sm font-bold">자세 정보</h5>
          </div>
          <h6 className="text-xs my-1">전신 (Wholebody)</h6>
          <KeypointsDrawing position="wholeBody" />
          <div className="flex">
            <div className="mr-2">
              <h6 className="text-xs my-1">좌측 손 (Left Hand)</h6>
              <KeypointsDrawing position="RightHand" />
            </div>
            <div>
              <h6 className="text-xs my-1">우측 손 (Right Hand)</h6>
              <KeypointsDrawing position="LeftHand" />
            </div>
          </div>
        </div>
        <div className="flex-auto bg-slate-900 p-4 text-white">
          <div className="flex justify-between mb-3 pr-5">
            <h5 className="my-1 text-sm font-bold">MODAPTS 테이블</h5>
            <button className="font-mono">
              <FontAwesomeIcon icon={faFileExport} size="xs" />
              Export
            </button>
          </div>
          <ModaptsTable
            csvData={csvData}
            setCSVData={setCSVData}
            setCurrentModapts={setcurrentModapts}
          />
        </div>
      </div>
      
    </div>
  );
}


// <div className="flex-grow bg-slate-900 p-4 text-white h-1/2">
//         <h5 className="my-1 text-sm font-bold">Video Timeline</h5>
//         <VideoTimeline />
//       </div>