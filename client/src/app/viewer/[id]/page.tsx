"use client";

import React, { useState, useEffect, ReactHTMLElement } from "react";
import PdfViewer from "@/components/dashboard/PdfViewer";
import { useRecoilState, useRecoilTransactionObserver_UNSTABLE, useRecoilValue } from "recoil";
import { pdfDataState } from "@/app/recoil/DataState";
import { gridModeState } from "@/app/recoil/ToolState";
import { pdfPageState, tocState, IToCSubsection, tocIndexState, modeState, ViewerMode, matchedParagraphsState } from '@/app/recoil/ViewerState';
import { getProject, getPdf, getTableOfContents, getMatchParagraphs } from "@/utils/api";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import AppBar from "@/components/AppBar";

interface SubSectionTitleProps {
  sectionIndex: number;
  index: number;
  title: string;
  page: number[];
}

interface SectionTitleProps {
  index: number;
  title: string;
  subsections: IToCSubsection[];
}

function SubSectionTitle({ sectionIndex, index, title, page }: SubSectionTitleProps) {
  const [, setPdfPage] = useRecoilState(pdfPageState);
  const [tocIndex, setTocIndexState] = useRecoilState(tocIndexState);

  const handleClick = () => {
    setPdfPage(page[0]);
    setTocIndexState({section: sectionIndex, subsection: index});
  }

  let className = "ml-2 hover:font-bold";
  if (sectionIndex === tocIndex.section && index === tocIndex.subsection) {
    className += " font-bold";
  }

  return (<li className={className} onClick={handleClick} >{`• ${title}`}</li>);
}

function SectionTitle({ index, title, subsections }: SectionTitleProps) {
  let subtitles;
  const [clicked, setClicked] = useState(false);
  const [tocIndex, ] = useRecoilState(tocIndexState);

  const handleSectionClick = () => {
    setClicked(!clicked);
  }

  if (subsections) {
    let subsectionIndex = 0;
    subtitles = (
      <ul>
        {subsections.map((subsection: IToCSubsection) => {
          const element = (<SubSectionTitle sectionIndex={index} index={subsectionIndex} title={subsection.title} page={subsection.page} />);
          subsectionIndex++;
          return element;
        })}
      </ul>
    );
  }

  let className = "text-center hover:font-bold";
  if (index === tocIndex.section) {
    className += " font-bold";
  }

  return (
    <li className="bg-gray-200 pl-3 pr-3 pt-2 pb-2 mb-1 rounded-2xl">
      <p className={className} onClick={handleSectionClick}>
        {`${index + 1}. ${title}`}
      </p>
      {clicked && subsections && (
        <>
          <div className="mb-3" />
          {subtitles}
        </>
      )}
    </li>
  );
}

function ReviewPage({ projectId }: { projectId: string }) {
  const page = useRecoilValue(pdfPageState);
  const gridMode = useRecoilValue(gridModeState);
  const toc = useRecoilValue(tocState);
  const tocIndex = useRecoilValue(tocIndexState);
  const [paragraphs, setParagraphs] = useRecoilState(matchedParagraphsState);

  const fetchMatchedParagraphs = async () => {
    try {
      const paragraphs = await getMatchParagraphs({ queryKey: ["matchParagraphs", projectId] });
      setParagraphs(paragraphs);
      console.log(paragraphs);
    } catch (error) {
      console.error("Failed to fetch paragraphs:", error);
    }
  };

  useEffect(() => {
    fetchMatchedParagraphs();
  }, []);

  const pages: number[] = [];
  switch (gridMode) {
    case 0: {
      pages.push(page);
      break;
    }

    case 1: {
      const section = toc[tocIndex.section];
      const startSubSection = section.subsections[0];
      const endSubSection = section.subsections[section.subsections.length - 1];
      const startIndex = startSubSection.page[0];
      const endIndex = endSubSection.page[endSubSection.page.length - 1];
      const length = endIndex - startIndex + 1
      for (let i = 0; i < length; i++) {
        pages.push(startIndex + i);
      }
      break;
    }

    case 2: {
      const section = toc[tocIndex.section];
      const subsection = section.subsections[tocIndex.subsection];
      for (const page of subsection.page) {
        pages.push(page);
      }
      break;
    }
  }

  const paragraph = [];
  if (paragraphs) {
    for (const page of pages) {
      for (const [key, value] of Object.entries(paragraphs)) {
        if (key === page.toString()) {
          paragraph.push(<p className="font-bold">Page {key} -</p>);
          paragraph.push(<p className="mb-2">{value}</p>);
        }
      }
    }
  }

  return (
    <div className="flex-none w-1/5 bg-gray-50">
      <div className="rounded-t-2xl w-fit bg-gray-200 mt-4 mx-4 py-1 px-3 font-bold">
        Original
      </div>
      <div className="rounded-b-2xl rounded-tr-2xl bg-gray-200 mx-4 p-3">
        {paragraph}
      </div>
    </div>
  );
}

export default function Page({ params }: { params: { id: string } }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [tableOfContents, setTableOfContents] = useRecoilState(tocState);
  const [pdfData, setPdfData] = useRecoilState(pdfDataState);
  const [viewerMode, ] = useRecoilState(modeState);
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
      toc.push(<SectionTitle key={i} index={i} title={tocData[i].title} subsections={tocData[i].subsections} />);
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
          {(viewerMode === ViewerMode.REVIEW) && <ReviewPage projectId={params.id} />}
        </div>
      )}
    </div>
  );
}
