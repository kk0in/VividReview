"use client";

import React, { useState, useEffect, useRef, Fragment, useCallback } from "react";
import PdfViewer from "@/components/dashboard/PdfViewer";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import { pdfDataState } from "@/app/recoil/DataState";
import { gridModeState, searchQueryState, inputTextState, searchTypeState, isSaveClickedState } from "@/app/recoil/ToolState";
import { pdfPageState, tocState, IToCSubsection, tocIndexState, matchedParagraphsState, scriptModeState, processingState, ProcessingType } from '@/app/recoil/ViewerState';
import { getProject, getPdf, getTableOfContents, getMatchParagraphs, getRecording, getBbox, getKeywords, getPageInfo, getProsody, searchQuery, getSearchResult, getRawImages, getAnnotatedImages, saveSearchSet, getSemanticSearchSets, getKeywordSearchSets, lassoPrompts, getLassosOnPage, getLassoAnswers, getMissedAndImportantParts } from "@/utils/api";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";
import ArousalGraph from "@/components/dashboard/ArousalGraph";
import SearchModal from "@/components/dashboard/SearchModal";
import { useSearchParams } from "next/navigation";
import {
  playerState,
  PlayerStateType,
  playerRequestState,
  PlayerRequestType,
  progressValueState,
  navigationState,
  audioTimeState,
  NavigationStateType,
  audioDurationState,
} from "@/app/recoil/LectureAudioState";
import {
  focusedLassoState,
  reloadFlagState,
  rerenderFlagState,
  activePromptState,
  defaultPrompts
} from "@/app/recoil/LassoState";
import PromptDisplay from "@/components/dashboard/PromptDisplay";

import { Pie } from 'react-chartjs-2';
import { Chart, ArcElement, Tooltip, Legend } from 'chart.js';
Chart.register(ArcElement, Tooltip, Legend);

import {
  ToggleSwitch
} from "@/components/dashboard/GraphComponent"
import { calibratePrecision, findPage, findTimeRange, findTocIndex } from "@/utils/lecture";

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

interface IScript {
  page: number;
  keyword: string[];
  formal: string;
  original: string;
}

function SubSectionTitle({
  sectionIndex,
  index,
  title,
  page,
}: SubSectionTitleProps) {
  const setPdfPage = useSetRecoilState(pdfPageState);
  const [tocIndex, setTocIndexState] = useRecoilState(tocIndexState);

  const handleClick = () => {
    setPdfPage(page[0]);
    setTocIndexState({ section: sectionIndex, subsection: index });
  };

  const className =
    "ml-3 hover:font-bold " +
    (sectionIndex === tocIndex.section &&
      index === tocIndex.subsection &&
      "font-bold");
  return <li className={className} onClick={handleClick}>{`• ${title}`}</li>;
}

function SectionTitle({ index, title, subsections }: SectionTitleProps) {
  const tocIndex = useRecoilValue(tocIndexState);

  const [clicked, setClicked] = useState(false);

  const handleSectionClick = () => setClicked(!clicked);

  let subsectionIndex = 0;
  const subTitleElements = (
    <ul>
      {subsections?.map((subsection: IToCSubsection) => (
        <SubSectionTitle
          key={`${index}-${subsectionIndex}`}
          sectionIndex={index}
          index={subsectionIndex++}
          title={subsection.title}
          page={subsection.page}
        />
      ))}
    </ul>
  );

  const className =
    "flex hover:font-bold " + (index === tocIndex.section && "font-extrabold ");

  const cardStyle =
    "px-3 py-2 rounded-lg text-xs " +
    (index === tocIndex.section
      ? " bg-slate-600 shadow-lg my-2 border-green-200 border-3 text-white"
      : " mb-[0.3rem] border-1 bg-white");
  return (
    <li className={cardStyle}>
      <p className={className} onClick={handleSectionClick}>
        <div>{index + 1}.</div>
        <div className="pl-1">{title}</div>
      </p>
      {clicked && subsections && <div className="mt-3">{subTitleElements}</div>}
    </li>
  );
}

function ScriptTabPage({pages, scripts}: {pages: number[], scripts: IScript[]}) {
  const [focusedTabIndex, setFocusedTabIndex] = useState(0);
  
  const subTabs: TabProps[] = [
    {
      title: "Original",
      onClick: () => {
        setFocusedTabIndex(0);
      },
    },
    {
      title: "Processing",
      onClick: () => {
        setFocusedTabIndex(1);
      },
    },
  ];

  const subTabElements = subTabs.map((tab, idx) => {
    const className =
      "rounded-t-lg w-fit py-1 px-3 " +
      (idx === focusedTabIndex ? "font-bold bg-white" : "bg-gray-200");

    return (
      <div className={className} onClick={tab.onClick} key={"subtab-" + idx}>
        {tab.title}
      </div>
    );
  });

  const preprocessText = (text: string, keywords: string[]) => {
    const highlightKeywords = (text: string, keywords: string[]) => {
      let result = text;
      for (const keyword of keywords) {
        result = result.replace(
          new RegExp(keyword, "gi"),
          (text) => `<span class="text-red-600 font-bold">${text}</span>`
        );
      }
      return result;
    };

    const processedHTML = text ? text.replace(/- (.*?)(\n|$)/g, "• $1\n")
                                     .replace(/\n/g, "<br />")
                                     .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                                     .replace(/  /g, "\u00a0\u00a0") : "";
    return highlightKeywords(processedHTML, keywords);
  };

  const paragraph = pages.map((page) => {
    const script = scripts.find((script) => script.page === page);
    if (script === undefined) {
      return (<></>);
    }

    const processedHTML = focusedTabIndex === 0 ?
      preprocessText(script.original, script.keyword) :
      preprocessText(script.formal, script.keyword);

    return (
      <Fragment key={page}>
        <p className="font-bold text-sm">Page {script.page} -</p>
        <p className="mb-2" dangerouslySetInnerHTML={{ __html: processedHTML }} />
      </Fragment>
    );
  });

  return (
    <div className="relative mr-3 mt-3 pb-1 z-10">
      <div className="flex flex-row overflow-x-auto ">
        {subTabElements}
      </div>
      <div className="bg-white p-2 font-serif text-xs leading-5">
        {paragraph}
      </div>
    </div>
  );
}

function PromptTabPage({projectId, page}: {projectId: string, page: number}) {
  const [activePromptIndex, setActivePromptIndex] = useRecoilState(activePromptState);
  const [focusedLasso, setFocusedLasso] = useRecoilState(focusedLassoState);
  const [rerenderFlag, setRerenderFlag] = useRecoilState(rerenderFlagState);
  const reloadFlag = useRecoilValue(reloadFlagState);
  const setProcessing = useSetRecoilState(processingState);
  const lassos = useRef<{lasso_id: number, name: string}[]>([]);
  const answers = useRef<string[]>([]);
  const prompts = useRef<string[]>(defaultPrompts.map((prompt) => prompt.prompt));

  useEffect(() => {
    const fetchLassos = async () => {
      console.log("fetching lassos");
      const response: {lasso_id: number, name: string}[] = await getLassosOnPage(projectId, page);
      lassos.current = response.sort((a, b) => b.lasso_id - a.lasso_id);
    }

    const fetchPrompts = async () => {
      await fetchLassos();
      if(focusedLasso === null){
        console.log("focus lasso is null");
        if(lassos.current.length > 0) setFocusedLasso(lassos.current[0].lasso_id);
        prompts.current = defaultPrompts.map((prompt) => prompt.prompt);
        return;
      }
      console.log("fetching prompts");

      const response = await lassoPrompts(projectId, page, focusedLasso);
      prompts.current = response;
    }

    const fetchAnswers = async () => {
      await fetchPrompts();

      if(focusedLasso === null) {
        console.log("focus lasso is null");
        answers.current = [];
        return;
      }
      
      console.log("fetching answers");

      try {
        console.log(prompts.current, activePromptIndex, activePromptIndex[1]);
        setProcessing({type: ProcessingType.LASSO_LOADING_ANSWER, message: "Loading answer..."});
        const response = await getLassoAnswers(projectId, page, focusedLasso, activePromptIndex[1]);
        setProcessing({type: ProcessingType.NONE, message: ""});
        console.log("fetched answers", response);
        answers.current = response.map((result: {caption: string, result: string}) => result.result);
        console.log("mapped answers", answers.current);
      } catch (e) {
        console.log("Failed to fetch answers:", e);
        alert("Failed to load answers");
        setProcessing({type: ProcessingType.NONE, message: ""});
        answers.current = [];
      }
      setRerenderFlag((prev) => !prev);
    }

    fetchAnswers();
  }, [projectId, page, focusedLasso, activePromptIndex, reloadFlag, setRerenderFlag]);

  const lassoTabElements = lassos.current.map((lasso, idx) => {
    const className =
      "rounded grow py-1 px-3 " +
      (idx === activePromptIndex[0]
        ? "bg-slate-500 text-white shadow-lg font-bold "
        : "bg-slate-200")

    return (
      <div
        className={className}
        onClick={() => {
          setActivePromptIndex([idx, activePromptIndex[1], 0]);
          setFocusedLasso(lasso.lasso_id);
        }}
        key={"sublasso-" + idx}
      >
        {idx === activePromptIndex[0]
          ? lasso.name
          : lasso.name.slice(0, 5) + "..."}
      </div>
    );
  });

  const promptTabElements = (lassos.current.length === 0 || focusedLasso === null ? [] :
    prompts.current.map((prompt, idx) => {
      const className =
        "rounded-t-lg w-fit py-1 px-3 " +
        (prompt === activePromptIndex[1] ? "font-bold bg-white" : "bg-gray-200");
      
      return (
        <div className={className}
          onClick = {() => {setActivePromptIndex([activePromptIndex[0], prompt, 0]);}}
          key={"subprompt-"+idx}
        >
          {prompt}
        </div>
      )
    }));

  return (
    <div className="relative mr-3 mt-3 z-10">
      <div className="flex flex-row overflow-x-auto">
        {lassoTabElements}
      </div>
      <div className="realtive mt-3">
        <div className="flex flex-row overflow-x-auto">
          {promptTabElements}
        </div>
        <div className="bg-white py-2 font-serif text-xs leading-5">
          <PromptDisplay
            answers={answers.current}
            projectId={projectId}
            page={page}
            focusedLasso={focusedLasso!}
            prompts={prompts.current}
            rerenderFlag={rerenderFlag}
          />
        </div>
      </div>
    </div>
  );
}

function ReviewPage({
  projectId,
  spotlightRef,
  audioRef,
  progressRef,
  page,
  pageInfo,
  pages,
  setPage,
  setPages,
  tocIndex,
  setTocIndex,
}: {
  projectId: string;
  spotlightRef: React.RefObject<HTMLCanvasElement>;
  audioRef: React.RefObject<HTMLAudioElement>;
  progressRef: React.RefObject<HTMLProgressElement>;
  page: number;
  pageInfo: any;
  pages: number[];
  setPage: (page: number) => void;
  setPages: (pages: any) => void;
  tocIndex: any;
  setTocIndex: (tocIndex: any) => void;
}) {
  const gridMode = useRecoilValue(gridModeState);
  const toc = useRecoilValue(tocState);
  // const [tocIndex, setTocIndex] = useRecoilState(tocIndexState);
  const [paragraphs, setParagraphs] = useRecoilState(matchedParagraphsState);
  const [currentPlayerState, setPlayerState] = useRecoilState(playerState);
  const [audioSource, setAudioSource] = useState<string>("");
  const [playerRequest, setPlayerRequest] = useRecoilState(playerRequestState);
  const [focusedLasso, setFocusedLasso] = useRecoilState(focusedLassoState);
  const [scripts, setScripts] = useState<IScript[]>([]);
  const [timeline, setTimeline] = useState<{ start: number; end: number }>({
    start: 0,
    end: 0,
  });
  const bboxList = useRef<any[]>([]);
  const pdfWidth = useRef(0);
  const pdfHeight = useRef(0);
  const bboxIndex = useRef(-1);
  const [scriptMode, setScriptMode] = useRecoilState(scriptModeState);
  const [currentNavigation, setNavigation] = useRecoilState(navigationState);
  const currentAudioTime = useRecoilValue(audioTimeState);
  const setProgressValue = useSetRecoilState(progressValueState);
  const setAudioDuration = useSetRecoilState(audioDurationState);

  const fetchMatchedParagraphs = async () => {
    try {
      const paragraphs = await getMatchParagraphs({
        queryKey: ["matchParagraphs", projectId],
      });
      setParagraphs(paragraphs);
      console.log("paragraphs:", paragraphs);
    } catch (error) {
      console.error("Failed to fetch paragraphs:", error);
    }
  };

  useEffect(() => {
    fetchMatchedParagraphs();
  }, []);

  useEffect(() => {
    const fetchKeywords = async () => {
      try {
        if (paragraphs === null) {
          return;
        }

        for (let i = 1; i <= Object.keys(paragraphs).length; i++) {
          const keywords = await getKeywords({
            queryKey: ["getKeywords", projectId, i.toString()],
          });
          keywords.page = i;
          setScripts((prev) => [...prev, keywords]);
        }
      } catch (error) {
        console.error("Failed to fetch keywords:", error);
      }
    };

    fetchKeywords();
  }, [paragraphs]);

  useEffect(() => {
    // Bbox 가져오기
    const getBboxes = async () => {
      const bboxes = await getBbox({
        queryKey: ["getBbox", projectId, String(page)],
      });
      pdfWidth.current = bboxes.image_size.width;
      pdfHeight.current = bboxes.image_size.height;
      bboxList.current = bboxes.bboxes;
    };
    bboxIndex.current = -1;
    getBboxes();
  }, [projectId, page]);

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
    if (audioRef.current === null || progressRef.current === null) { return; }
    const audio = audioRef.current;
    const progress = progressRef.current;

    audio.src = audioSource; // 가져온 음성 파일 URL을 src로 설정
    audio.onloadedmetadata = () => {
      console.log("Audio is loaded", audio.duration);
      progress.max = audio.duration;
      setAudioDuration(audio.duration);
    };
  }, [audioSource]);
  
  useEffect(() => {
    const newTimeline = findTimeRange(page, pageInfo, gridMode, toc, tocIndex);
    console.log("newTimeline", newTimeline, page);
    if (currentNavigation === NavigationStateType.PAGE_CHANGED) {
      setProgressValue(newTimeline.start);
      setNavigation(NavigationStateType.NAVIGATION_COMPLETE);
    }
    setTimeline(newTimeline);
  }, [pageInfo, page, gridMode, currentNavigation]);

  useEffect(() => {
    if (audioRef.current === null ) { return; }
    const audio = audioRef.current;
    const handleAudio = () => {
      if (
        currentNavigation !== NavigationStateType.PAGE_CHANGED &&
        audio.currentTime > timeline.end
      ) {
        console.log("Time is up", audio.currentTime, timeline.end);
        setPlayerState(PlayerStateType.PAUSED);
        return;
      }

      const currentPageTimeline = pageInfo[page];
      if (currentPageTimeline) {
        if (!audio.paused && audio.currentTime > currentPageTimeline.end) {
          const newPage = findPage(audio.currentTime, pageInfo);
          const newTocIndex = findTocIndex(newPage, toc);

          (newTocIndex && newTocIndex !== tocIndex) && setTocIndex(newTocIndex);
          setPage(newPage);
        }
      }
    }

    const handleHighlightBox = () => {
      if (gridMode !== 0) return;

      const ignoreSpotlightThreshold = 0.5; // change value to ignore short spotlights

      if (currentNavigation === NavigationStateType.NONE && !audio.paused) {
        let changeIndexFlag = false;
        for (let i = 0; i < bboxList.current.length; i++) {
          if (
            currentAudioTime >= bboxList.current[i].start &&
            currentAudioTime < bboxList.current[i].end
          ) {
            if (i !== bboxIndex.current) {
              bboxIndex.current = i;
              changeIndexFlag = true;
            }
            break;
          }
        }
        if (!changeIndexFlag) return;

        const bboxObj = bboxList.current[bboxIndex.current];
        const bbox = bboxObj.bbox;

        const canvas = spotlightRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;
        if (bboxObj.end - bboxObj.start < ignoreSpotlightThreshold) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 중심점 계산
        const centerX =
          ((bbox[0] + bbox[2] / 2) / pdfWidth.current) * canvas.width;
        const centerY =
          ((bbox[1] + bbox[3] / 2) / pdfHeight.current) * canvas.height;

        // 그라디언트 생성
        const maxRadius = Math.max(canvas.width, canvas.height) / 1.2; 
        const gradient = ctx.createRadialGradient(
          centerX,
          centerY,
          0,
          centerX,
          centerY,
          maxRadius
        );

        // 그라디언트 색상 단계 설정
        gradient.addColorStop(0, "rgba(0, 0, 0, 0)"); // 중심부 투명
        gradient.addColorStop(0.7, "rgba(0, 0, 0, 0.3)"); // 중심에서 조금 떨어진 부분
        gradient.addColorStop(0.9, "rgba(0, 0, 0, 0.5)"); // 중심에서 조금 떨어진 부분
        gradient.addColorStop(1, "rgba(0, 0, 0, 0.7)"); // 외곽부는 어두운 명암

        // ctx.fillStyle = gradient;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.clearRect(
          bbox[0] / pdfWidth.current * canvas.width,
          bbox[1] / pdfHeight.current * canvas.width,
          (bbox[2]*3) / pdfWidth.current * canvas.width,
          (bbox[3]*3) / pdfHeight.current * canvas.height);
        const timeout = (bboxObj.end - bboxObj.start) > 5.5 ? 5000 : ((bboxObj.end - bboxObj.start - 0.5) * 1000);
        setTimeout(() => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }, timeout);
      }
    };

    audio.addEventListener("timeupdate", handleAudio);
    audio.addEventListener("timeupdate", handleHighlightBox);

    return () => {
      audio.removeEventListener("timeupdate", handleAudio);
      audio.removeEventListener("timeupdate", handleHighlightBox);
    };
  }, [currentAudioTime, page, pageInfo]);

  useEffect(() => {
    if (audioRef.current === null) { return; }
    const audio = audioRef.current;

    switch (currentPlayerState) {
      case PlayerStateType.PLAYING: {
        console.log("PLAYING", timeline);
        audio.play();
        break;
      }

      case PlayerStateType.PAUSED: {
        console.log("PAUSED", timeline);
        if (audio.currentTime > timeline.end) {
          audio.currentTime = timeline.start;
        }
        audio.pause();
        break;
      }

      case PlayerStateType.IDLE: {
        console.log("IDLE");
        break;
      }
    }
  }, [currentPlayerState]);

  useEffect(() => {
    if (audioRef.current === null) {
      return;
    }

    switch (playerRequest) {
      case PlayerRequestType.BACKWARD:
        setProgressValue(currentAudioTime - 5);
        setNavigation(NavigationStateType.NAVIGATION_COMPLETE);
        setPlayerRequest(PlayerRequestType.NONE);
        break;

      case PlayerRequestType.FORWARD:
        setProgressValue(currentAudioTime + 5);
        setNavigation(NavigationStateType.NAVIGATION_COMPLETE);
        setPlayerRequest(PlayerRequestType.NONE);
        break;
    }
  }, [playerRequest]);

  useEffect(() => {
    const pages_ = [];
    switch (gridMode) {
      case 0: {
        pages_.push(page);
        break;
      }

      case 1: {
        const section = toc[tocIndex.section];
        const startSubSection = section.subsections[0];
        const endSubSection =
          section.subsections[section.subsections.length - 1];
        const startIndex = startSubSection.page[0];
        const endIndex = endSubSection.page[endSubSection.page.length - 1];
        const length = endIndex - startIndex + 1;
        for (let i = 0; i < length; i++) {
          pages_.push(startIndex + i);
        }
        break;
      }

      case 2: {
        const section = toc[tocIndex.section];
        const subsection = section.subsections[tocIndex.subsection];
        for (const page of subsection.page) {
          pages_.push(page);
        }
        break;
      }
    }

    setPages(pages_);
  }, [gridMode, page, tocIndex]);

  return (
    <div className="flex-none w-1/5 bg-slate-100 overflow-y-auto h-[calc(100vh-3rem)]">
      <div className="flex pr-3 mt-3">
        <div
          className={
            "rounded w-1/2 text-center z-0 py-1 px-4 " +
            (scriptMode === "script"
              ? "bg-slate-500 text-white shadow-lg font-bold "
              : "bg-slate-200")
          }
          onClick={() => {
            setScriptMode("script");
            setFocusedLasso(null);
          }}
        >
          Script
        </div>
        <div
          className={
            "rounded w-1/2 text-center z-0 py-1 px-4 " +
            (scriptMode === "prompts"
              ? "bg-slate-500 text-white shadow-lg font-bold"
              : "bg-slate-200")
          }
          onClick={() => {
            setScriptMode("prompts");
          }}
        >
          Prompts
        </div>
      </div>
      {scriptMode === "script" ? (
        <ScriptTabPage pages={pages} scripts={scripts} />
      ) : (
        <PromptTabPage projectId={projectId} page={page} />
      )}
    </div>
  );
}

export default function Page({ params }: { params: { id: string } }) {
  const projectId = params.id;
  const { query, type } = useRecoilValue(searchQueryState); // Recoil에서 검색어와 타입 가져오기
  const [searchId, setSearchId] = useState<string | null>(null);
  const [queryResult, setQueryResult] = useState(null);
  const [rawImages, setRawImages] = useState<string[]>([]); 
  const [annotatedImages, setAnnotatedImages] = useState<{image: string, dimensions: [number, number]}[]>([]); 
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set()); // 선택된 페이지들
  const [semanticSearchSets, setSemanticSearchSets] = useState<{search_id: number, query: string}[]>([]);
  const [keywordSearchSets, setKeywordSearchSets] = useState<{search_id: number, query: string}[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [tableOfContents, setTableOfContents] = useRecoilState(tocState);
  const [pdfData, setPdfData] = useRecoilState(pdfDataState);
  const [page, setPage] = useRecoilState(pdfPageState);
  const [pageInfo, setPageInfo] = useState({});
  const [tocIndex, setTocIndex] = useRecoilState(tocIndexState);

  const [threeStarPages, setThreeStarPages] = useState<any[]>([]);
  const [twoStarPages, setTwoStarPages] = useState<any[]>([]);
  const [oneStarPages, setOneStarPages] = useState<any[]>([]);
  const [selectedSearchId, setSelectedSearchId] = useState(null); // 선택된 search_id
  const [selectedSearchType, setSelectedSearchType] = useState<string>(''); 
  const [seletedSearchQuery, setSelectedSearchQuery] = useState<string>(''); 
  const [pageList, setPageList] = useState([]);
  const [previousQuery, setPreviousQuery] = useState<string | null>(null);
  const setInputText = useSetRecoilState(inputTextState);
  const setSearchQuery = useSetRecoilState(searchQueryState); // Recoil 상태 업데이트 함수
  const [queryText, setQueryText] = useState("")

  const [toggleScript, setToggleScript] = useState(true);
  const [togglePdfText, setTogglePdfText] = useState(true);
  const [togglePdfImage, setTogglePdfImage] = useState(true);
  const [toggleAnnotation, setToggleAnnotation] = useState(true);

  const [pieChartData, setPieChartData] = useState<{ [key: number]: any }>({});
  const [showPieChart, setShowPieChart] = useState<{ [key: number]: boolean }>({});

  const [scriptPages, setScriptPages] = useState<string[]>([]);
  const [pdfTextPages, setPdfTextPages] = useState<string[]>([]);
  const [annotationPages, setAnnotationPages] = useState<string[]>([]);
  const [currentProcessing, setProcessing] = useRecoilState(processingState);
  const setCurrentAudioTime = useSetRecoilState(audioTimeState); 
  const [progressValue, setProgressValue] = useRecoilState(progressValueState);
  const [currentNavigation, setCurrentNavigation] = useRecoilState(navigationState);

  // const [history, setHistory] = useState<string[]>([]);
  // const [redoStack, setRedoStack] = useState<string[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLProgressElement>(null);
  const toc = useRecoilValue(tocState);

  const [isSaveButtonDisabled, setIsSaveButtonDisabled] = useState(true);
  const isSaveClicked = useRecoilValue(isSaveClickedState);

  const [pageStartTime, setpageStartTime] = useState(0);
  const [pageEndTime, setpageEndTime] = useState(100);

  const [prosodyData, setProsodyData] = useState<any>(null);
  const [missedAndImportantParts, setMisssedAndImportantParts] = useState<any>(null);
  const [positiveEmotion, setpositiveEmotion] = useState([
    "Excitement",
    "Interest",
    "Amusement",
    "Joy",
  ]);
  const [negativeEmotion, setnegativeEmotion] = useState([
    "Calmness",
    "Boredom",
    "Tiredness",
  ]);
  const [pages, setPages] = useState([]);
  const isReviewMode = useSearchParams().get("mode") === "review";
  const spotlightRef = useRef<HTMLCanvasElement>(null);

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
    if (currentNavigation === NavigationStateType.NAVIGATION_COMPLETE && audioRef.current !== null) {
      const audio = audioRef.current;
      audio.currentTime = progressValue;
      setCurrentNavigation(NavigationStateType.NONE);
      
      const newPage = findPage(progressValue, pageInfo);
      const newTocIndex = findTocIndex(newPage, toc);
      newTocIndex && newTocIndex !== tocIndex && setTocIndex(newTocIndex);
      newPage > 0 && setPage(newPage);
    }
  }, [progressValue, currentNavigation]);

  useEffect(() => {
    if (audioRef.current === null) {
      return;
    }

    const audio = audioRef.current;
    const handleAudioTimeUpdate = () => {
      const audioValue = calibratePrecision(audio.currentTime);
      setCurrentAudioTime(audioValue);
      (currentNavigation === NavigationStateType.NONE) && setProgressValue(audioValue);
    };

    audio.addEventListener("timeupdate", handleAudioTimeUpdate);

    return () => {
      audio.removeEventListener("timeupdate", handleAudioTimeUpdate);
    };
  }, [audioRef.current?.currentTime, currentNavigation]);

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
      const tableOfContents = await getTableOfContents({
        queryKey: ["tocData", params.id],
      });
      setTableOfContents(tableOfContents);
      console.log(tableOfContents);
    } catch (error) {
      console.error("Failed to fetch PDF:", error);
    }
  };

  const buildTableOfContents = (tocData: any) => {
    const toc = [];
    for (let i = 0; i < tocData.length; i++) {
      toc.push(
        <SectionTitle
          key={i}
          index={i}
          title={tocData[i].title}
          subsections={tocData[i].subsections}
        />
      );
    }

    return <ul>{toc}</ul>;
  };

  const fetchPageInfo = async () => {
    try {
      const pageInfo = await getPageInfo({
        queryKey: ["getPageInfo", params.id],
      });
      setPageInfo(pageInfo);
      console.log(pageInfo);
    } catch (error) {
      console.error("Failed to fetch page information:", error);
    }
  };

  // Prosody 정보를 가져오는 함수
  const fetchProsody = async () => {
    try {
      const result = await getProsody({ queryKey: ["getProsody", params.id] });
      setProsodyData(result);
    } catch (error) {
      console.error("Failed to fetch prosody:", error);
    }
  };

  // Missed and Important Parts 정보를 가져오는 함수
  const fetchMissedAndImportantParts = async () => {
    try{
      const result = await getMissedAndImportantParts(params.id);
      setMisssedAndImportantParts(result);
    }catch(error){
      console.error("Failed to fetch missed data:", error);
    }
  };

  useEffect(() => {
    fetchTableOfContents();
    fetchProsody();
    fetchPageInfo();
    fetchMissedAndImportantParts();
  }, []);

  useEffect(() => {
    if (pdfData === "") {
      setIsLoaded(false);
    } else {
      setIsLoaded(true);
    }
  }, [pdfData]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [graphWidth, setGraphWidth] = useState(0);
  const [graphHeight, setGraphHeight] = useState(0);

  const setSize = () => {
    setTimeout(() => {
      if (!containerRef.current) return;
      console.log(containerRef.current.offsetWidth);
      setGraphWidth(containerRef.current.offsetWidth);
      setGraphHeight(containerRef.current.offsetHeight);
    }, 30);
  };
  useEffect(setSize, []);

  const { data: searchResult, refetch: fetchSearchResult } = useQuery(
    ["getSearchResult", projectId, searchId, type],
    getSearchResult,
    {
      enabled: !!searchId, // searchId가 있을 때만 실행
      onSuccess: (data) => {
        setQueryResult(data);
        // setIsModalOpen(true);
        console.log('query:', query)
        console.log('previousQuery:', previousQuery)
        if (query !== previousQuery) {
          setIsModalOpen(true);
          setPreviousQuery(query); // 현재 검색어를 이전 검색어로 저장
          // setHasOpenedModal(true); // 모달이 열렸음을 기록
        }

      },
      onError: (error) => {
        console.error("Error fetching search results:", error);
      },
    }
  );

  // 모달이 닫힐 때 상태 초기화
  const handleCloseModal = () => {
    setIsModalOpen(false);
    // setHasOpenedModal(false); // 모달이 닫히면 다시 열릴 수 있도록 상태 초기화
    setSelectedSearchId(null); // 선택된 search_id 초기화
  };

  // getImages API 호출
  const { data: fetchedRawImages, refetch: fetchRawImages } = useQuery(
    ["getRawImages", params.id],
    () => getRawImages(params.id),
    {
      enabled: true, // 항상 호출
      onSuccess: (data) => {
        setRawImages(data);
      },
      onError: (error) => {
        console.error("Error fetching raw images:", error);
      },
    }
  );

  const { data: fetchedAnnotatedImages, refetch: fetchAnnotatedImages } = useQuery(
    ["getAnnotatedImages", params.id],
    () => getAnnotatedImages(params.id),
    {
      enabled: true,
      onSuccess: (data) => {
        setAnnotatedImages(data);
      },
      onError: (error) => {
        console.error("Error fetching annotated images:", error);
      },
    }
  );

  useEffect(() => {
    if (queryResult && queryResult.similarities) {
      const weightScript = toggleScript ? 0.4 : 0;
      const weightPdfText = togglePdfText ? 0.4 : 0;
      const weightPdfImage = togglePdfImage ? 0.1 : 0;
      const weightAnnotation = toggleAnnotation ? 0.1 : 0;

      const totalWeight = weightScript + weightPdfText + weightPdfImage + weightAnnotation;

      const threeStarThreshold = 0.3 * totalWeight;
      const twoStarThreshold = 0.2 * totalWeight;
      const oneStarThreshold = 0.15 * totalWeight;


      const pageScores = Object.entries(queryResult.similarities).map(
        ([page, scores]) => {
          const totalScore =
            (scores.script * weightScript) +
            (scores.pdf_text * weightPdfText) +
            (scores.annotation * weightAnnotation) +
            (scores.pdf_image * weightPdfImage);
          return { page: parseInt(page), totalScore };
        }
      );

      // 점수를 기준으로 페이지를 내림차순 정렬
      const sorted = pageScores.sort((a, b) => b.totalScore - a.totalScore);
      
      // 페이지들을 별 개수에 따라 분류
      const threeStar = sorted.filter(({ totalScore }) => totalScore >= threeStarThreshold);
      const twoStar = sorted.filter(({ totalScore }) => totalScore >= twoStarThreshold && totalScore < threeStarThreshold);
      const oneStar = sorted.filter(({ totalScore }) => totalScore >= oneStarThreshold && totalScore < twoStarThreshold);
      
      setThreeStarPages(threeStar);
      setTwoStarPages(twoStar);
      setOneStarPages(oneStar);
      // setSortedPages(sorted);
    }
    // Keyword 검색 결과가 있을 때 해당 배열을 설정
    if (queryResult && queryResult.source) {
      setScriptPages(queryResult.source.script || []);
      setPdfTextPages(queryResult.source.pdf_text || []);
      setAnnotationPages(queryResult.source.annotation || []);
    }
  }, [queryResult, toggleScript, togglePdfText, togglePdfImage, toggleAnnotation]);

  const togglePageSelection = (page: number) => {
    setSelectedPages((prevSelected) => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(page)) {
        newSelected.delete(page); // 선택 해제
      } else {
        newSelected.add(page); // 선택
      }
      return newSelected;
    });
    // setShowPieChart(false); // 토글 버튼 클릭 시 Pie 차트 표시 방지
  };

  useEffect(() => {
    // selectedPages가 비어 있으면 버튼을 비활성화하고, 비어 있지 않으면 활성화
    setIsSaveButtonDisabled(selectedPages.size === 0);
  }, [selectedPages]);

  const handleSaveSearchSet = async () => {
    try {
      const selectedPageList = Array.from(selectedPages).map(String);
      await saveSearchSet(params.id, searchId!, type, selectedPageList); 
      // 목록을 업데이트하기 위해 fetchSemanticSearchSets 호출
      await fetchSemanticSearchSets();
      await fetchKeywordSearchSets();
      
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error saving search set:", error);
      alert("Failed to save search set.");
    }
  };
  
  const handleSearch = async () => {
    if (query.trim() === "") return;
    try {
      console.log('start search');
      setProcessing({type: ProcessingType.SEARCHING, message: "Searching..."});
      const result = await searchQuery(projectId, query, type);
      setSearchId(result.search_id); // 검색 ID를 저장
      setSelectedSearchId(null); // 선택된 search_id 초기화
      setInputText('')
      setSearchQuery((prevState) => ({ ...prevState, query: '' }));
      setPreviousQuery(query);
      setQueryText(query);
      console.log('end search');
      setProcessing({type: ProcessingType.NONE, message: ""});
    } catch (error) {
      console.error("Error during search:", error);
      alert("Searching is failed. Please click save button first.");
      setSearchQuery((prevState) => ({ ...prevState, query: '' }));
      setProcessing({type: ProcessingType.NONE, message: ""});
    }
  };

  // 선택된 search_id에 해당하는 페이지 리스트를 가져오는 함수
  const fetchPageList = async (searchId, searchType) => {
    try {
      const result = await getSearchResult({ queryKey: ["getSearchResult", projectId, searchId, searchType] });
      const pages = result.page_set;
      setPageList(pages);
      setIsModalOpen(true); // 모달 열기
    } catch (error) {
      console.error("Error fetching page list:", error);
    }
  };

  const handleBoxClick = (searchId, searchQuery, searchType) => {
    setSelectedSearchId(searchId); // 선택된 search_id 업데이트
    setSelectedSearchType(searchType); // 선택된 검색의 타입을 설정
    setSelectedSearchQuery(searchQuery);
    fetchPageList(searchId, searchType); // 페이지 리스트 가져오기
  };

  const handleToggle = (toggleType: string) => {
    const totalTogglesOn = [toggleScript, togglePdfText, togglePdfImage, toggleAnnotation].filter(t => t).length;

    if (totalTogglesOn === 1 && (
      (toggleType === 'script' && toggleScript) ||
      (toggleType === 'pdfText' && togglePdfText) ||
      (toggleType === 'pdfImage' && togglePdfImage) ||
      (toggleType === 'annotation' && toggleAnnotation)
    )) {
      // 무조건 하나는 켜져 있어야 하므로 마지막 하나를 끄지 못하게 막음
      return;
    }

    // 토글 상태 업데이트
    switch (toggleType) {
      case 'script':
        setToggleScript(!toggleScript);
        break;
      case 'pdfText':
        setTogglePdfText(!togglePdfText);
        break;
      case 'pdfImage':
        setTogglePdfImage(!togglePdfImage);
        break;
      case 'annotation':
        setToggleAnnotation(!toggleAnnotation);
        break;
    }
  };

  // 페이지 클릭 시 파이 차트를 계산하는 함수
  const handlePageClick = (event: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>, page: number) => {
    console.log('page clicked');
    if (queryResult && queryResult.similarities[page]) {
      const scores = queryResult.similarities[page];
      const activeScores = [
        { label: 'Script', value: toggleScript ? scores.script * 0.4 : 0 },
        { label: 'PDF Text', value: togglePdfText ? scores.pdf_text * 0.4 : 0 },
        { label: 'PDF Image', value: togglePdfImage ? scores.pdf_image * 0.1 : 0 },
        { label: 'Annotation', value: toggleAnnotation ? scores.annotation * 0.1 : 0 },
      ].filter(score => score.value > 0);

      const total = activeScores.reduce((sum, { value }) => sum + value, 0);
      const pieData = {
        labels: activeScores.map(({ label }) => label),
        datasets: [
          {
            data: activeScores.map(({ value }) => (value / total) * 100),
            backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'],
            borderWidth: 1,
            borderColor: '#ffffff',
          },
        ],
      };

      setPieChartData(prev => ({ ...prev, [page]: pieData }));
      setShowPieChart(prev => ({ ...prev, [page]: true }));
    }
  };

  // 이미지 클릭 이벤트
  // const handleMouseDown = (page: number) => handlePageClick(page);
  const handleMouseUp = (page: number) => {
    setShowPieChart(prev => ({ ...prev, [page]: false }));
  };

  useEffect(() => {
    console.log("query", query);
    if (query) {
      handleSearch();
    }
  }, [query, type]);

  const fetchSemanticSearchSets = async () => {
    try {
      const data : {search_id: number, query: string}[] = await getSemanticSearchSets({
        queryKey: ["getSemanticSearchSets", projectId],
      });
      setSemanticSearchSets(data);
      console.log("semanticSearchSets:", semanticSearchSets);
    } catch (error) {
      console.error("Error fetching semantic search sets:", error);
    }
  };

  useEffect(() => {
    fetchSemanticSearchSets();
  }, [projectId]);

  const fetchKeywordSearchSets = async () => {
    try {
      const data : {search_id: number, query: string}[] = await getKeywordSearchSets({
        queryKey: ["getKeywordSearchSets", projectId],
      });
      setKeywordSearchSets(data);
    } catch (error) {
      console.error("Error fetching keyword search sets:", error);
    }
  };

  useEffect(() => {
    fetchKeywordSearchSets();
  }, [projectId]);

  return (
    <div className="h-full flex flex-col">
      {currentProcessing.type !== ProcessingType.NONE && (
        <div className="fixed flex flex-col inset-0 w-full h-full items-center justify-center z-50 bg-opacity-40 bg-black">
          <svg className="animate-spin h-24 w-24 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <div className="mt-5 text-xl text-white pointer-events-none">
            {currentProcessing.message}
          </div>
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
      {tableOfContents && semanticSearchSets && keywordSearchSets && (
        <div className="flex-grow flex flex-row">
          <div className="flex-none w-1/5 bg-slate-50 p-3 overflow-y-auto h-[calc(100vh-3rem)]">
            <div className="mb-4 font-bold">Table of Contents</div>
            <ol>{buildTableOfContents(tableOfContents)}</ol>
            <hr className="border-2 border-gray-300 my-4" />
            <div className="mb-4 font-bold">Semantic Search Results</div>
            <div className="mt-4">
              {semanticSearchSets
                .sort((a, b) => a.search_id - b.search_id) // search_id 기준으로 정렬
                .map(({ search_id, query }) => (
                  <div
                    key={search_id}
                    className={`px-3 py-2 mb-1 rounded-lg ${
                      selectedSearchId === search_id ? " bg-slate-600 shadow-lg my-2 font-extrabold text-white" : " bg-white "
                    }`}
                    onClick={() => handleBoxClick(search_id, query, 'semantic')}
                  >
                    {search_id}. {query}
                  </div>
                ))}
            </div>
            <hr className="border-2 border-gray-300 my-4" />
            <div className="mb-4 font-bold">Keyword Search Results</div>
            <div className="mt-4">
              {keywordSearchSets
                .sort((a, b) => a.search_id - b.search_id) // search_id 기준으로 정렬
                .map(({ search_id, query }) => (
                  <div
                    key={search_id}
                    className={`px-3 py-2 mb-1 rounded-lg ${
                      selectedSearchId === search_id ? " bg-slate-600 shadow-lg my-2 font-extrabold text-white" : " bg-white "
                    }`}
                    onClick={() => handleBoxClick(search_id, query, 'keyword')}
                  >
                    {search_id}. {query}
                  </div>
                ))}
            </div>
          </div>
          <div className="flex-auto h-full w-3/5 bg-slate-100 p-3 text-black">
            <PdfViewer
              scale={1.5}
              projectId={params.id}
              spotlightRef={spotlightRef}
            />
            <SearchModal isOpen={isModalOpen} onClose={handleCloseModal} pieChartData={pieChartData} showPieChart={showPieChart} >
              {selectedSearchId ? (
                // 박스를 클릭하여 모달을 연 경우
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-black">
                      Pages for "{seletedSearchQuery}" (ID: {selectedSearchId}, {selectedSearchType.charAt(0).toUpperCase() + selectedSearchType.slice(1)} Search)
                    </h2>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {pageList.map((page) => (
                      <div
                        key={page}
                        className="p-4 bg-gray-100 rounded-lg shadow flex flex-col items-center"
                      >
                        <img
                          src={annotatedImages[page - 1].image} // 이미지 배열에서 페이지에 해당하는 이미지를 가져옴
                          alt={`Page ${page}`}
                          className="rounded-md mb-2"
                        />
                        {/* 페이지 정보 */}
                        <p className="text-center font-semibold text-black">Page {page}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                // 검색을 통해 모달을 연 경우
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-black">
                      {type.charAt(0).toUpperCase() + type.slice(1)} Search Result for "{queryText}"
                    </h2>
                    <button
                      className={`px-4 py-2 text-white rounded ${
                        isSaveButtonDisabled ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-700'
                      }`}
                      onClick={handleSaveSearchSet}
                      disabled={isSaveButtonDisabled}
                    >
                      Make a Search Set
                    </button>
                  </div>
                  {type === 'keyword' ? (
                    <div>
                      <div className="mb-4 font-bold text-black">Script</div>
                      <div className="grid grid-cols-3 gap-4 mb-8">
                        {scriptPages.length > 0 ? (
                          scriptPages.map((page) => (
                            <div key={page} className="relative p-4 bg-gray-100 rounded-lg shadow flex flex-col items-center">
                              <div
                                className="absolute top-2 right-2 w-6 h-6 border-2 border-dashed rounded-full cursor-pointer flex items-center justify-center z-20 toggle-button"
                                onClick={() => togglePageSelection(parseInt(page))}
                              >
                                {selectedPages.has(parseInt(page)) && (
                                  <span className="text-black text-lg">✔</span>
                                )}
                              </div>
                              <img src={annotatedImages[parseInt(page) - 1].image} alt={`Page ${page}`} className="rounded-md mb-2" />
                              <p className="text-center font-semibold text-black">Page {page}</p>
                            </div>
                          ))
                        ) : (
                          <p className="text-red-500 font-bold">(No search results)</p>
                        )}
                      </div>
                      <div className="mb-4 font-bold text-black">PDF Text</div>
                      <div className="grid grid-cols-3 gap-3 mb-8">
                        {pdfTextPages.length > 0 ? (
                          pdfTextPages.map((page) => (
                            <div key={page} className="relative p-4 bg-gray-100 rounded-lg shadow flex flex-col items-center">
                              <div
                                className="absolute top-2 right-2 w-6 h-6 border-2 border-dashed rounded-full cursor-pointer flex items-center justify-center z-20 toggle-button"
                                onClick={() => togglePageSelection(parseInt(page))}
                              >
                                {selectedPages.has(parseInt(page)) && (
                                  <span className="text-black text-lg">✔</span>
                                )}
                              </div>
                              <img src={annotatedImages[parseInt(page) - 1].image} alt={`Page ${page}`} className="rounded-md mb-2" />
                              <p className="text-center font-semibold text-black">Page {page}</p>
                            </div>
                          ))
                        ) : (
                          <p className="text-red-500 font-bold">(No search results)</p>
                        )}
                      </div>
                      <div className="mb-4 font-bold text-black">Annotation</div>
                      <div className="grid grid-cols-3 gap-3 mb-8">
                        {annotationPages.length > 0 ? (
                          annotationPages.map((page) => (
                            <div key={page} className="relative p-4 bg-gray-100 rounded-lg shadow flex flex-col items-center">
                              <div
                                className="absolute top-2 right-2 w-6 h-6 border-2 border-dashed rounded-full cursor-pointer flex items-center justify-center z-20 toggle-button"
                                onClick={() => togglePageSelection(parseInt(page))}
                              >
                                {selectedPages.has(parseInt(page)) && (
                                  <span className="text-black text-lg">✔</span>
                                )}
                              </div>
                              <img src={annotatedImages[parseInt(page) - 1].image} alt={`Page ${page}`} className="rounded-md mb-2" />
                              <p className="text-center font-semibold text-black">Page {page}</p>
                            </div>
                          ))
                        ) : (
                          <p className="text-red-500 font-bold">(No search results)</p>
                        )}
                      </div>
                    </div>                 
                  ) : (
                    <div>
                      {/* 점수 항목별 토글 */}
                      <div className="flex space-x-4 items-center mb-4">
                        {/* Script 점수 토글 */}
                        <div className="flex items-center">
                          <ToggleSwitch
                            label="Script"
                            checked={toggleScript}
                            onChange={() => handleToggle("script")}
                            color="#8884d8"
                          />
                        </div>
                        {/* PDF Text 점수 토글 */}
                        <div className="flex items-center">
                          <ToggleSwitch
                            label="PDF Text"
                            checked={togglePdfText}
                            onChange={() => handleToggle("pdfText")}
                            color="#8884d8"
                          />
                        </div>
                        {/* PDF Image 점수 토글 */}
                        <div className="flex items-center">
                          <ToggleSwitch
                            label="PDF Image"
                            checked={togglePdfImage}
                            onChange={() => handleToggle("pdfImage")}
                            color="#8884d8" 
                          />
                        </div>
                        {/* Annotation 점수 토글 */}
                        <div className="flex items-center">
                          <ToggleSwitch
                            label="Annotation"
                            checked={toggleAnnotation}
                            onChange={() => handleToggle("annotation")}
                            color="#8884d8" 
                          />
                        </div>
                      </div>
                      {/* 별 3개 그룹 */}
                      <div className="mb-8">
                        <div className="flex items-center mb-4">
                          <span className="text-yellow-500 text-2xl">★★★</span>
                        </div>
                        {threeStarPages.length > 0 ? (
                          <ul className="grid grid-cols-3 gap-4">
                          {threeStarPages.map(({ page, totalScore }, index) => (
                            <li key={index} className="relative mb-4">
                              <div
                                className="bg-gray-100 rounded-lg shadow p-2 relative"
                                onMouseDown={(e) => {
                                  if (e.target.closest('.toggle-button')) return;
                                  handlePageClick(e, page);
                                }}
                                onMouseUp={(e) => {
                                  handleMouseUp(page);
                                }}
                                onTouchStart={(e) => {
                                  if (e.target.closest('.toggle-button')) return;
                                  e.preventDefault();
                                  handlePageClick(e, page);
                                }}
                                onTouchEnd={(e) => {
                                  e.preventDefault();
                                  handleMouseUp(page);
                                }}
                              >
                                {/* 체크 표시 영역 */}
                                <div
                                  className="absolute top-2 right-2 w-6 h-6 border-2 border-dashed rounded-full cursor-pointer flex items-center justify-center z-20 toggle-button"
                                  onClick={(e) => {
                                    e.stopPropagation(); // 클릭 이벤트가 부모로 전파되지 않도록 막음
                                    togglePageSelection(page);
                                  }}
                                >
                                  {selectedPages.has(page) && (
                                    <span className="text-black text-lg">✔</span>
                                  )}
                                </div>
                                {/* 페이지 이미지 */}
                                <img
                                  src={annotatedImages[page - 1].image}
                                  alt={`Page ${page}`}
                                  className="rounded-md mb-2"
                                />
                                {/* 페이지 정보 */}
                                <p className="text-center font-semibold text-black">Page {page}</p>
                                {/* <p className="text-center text-sm text-black">Total Score: {totalScore.toFixed(4)}</p> */}
                                {/* Pie 차트 영역 (이미지 중심에 위치) */}
                                {showPieChart[page] && pieChartData[page] && (
                                  <div className="absolute inset-0 flex items-center justify-center z-10">
                                    <div className="w-full h-full bg-white bg-opacity-80 p-2 border border-gray-400">
                                      <Pie
                                        data={pieChartData[page]}
                                        options={{
                                          plugins: {
                                            legend: { 
                                              display: true,
                                              position: 'left', // 'top', 'left', 'right', 'bottom' 중 선택 가능
                                              labels: {
                                                font: {
                                                  size: 10, // 폰트 크기 조절
                                                },
                                                padding: 10, // 레이블과 차트 간의 간격 조절
                                              },
                                            },
                                            tooltip: { enabled: false },
                                            datalabels: {
                                              display: true,
                                              color: 'black',
                                              formatter: (value: number) => `${value.toFixed(2)}%`,
                                              font: {
                                                weight: 'bold',
                                                size: 10,
                                              },
                                            },
                                          },
                                        }}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                        ) : (
                          <p className="text-red-500 font-bold">(No search results)</p>
                        )}
                      </div>
                      {/* 별 2개 그룹 */}
                      <div className="mb-8">
                        <div className="flex items-center mb-4">
                          <span className="text-yellow-500 text-2xl">★★</span>
                        </div>
                        {twoStarPages.length > 0 ? (
                          <ul className="grid grid-cols-3 gap-4">
                          {twoStarPages.map(({ page, totalScore }, index) => (
                            <li key={index} className="relative mb-4">
                              <div
                                className="bg-gray-100 rounded-lg shadow p-2 relative"
                                onMouseDown={(e) => {
                                  if (e.target.closest('.toggle-button')) return;
                                  handlePageClick(e, page);
                                }}
                                onMouseUp={(e) => {
                                  handleMouseUp(page);
                                }}
                                onTouchStart={(e) => {
                                  if (e.target.closest('.toggle-button')) return;
                                  e.preventDefault();
                                  handlePageClick(e, page);
                                }}
                                onTouchEnd={(e) => {
                                  e.preventDefault();
                                  handleMouseUp(page);
                                }}
                              >
                                {/* 체크 표시 영역 */}
                                <div
                                  className="absolute top-2 right-2 w-6 h-6 border-2 border-dashed rounded-full cursor-pointer flex items-center justify-center z-20 toggle-button"
                                  onClick={(e) => {
                                    e.stopPropagation(); // 클릭 이벤트가 부모로 전파되지 않도록 막음
                                    togglePageSelection(page);
                                  }}
                                >
                                  {selectedPages.has(page) && (
                                    <span className="text-black text-lg">✔</span>
                                  )}
                                </div>
                                {/* 페이지 이미지 */}
                                <img
                                  src={annotatedImages[page - 1].image}
                                  alt={`Page ${page}`}
                                  className="rounded-md mb-2"
                                />
                                {/* 페이지 정보 */}
                                <p className="text-center font-semibold text-black">Page {page}</p>
                                {/* <p className="text-center text-sm text-black">Total Score: {totalScore.toFixed(4)}</p> */}
                                {showPieChart[page] && pieChartData[page] && (
                                  <div className="absolute inset-0 flex items-center justify-center z-10">
                                    <div className="w-full h-full bg-white bg-opacity-80 p-2 border border-gray-400">
                                      <Pie
                                        data={pieChartData[page]}
                                        options={{
                                          plugins: {
                                            legend: { 
                                              display: true,
                                              position: 'left', // 'top', 'left', 'right', 'bottom' 중 선택 가능
                                              labels: {
                                                font: {
                                                  size: 10, // 폰트 크기 조절
                                                },
                                                padding: 10, // 레이블과 차트 간의 간격 조절
                                              },
                                            },
                                            tooltip: { enabled: false },
                                            datalabels: {
                                              display: true,
                                              color: 'black',
                                              formatter: (value: number) => `${value.toFixed(2)}%`,
                                              font: {
                                                weight: 'bold',
                                                size: 10,
                                              },
                                            },
                                          },
                                        }}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                        ) : (
                          <p className="text-red-500 font-bold">(No search results)</p>
                        )}                                                                    
                      </div>
                      {/* 별 1개 그룹 */}                      
                      <div className="mb-8">
                        <div className="flex items-center mb-4">
                          <span className="text-yellow-500 text-2xl">★</span>
                        </div>
                        {oneStarPages.length > 0 ? (
                          <ul className="grid grid-cols-3 gap-4">
                          {oneStarPages.map(({ page, totalScore }, index) => (
                            <li key={index} className="relative mb-4">
                              <div
                                className="bg-gray-100 rounded-lg shadow p-2 relative"
                                onMouseDown={(e) => {
                                  if (e.target.closest('.toggle-button')) return;
                                  handlePageClick(e, page);
                                }}
                                onMouseUp={(e) => {
                                  handleMouseUp(page);
                                }}
                                onTouchStart={(e) => {
                                  if (e.target.closest('.toggle-button')) return;
                                  e.preventDefault();
                                  handlePageClick(e, page);
                                }}
                                onTouchEnd={(e) => {
                                  e.preventDefault();
                                  handleMouseUp(page);
                                }}
                              >
                                {/* 체크 표시 영역 */}
                                <div
                                  className="absolute top-2 right-2 w-6 h-6 border-2 border-dashed rounded-full cursor-pointer flex items-center justify-center z-20 toggle-button"
                                  onClick={(e) => {
                                    e.stopPropagation(); // 클릭 이벤트가 부모로 전파되지 않도록 막음
                                    togglePageSelection(page);
                                  }}
                                >
                                  {selectedPages.has(page) && (
                                    <span className="text-black text-lg">✔</span>
                                  )}
                                </div>
                                {/* 페이지 이미지 */}
                                <img
                                  src={annotatedImages[page - 1].image}
                                  alt={`Page ${page}`}
                                  className="rounded-md mb-2"
                                />
                                {/* 페이지 정보 */}
                                <p className="text-center font-semibold text-black">Page {page}</p>
                                {/* <p className="text-center text-sm text-black">Total Score: {totalScore.toFixed(4)}</p> */}
                                {showPieChart[page] && pieChartData[page] && (
                                  <div className="absolute inset-0 flex items-center justify-center z-10">
                                    <div className="w-full h-full bg-white bg-opacity-80 p-2 border border-gray-400">
                                      <Pie
                                        data={pieChartData[page]}
                                        options={{
                                          plugins: {
                                            legend: { 
                                              display: true,
                                              position: 'left', // 'top', 'left', 'right', 'bottom' 중 선택 가능
                                              labels: {
                                                font: {
                                                  size: 10, // 폰트 크기 조절
                                                },
                                                padding: 10, // 레이블과 차트 간의 간격 조절
                                              },
                                            },
                                            tooltip: { enabled: false },
                                            datalabels: {
                                              display: true,
                                              color: 'black',
                                              formatter: (value: number) => `${value.toFixed(2)}%`,
                                              font: {
                                                weight: 'bold',
                                                size: 10,
                                              },
                                            },
                                          },
                                        }}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                        ) : (
                          <p className="text-red-500 font-bold">(No search results)</p>
                        )}                    
                      </div>
                    </div>
                  )}
                </div>
              )}
            </SearchModal>
            {isReviewMode && (
              <div
                className="bg-white py-1 rounded-lg shadow-xl shadow-slate-200"
                style={{ height: "25vh" }} // Custom height using inline style
                ref={containerRef}
              >
                <ArousalGraph
                  data={prosodyData}
                  positiveEmotion={positiveEmotion}
                  negativeEmotion={negativeEmotion}
                  page={page}
                  pageInfo={pageInfo}
                  pages={pages}
                  progressRef={progressRef}
                  tableOfContents={tableOfContents}
                  graphWidth={graphWidth}
                  graphHeight={graphHeight}
                  images={rawImages}
                  missedAndImportantParts={missedAndImportantParts}
                  pageStartTime={pageStartTime}
                  pageEndTime={pageEndTime}
                  setpageStartTime={setpageStartTime}
                  setpageEndTime={setpageEndTime}
                />
                <audio ref={audioRef} />
              </div>
            )}
          </div>
          {isReviewMode && (
            <ReviewPage
              projectId={params.id}
              spotlightRef={spotlightRef}
              audioRef={audioRef}
              progressRef={progressRef}
              page={page}
              pageInfo={pageInfo}
              pages={pages}
              setPage={setPage}
              setPages={setPages}
              tocIndex={tocIndex}
              setTocIndex={setTocIndex}
            />
          )}
        </div>
      )}
    </div>
  );
}
