"use client";

import React, { useState, useEffect } from "react";
import PdfViewer from "@/components/dashboard/PdfViewer";
import { useRecoilState } from "recoil";
import { pdfDataState } from "@/app/recoil/DataState";
import { pdfPageState, subsectionState, tocState, IToCSection, IToCSubsection } from '@/app/recoil/ViewerState';
import { getProject, getPdf, getTableOfContents } from "@/utils/api";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import AppBar from "@/components/AppBar";


function TableItem({ title, subsections }: IToCSection) {
  let subtitles;
  const [clicked, setClicked] = useState(false);
  const [, setPdfPage] = useRecoilState(pdfPageState);
  const [, setSectionState] = useRecoilState(subsectionState);

  const handleSectionClick = () => {
    setClicked(!clicked);
  }

  if (subsections) {
    subtitles = (
      <ul>
        {subsections.map((subsection: IToCSubsection) => {
          return (<li className="ml-2 hover:font-bold" onClick={() => {
            setPdfPage(parseInt(subsection.page[0]));
            setSectionState(subsection);
          }} >{`• ${subsection.title}`}</li>);
        })}
      </ul>
    );
  }
  return (
    <li className="bg-gray-200 pl-3 pr-3 pt-2 pb-2 mb-1 rounded-2xl">
      <p className="text-center hover:font-bold" onClick={handleSectionClick}>{title}</p>
      {clicked && subsections && (
        <>
          <div className="mb-3" />
          {subtitles}
        </>
      )}
    </li>
  );
}

export default function Page({ params }: { params: { id: string } }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [tableOfContents, setTableOfContents] = useRecoilState(tocState);
  const [pdfData, setPdfData] = useRecoilState(pdfDataState);
  const [uploadStatus, setUploadStatus] = useState("");
  // const [history, setHistory] = useState<string[]>([]);
  // const [redoStack, setRedoStack] = useState<string[]>([]);

  const { data, isError, isLoading, refetch } = useQuery(
    ["getProject", params.id],
    getProject,
    {
      onSuccess: (data) => {},
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
        setPdfData(pdfUrl);
      },
      enabled: false,
    }
  );
  
  const fetchTableOfContents = async () => {
    try {
      const tableOfContents = await getTableOfContents({ queryKey: ["tocData", params.id] });
      setTableOfContents(tableOfContents);
      console.log(tableOfContents);
    } catch (error) {
      console.error("Failed to fetch PDF:", error);
    }
  };
  
  useEffect(() => {
    fetchTableOfContents();
  }, []);

  const buildTableOfContents = (tocData: any) => {
    const toc = [];
    for (let i = 0; i < tocData.length; i++) {
      toc.push(<TableItem key={i} title={`${i + 1}. ${tocData[i].title}`} subsections={tocData[i].subsections} />);
    }
    
    return (<ul>{toc}</ul>);
  }

  useEffect(() => {
    if (pdfData === "") {
      setIsLoaded(false);
    } else {
      setIsLoaded(true);
    }
  }, [pdfData]);

  // const handleUndo = () => {
  //   if (history.length === 0) return;
  //   const newHistory = [...history];
  //   const lastDrawing = newHistory.pop();
  //   setHistory(newHistory);
  //   setRedoStack((prev) => [...prev, lastDrawing || '']);
  // };

  // const handleRedo = () => {
  //   if (redoStack.length === 0) return;
  //   const newRedoStack = [...redoStack];
  //   const nextDrawing = newRedoStack.pop();
  //   setRedoStack(newRedoStack);
  //   setHistory((prev) => [...prev, nextDrawing || '']);
  // };

  return (
    <div className="h-full flex flex-col">
      {/* <AppBar onUndo={handleUndo} onRedo={handleRedo} /> */}
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
      {tableOfContents && (
        <div className="flex-grow flex flex-row">
          <div className="flex-none w-1/5 bg-gray-50 p-4">
            <div className="mb-4 font-bold">Table</div>
            <ol>
              {buildTableOfContents(tableOfContents)}
            </ol>
          </div>
          <div className="flex-auto h-full bg-slate-900 p-4 text-white">
            <PdfViewer scale={1.5} projectId={params.id} />
          </div>
        </div>
      )}
    </div>
  );
}
