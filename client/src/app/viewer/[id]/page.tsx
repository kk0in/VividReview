"use client";

import React, { useState, useEffect, use } from "react";
import PdfViewer from "@/components/dashboard/PdfViewer";
import { useRecoilState, useRecoilValue } from "recoil";
import {
  pdfDataState
} from "@/app/recoil/DataState";
import { getProject, getPdf, getKeypoint, getResult, updateResult, getCSV } from "@/utils/api";
import { useQuery, useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { CloudArrowUpIcon, DocumentTextIcon, PencilSquareIcon, FilmIcon, CubeTransparentIcon, ArrowDownOnSquareIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";
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
        console.log("data:", data);
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
        console.log("pdfUrl:", pdfUrl)
        setPdfData(pdfUrl);
        console.log("pdfData:", pdfData);
      },
      enabled: false,
    }
  );


  useEffect(() => {
    if (pdfData === "") {
      setIsLoaded(false);
      console.log("pdfData is empty");
    } else {
      setIsLoaded(true);
      console.log("pdfData is not empty");
    }
  }, [pdfData]);

  useEffect(() => {
    // get project status, if it is not ready, then redirect to home
    // project
  }, []);

  return (
    <div className="h-full flex flex-col">
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
        <div className="flex-grow flex flex-row h-[60%] max-h-1/2">
            <div className="flex-auto h-full bg-slate-900 p-4 text-white w-[30rem]">
              <PdfViewer path={pdfData} scale={1.5} />
            </div>
        </div>
        )}
    </div>
  );
}