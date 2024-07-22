"use client";

import React, { useState, useEffect } from "react";
import PdfViewer from "@/components/dashboard/PdfViewer";
import { useRecoilState } from "recoil";
import { pdfDataState } from "@/app/recoil/DataState";
import { getProject, getPdf } from "@/utils/api";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { PencilIcon, EraserIcon, HighlightIcon, ScissorsIcon } from "@heroicons/react/24/outline";

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
        <div className="flex-grow flex flex-row">
          {/* 목차 뷰 추가 */}
          <div className="flex-none w-1/5 bg-gray-200 p-4">
            <div className="mb-4 font-bold">Table</div>
            <ul>
              <li className="mb-2">1. Introduction</li>
              <li className="mb-2">2. Administrative Issues</li>
              <li className="mb-2">3. Summary</li>
              {/* 추가 목차 항목 */}
            </ul>
          </div>
          {/* PDF Viewer 및 Toolbar */}
          <div className="flex-auto h-full bg-slate-900 p-4 text-white">
            <PdfViewer path={pdfData} scale={1.5} />
          </div>
        </div>
      )}
    </div>
  );
}