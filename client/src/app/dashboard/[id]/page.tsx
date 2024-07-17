"use client";

import React, { useState, useEffect } from "react";
import PdfViewer from "@/components/dashboard/PdfViewer";
import { useQuery } from "@tanstack/react-query";
import { getProject, getPdf } from "@/utils/api";
import { PencilIcon, EraserIcon, SelectionIcon } from "@heroicons/react/24/solid";

export default function Page({ params }: { params: { id: string } }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [pdfData, setPdfData] = useState(null);

  // GET Project List
  const { data, isError, isLoading, refetch } = useQuery(
    ["getProject", params.id],
    getProject,
    {
      onSuccess: (data) => {
        // Handle project data if needed
      },
      onError: (error) => {
        // Handle error
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
        setPdfData(pdfUrl);
      },
      enabled: false,
    }
  );

  useEffect(() => {
    if (pdfData) {
      setIsLoaded(true);
    }
  }, [pdfData]);

  return (
    <div className="h-full flex flex-col">
      <div className="h-full flex items-center justify-center bg-gray-800 gap-10">
        {!isLoaded && (
          <div>Loading...</div>
        )}
        {isLoaded && (
          <PdfViewer pdfSrc={pdfData} />
        )}
      </div>
    </div>
  );
}