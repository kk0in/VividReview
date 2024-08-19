"use client";

import React, { useState, useEffect, useRef } from "react";
import PdfViewer from "@/components/dashboard/PdfViewer";
import { useRecoilState, useRecoilValue } from "recoil";
import { pdfDataState } from "@/app/recoil/DataState";
import { gridModeState } from "@/app/recoil/ToolState";
import { pdfPageState, tocState, IToCSubsection, tocIndexState, matchedParagraphsState } from '@/app/recoil/ViewerState';
import { getProject, getPdf, getTableOfContents, getMatchParagraphs, getRecording } from "@/utils/api";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import AppBar from "@/components/AppBar";
import { useSearchParams } from "next/navigation";
import { audioTimeState, audioDurationState, playerState, PlayerState, playerRequestState, PlayerRequestType } from "@/app/recoil/LectureAudioState";
import { lassoState, focusedLassoState } from "@/app/recoil/LassoState";

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

interface TabProps {
  title: string;
  onClick: () => void;
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
          const element = (<SubSectionTitle key={index} sectionIndex={index} index={subsectionIndex} title={subsection.title} page={subsection.page} />);
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
  const [currentPlayerState, setPlayerState] = useRecoilState(playerState);
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLProgressElement>(null);
  const [audioSource, setAudioSource] = useState<string>("");
  const [audioDuration, setAudioDuration] = useRecoilState(audioDurationState);
  const [audioTime, setAudioTime] = useRecoilState(audioTimeState);
  const [playerRequest, setPlayerRequest] = useRecoilState(playerRequestState);
  const [activeSubTabIndex, setActiveSubTabIndex] = useState(0);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [lassoRec, setLassoRec] = useRecoilState(lassoState);
  const [focusedLasso, setFocusedLasso] = useRecoilState(focusedLassoState);

  const subTabs: TabProps[] = [
    {
      title: "Original",
      onClick: () => {
        setActiveSubTabIndex(0);
      },
    },
    {
      title: "Processing",
      onClick: () => {
        setActiveSubTabIndex(1);
      },
    },
  ];

  const subTabElements = subTabs.map((tab, idx) => {
    const className = "rounded-t-2xl w-fit py-1 px-4 font-bold " +
      (idx === activeSubTabIndex ? "bg-gray-300/50" : "bg-gray-300");

    return (
      <div className={className}
        onClick={tab.onClick}
      >
        {tab.title}
      </div>
    );
  })

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

  // 음성 파일을 가져오는 함수
  const { data: recordingUrl, refetch: fetchRecording } = useQuery(
    ["getRecording", projectId],
    getRecording,
    {
      enabled: false, // 수동으로 호출
    }
  );

  useEffect(() => {
    const fetchAudio = async () => {
      try {
        const url = await fetchRecording();
        setAudioSource(url.data); // 음성 파일 URL 저장
      } catch (error) {
        console.error("Failed to fetch recording:", error);
      }
    };

    fetchAudio();
  }, [projectId, fetchRecording]);

  useEffect(() => {
    if (audioRef.current === null || !audioSource) {
      return;
    }

    audioRef.current.src = audioSource; // 가져온 음성 파일 URL을 src로 설정
    audioRef.current.onloadedmetadata = () => {
      if (audioRef.current) {
        console.log(audioRef.current.duration);
        setAudioDuration(audioRef.current.duration);

        progressRef.current!.max = audioRef.current.duration;
      }
    };
  }, [audioSource]);

  useEffect(() => {
    if (audioRef.current === null || !audioSource) {
      return;
    }

    audioRef.current.ontimeupdate = () => {
      if (!isMouseDown && audioRef.current) {
        progressRef.current!.value = audioRef.current.currentTime;
      }
    };
  }, [audioRef.current?.currentTime, isMouseDown]);

  useEffect(() => {
    if (progressRef.current === null) {
      return;
    }

    const getNewProgressValue = (event: MouseEvent) => {
      return (event.offsetX / progressRef.current!.offsetWidth) * audioRef.current!.duration;
    }

    progressRef.current.onmousedown = (event) => {
      console.log('mousedown', event.offsetX);
      progressRef.current!.value = getNewProgressValue(event);
      setIsMouseDown(true);
    };

    progressRef.current.onmousemove = (event) => {
      if (isMouseDown && progressRef.current) {
        progressRef.current.value = getNewProgressValue(event);
      }
    };

    progressRef.current.onmouseup = (event) => {
      console.log('mouseup', progressRef.current!.offsetWidth, event.offsetX);
      audioRef.current!.currentTime = getNewProgressValue(event);
      setIsMouseDown(false);
    };
  }, [progressRef, isMouseDown]);

  useEffect(() => {
    if (audioRef.current === null || !audioSource) {
      return;
    }

    switch (currentPlayerState) {
      case PlayerState.PLAYING:
        audioRef.current.currentTime = audioTime;
        audioRef.current.play();
        break;

      case PlayerState.PAUSED:
        audioRef.current.pause();
        setAudioTime(audioRef.current.currentTime);
        break;

      case PlayerState.IDLE:
        setAudioTime(0);
        audioRef.current.pause();
        break;
    }
  }, [currentPlayerState]);

  useEffect(() => {
    if (audioRef.current === null) {
      return;
    }

    switch (playerRequest) {
      case PlayerRequestType.BACKWARD:
        audioRef.current.currentTime -= 5;
        setPlayerRequest(PlayerRequestType.NONE);
        break;

      case PlayerRequestType.FORWARD:
        audioRef.current.currentTime += 5;
        setPlayerRequest(PlayerRequestType.NONE);
        break;
    }
  }, [playerRequest]);

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
      <div className="rounded-t-2xl w-fit bg-gray-200 mt-4 mx-4 py-1 px-4 font-bold">
        Script
      </div>
      <div className="rounded-b-2xl rounded-tr-2xl bg-gray-200 mx-4 p-3">
        <div className="flex flex-row">
          {subTabElements}
        </div>
        <div className="rounded-b-2xl rounded-tr-2xl bg-gray-300/50 p-3">
          {paragraph}
        </div>
      </div>
      <div className="w-full mt-4 px-4">
        <audio ref={audioRef}/>
        <progress ref={progressRef} className="w-full" />
      </div>
    </div>
  );
}

export default function Page({ params }: { params: { id: string } }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [tableOfContents, setTableOfContents] = useRecoilState(tocState);
  const [pdfData, setPdfData] = useRecoilState(pdfDataState);
  const [uploadStatus, setUploadStatus] = useState("");
  // const [history, setHistory] = useState<string[]>([]);
  // const [redoStack, setRedoStack] = useState<string[]>([]);
  const isReviewMode = useSearchParams().get('mode') === 'review';

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
          {(isReviewMode && <ReviewPage projectId={params.id} />)}
        </div>
      )}
    </div>
  );
}
