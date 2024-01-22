"use client";

import React, { useState, useEffect, use } from "react";
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
import { getProject, getVideo, getKeypoint, getResult, updateResult } from "@/utils/api";
import { useQuery, useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { CloudArrowUpIcon, DocumentTextIcon, PencilSquareIcon, FilmIcon, CubeTransparentIcon } from "@heroicons/react/24/outline";

export default function Page({ params }: { params: { id: string } }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [csvData, setCSVData] = useRecoilState(csvDataState);
  const [videoData, setVideoData] = useRecoilState(videoDataState);
  const [keypointData, setKeypointData] = useRecoilState(keypointDataState);
  const [uploadStatus, setUploadStatus] = useState("");

  // GET Project List
  const { data, isError, isLoading, refetch } = useQuery(
    ["getProject", params.id],
    getProject,
    {
      onSuccess: (data) => {
        // console.log(data);
      },
      onError: (error) => {
        // console.log(error);
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
        setCSVData(data.result);
      },
      enabled: false,
    }
  );

  const { refetch: refetchKeypoint, isLoading: loadingKeypoint } = useQuery(
    ["keypointData", params.id],
    getKeypoint,
    {
      onSuccess: (data) => {
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

  const updateMutation = useMutation(updateResult);

  const handleExportClick = () => {
    // console.log(csvData)
    updateMutation.mutateAsync({project_id: params.id, result: csvData})
    .then((res) => {
      setUploadStatus("Success !")

      setTimeout(() => {
        setUploadStatus("")
      }, 3000);
      
    }).catch((err) => {
      console.log(err);
    })
  }

  return (
    <div className="h-full flex flex-col">
      <div className="h-full flex items-center align-center justify-center bg-gray-800 gap-10">
        {!isLoaded && (
          <div className="flex items-center justify-center gap-10">
            <div className="not-prose relative bg-white flex justify-center items-center rounded-xl overflow-hidden w-48 h-60 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
              <div className="relative overflow-auto flex flex-col justify-center items-center h-80 gap-4">
                <PencilSquareIcon className={`h-12 w-12 ${isLoading ? "text-slate-400" : "text-slate-700"}`} />
                <div className={`border-slate-100 dark:border-slate-700 px-4  ${isLoading ? "text-slate-400" : "text-slate-700"} dark:text-slate-400 h-12 flex justify-center items-center text-center`}> {isLoading ? "Loading" : "Loaded" }<br />Project Info{isLoading ? "..." : "" }</div>
              </div>
              <div className="absolute inset-0 pointer-events-none border border-black/5 rounded-xl dark:border-white/5"></div>
            </div>

            <div className="not-prose relative bg-white flex justify-center items-center rounded-xl overflow-hidden w-48 h-60 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
              <div className="relative overflow-auto flex flex-col justify-center items-center h-80 gap-4">
                <FilmIcon className={`h-12 w-12 ${loadingVideo ? "text-slate-400" : "text-slate-700"}`} />
                <div className={`border-slate-100 dark:border-slate-700 px-4  ${loadingVideo ? "text-slate-400" : "text-slate-700"} dark:text-slate-400 h-12 flex justify-center items-center text-center`}> {loadingVideo ? "Loading" : "Loaded" }<br />Video{loadingVideo ? "..." : "" }</div>
              </div>
              <div className="absolute inset-0 pointer-events-none border border-black/5 rounded-xl dark:border-white/5"></div>
            </div>

            <div className="not-prose relative bg-white flex justify-center items-center rounded-xl overflow-hidden w-48 h-60 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
              <div className="relative overflow-auto flex flex-col justify-center items-center h-80 gap-4">
                <CubeTransparentIcon className={`h-12 w-12 ${loadingKeypoint ? "text-slate-400" : "text-slate-700"}`} />
                <div className={`border-slate-100 dark:border-slate-700 px-4  ${loadingKeypoint ? "text-slate-400" : "text-slate-700"} dark:text-slate-400 h-12 flex justify-center items-center text-center`}> {loadingKeypoint ? "Loading" : "Loaded" }<br />Keypoint{loadingKeypoint ? "..." : "" }</div>
              </div>
              <div className="absolute inset-0 pointer-events-none border border-black/5 rounded-xl dark:border-white/5"></div>
            </div>

            <div className="not-prose relative bg-white flex justify-center items-center rounded-xl overflow-hidden w-48 h-60 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
              <div className="relative overflow-auto flex flex-col justify-center items-center h-80 gap-4">
                <DocumentTextIcon className={`h-12 w-12 ${loadingCSV ? "text-slate-400" : "text-slate-700"}`} />
                <div className={`border-slate-100 dark:border-slate-700 px-4  ${loadingCSV ? "text-slate-400" : "text-slate-700"} dark:text-slate-400 h-12 flex justify-center items-center text-center`}> {loadingCSV ? "Loading" : "Loaded" }<br />Result{loadingCSV ? "..." : "" }</div>
              </div>
              <div className="absolute inset-0 pointer-events-none border border-black/5 rounded-xl dark:border-white/5"></div>
            </div>   
          </div>
          
        )}
        {data?.project?.done === "done" && (
          <div className="flex items-center justify-center gap-10"></div>
        )}
      </div>


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
                <div className="flex justify-between mt-1 mb-3 pr-5">
                  <h5 className="my-1 text-sm font-bold">MODAPTS 테이블</h5>
                  <button className="flex flex-row items-center gap-2 px-2 py-1 hover:bg-slate-600 rounded-md text-sm"
                  onClick={handleExportClick}>
                    {/* <FontAwesomeIcon  icon={faFileExport} size="xs" /> */}
                    <CloudArrowUpIcon className="h-5 w-5 text-white" />
                    {uploadStatus == "" ? 
                    (updateMutation.isLoading ? "Uploading..." : "Save & Upload") :
                    uploadStatus }
                    
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
