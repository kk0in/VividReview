"use client";

import React, { useState, useEffect, use } from "react";
import PdfViewer from "@/components/dashboard/PdfViewer";
import { useRecoilState, useRecoilValue } from "recoil";
import {
  pdfDataState,
} from "@/app/recoil/DataState";
import { getProject, getPdf, getResult, updateResult } from "@/utils/api";
import { useQuery, useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { PencilIcon, EraserIcon, SelectionIcon } from "@heroicons/react/24/solid";
import Papa from "papaparse";

export default function Page({ params }: { params: { id: string } }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [pdfData, setPdfData] = useRecoilState(pdfDataState);
  const [uploadStatus, setUploadStatus] = useState("");

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
      refetchPdf();
      //   setIsLoaded(true);
    }
  }, [data]);


  const { refetch: refetchPdf, isLoading: loadingPdf } = useQuery(
    ["pdfData", params.id],
    getPdf,
    {
      onSuccess: (data) => {
        const pdfUrl = URL.createObjectURL(data);
        console.log(pdfUrl)
        setPdfData(pdfUrl);
      },
      enabled: false,
    }
  );

  useEffect(() => {
    if (pdfData === "") {
      setIsLoaded(false);
    } else {
      setIsLoaded(true);
    }
  }, [pdfData]);

  useEffect(() => {
    // get project status, if it is not ready, then redirect to home
    // project
  }, []);

  const updateMutation = useMutation(updateResult);

  return (
    <div className="h-full flex flex-col">
      <div className="h-full flex items-center align-center justify-center bg-gray-800 gap-10">
        {!isLoaded && (
          <div className="flex items-center justify-center gap-10">
            <div className="not-prose relative bg-white flex justify-center items-center rounded-xl overflow-hidden w-48 h-60 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
              <div className="relative overflow-auto flex flex-col justify-center items-center h-80 gap-4">
                <PencilIcon className={`h-12 w-12 ${isLoading ? "text-slate-400" : "text-slate-700"}`} />
                <div className={`border-slate-100 dark:border-slate-700 px-4  ${isLoading ? "text-slate-400" : "text-slate-700"} dark:text-slate-400 h-12 flex justify-center items-center text-center`}> {isLoading ? "Loading" : "Loaded" }<br />Project Info{isLoading ? "..." : "" }</div>
              </div>
              <div className="absolute inset-0 pointer-events-none border border-black/5 rounded-xl dark:border-white/5"></div>
            </div>

            <div className="not-prose relative bg-white flex justify-center items-center rounded-xl overflow-hidden w-48 h-60 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
              <div className="relative overflow-auto flex flex-col justify-center items-center h-80 gap-4">
                <EraserIcon className={`h-12 w-12 ${loadingPdf ? "text-slate-400" : "text-slate-700"}`} />
                <div className={`border-slate-100 dark:border-slate-700 px-4  ${loadingPdf ? "text-slate-400" : "text-slate-700"} dark:text-slate-400 h-12 flex justify-center items-center text-center`}> {loadingPdf ? "Loading" : "Loaded" }<br />Video{loadingPdf ? "..." : "" }</div>
              </div>
              <div className="absolute inset-0 pointer-events-none border border-black/5 rounded-xl dark:border-white/5"></div>
            </div>

            <div className="not-prose relative bg-white flex justify-center items-center rounded-xl overflow-hidden w-48 h-60 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
              <div className="relative overflow-auto flex flex-col justify-center items-center h-80 gap-4">
                <SelectionIcon className={`h-12 w-12 ${loadingPdf ? "text-slate-400" : "text-slate-700"}`} />
                <div className={`border-slate-100 dark:border-slate-700 px-4  ${loadingPdf ? "text-slate-400" : "text-slate-700"} dark:text-slate-400 h-12 flex justify-center items-center text-center`}> {loadingPdf ? "Loading" : "Loaded" }<br />Keypoint{loadingPdf ? "..." : "" }</div>
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
              <div className="flex-auto h-full bg-slate-900 p-4 text-white w-[30rem]">
                <div className="flex justify-between mt-1 mb-3 pr-5">
                  <h5 className="my-1 text-sm font-bold">분석 영상</h5>
                </div>
                <PdfViewer pdfSrc={pdfData} />
              </div>
            </div>
          </>
        )}
    </div>
  );
}