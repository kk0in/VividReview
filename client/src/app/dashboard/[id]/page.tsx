"use client";

import React, { useState, useEffect } from "react";
import VideoViewer from "@/components/dashboard/VideoViewer";
import ModaptsTable from "@/components/dashboard/ModaptsTable";
import KeypointsDrawing from "@/components/dashboard/KeypointsDrawing";
import VideoTimeline from "@/components/dashboard/VideoTimeline";
import { useRecoilState, useRecoilValue } from "recoil";
import {
  csvDataState,
  keypointDataState,
  videoDataState,
} from "@/app/recoil/DataState";
import { getProject, getVideo, getKeypoint, getResult } from "@/utils/api";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

export default function Page({ params }: { params: { id: string } }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [csvData, setCSVData] = useRecoilState(csvDataState);
  const [videoData, setVideoData] = useRecoilState(videoDataState);
  const [keypointData, setKeypointData] = useRecoilState(keypointDataState);

  // GET Project List
  const { data, isError, isLoading, refetch } = useQuery(
    ["getProject", params.id],
    getProject,
    {
      onSuccess: (data) => {
        console.log(data);
      },
      onError: (error) => {
        console.log(error);
      },
      enabled: false,
    }
  );

  useEffect(() => {
    refetch();
  }, []);

  useEffect(() => {
    if (data?.project?.done) {
      refetchVideo();
      refetchCSV();
      refetchKeypoint();
      //   setIsLoaded(true);
    }
  }, [data]);

  const { refetch: refetchVideo, isLoading: loadingVideo } = useQuery(
    ["videoData", params.id],
    getVideo,
    {
      onSuccess: (data) => {
        const videoUrl = URL.createObjectURL(data);
        // console.log(videoUrl)
        setVideoData(videoUrl);
      },
      enabled: false,
    }
  );

  const { refetch: refetchCSV, isLoading: loadingCSV } = useQuery(
    ["csvData", params.id],
    getResult,
    {
      onSuccess: (data) => {
        console.log(data)
        setCSVData(data.result);
        //   const reader = new FileReader();
        //   reader.readAsText(data);
        //   reader.onload = function () {
        //     console.log(reader.result);
        //     let results = Papa.parse(reader.result as string, { header: true });
        //     setCSVData(results.data);
        //   };
      },
      enabled: false,
    }
  );

  const { refetch: refetchKeypoint, isLoading: loadingKeypoint } = useQuery(
    ["keypointData", params.id],
    getKeypoint,
    {
      onSuccess: (data) => {
        console.log(data);
        setKeypointData(data.keypoint);
      },
      enabled: false,
    }
  );

  useEffect(() => {
    if (csvData.length === 0 || videoData === "" || keypointData == null) {
      setIsLoaded(false);
    } else {
      setIsLoaded(true);
    }
  }, [csvData, videoData, keypointData]);

  useEffect(() => {
    // get project status, if it is not ready, then redirect to home
    // project
  }, []);

  return (
    <div className="h-full flex flex-col">
      {isLoading && <div>Loading Project Info...</div>}
      {data?.project?.done === "done" && !isLoaded && (
        <div>
          {loadingVideo && "Loading Video..."}
          <br />
          {loadingKeypoint && "Loading Keypoint..."}
          <br />
          {loadingCSV && "Loading Result..."}
          <br />
        </div>
      )}
      {isError && (
        <div className="mx-auto my-auto">
          <div className="flex flex-col">
            ERROR (Project Not Found or Fetch Error)
            <br />
            <button>
              <Link href="/">GO TO HOME</Link>
            </button>
          </div>
        </div>
      )}
      {!isLoading && !isError && !data?.project?.done && (
        <div className="mx-auto my-auto">
          <div className="flex flex-col">
            Data is not processed yet.
            <br />
            <button>
              <Link href="/">GO TO HOME</Link>
            </button>
          </div>
        </div>
      )}
      {isLoaded && (
        <>
          <div className="flex-grow flex flex-row h-[60%] max-h-1/2">
          <div className="bg-slate-900 p-4 text-white">
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
            <div className="flex-auto h-full bg-slate-900 p-4 text-white w-[30rem]">
              <div className="flex justify-between mt-1 mb-3 pr-5">
                <h5 className="my-1 text-sm font-bold">분석 영상</h5>
              </div>
              <VideoViewer videoSrc={videoData} />
            </div>
            
            <div className="flex-auto bg-slate-900 p-4 text-white">
              <div className="flex justify-between mb-3 pr-5">
                <h5 className="my-1 text-sm font-bold">MODAPTS 테이블</h5>
                <button className="font-mono">
                  {/* <FontAwesomeIcon icon={faFileExport} size="xs" /> */}
                  Export
                </button>
              </div>
              <ModaptsTable csvData={csvData} />
            </div>
          </div>
          <div className="flex-grow bg-slate-900 p-4 text-white h-[40%]">
            <h5 className="my-1 text-sm font-bold">Video Timeline</h5>
            <VideoTimeline />
          </div>
        </>
      )}
    </div>
  );
}
