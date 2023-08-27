"use client";

import React, { useState, useEffect } from "react";
import VideoViewer from "@/components/VideoViewer";
import ModaptsTable from "@/components/ModaptsTable";
import KeypointsDrawing from "@/components/KeypointsDrawing";
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
    if (data?.project?.done === "done") {
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

  const { refetch: refetchCSV, isLoading: loadingCSV } = useQuery(["csvData", params.id], getResult, {
    onSuccess: (data) => {
        // console.log(data)
        setCSVData(data.result)
    //   const reader = new FileReader();
    //   reader.readAsText(data);
    //   reader.onload = function () {
    //     console.log(reader.result);
    //     let results = Papa.parse(reader.result as string, { header: true });
    //     setCSVData(results.data);
    //   };
    },
    enabled: false,
  });

  const { refetch: refetchKeypoint, isLoading: loadingKeypoint } = useQuery(
    ["keypointData", params.id],
    getKeypoint,
    {
      onSuccess: (data) => {
        console.log(data)
        setKeypointData(data.keypoint);
      },
      enabled: false,
    }
  );

  //   useEffect(() => {
  //     if (csvData.length === 0 || videoData === "" || keypointData == null) {
  //       setIsLoaded(false);
  //     } else {
  //       setIsLoaded(true);
  //     }
  //   }, [csvData, videoData, keypointData]);

  useEffect(() => {
    // get project status, if it is not ready, then redirect to home
    // project
  }, []);

  return (
    <div className="h-full flex">
        {isLoading && (
        <div>
            Loading Project Info...
        </div>
        )}
      {(data?.project?.done === "done") && (
        <div>
            {loadingVideo && "Loading Video..."}<br/>
            {loadingCSV && "Loading CSV..."}<br/>
            {loadingKeypoint && "Loading Keypoint..."}<br/>
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
      {!isLoading && !isError && data?.project?.done !== "done" && (
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
    </div>
  );
}
