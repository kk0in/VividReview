"use client";

import React, { useState, useEffect, useRef, useCallback, Fragment } from "react";
import PdfViewer from "@/components/dashboard/PdfViewer";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import { pdfDataState } from "@/app/recoil/DataState";
import { gridModeState, searchQueryState, inputTextState, searchTypeState } from "@/app/recoil/ToolState";
import { pdfPageState, tocState, IToCSubsection, tocIndexState, matchedParagraphsState } from '@/app/recoil/ViewerState';
import { getProject, getPdf, getTableOfContents, getMatchParagraphs, getRecording, getBbox, getKeywords, getPageInfo, getProsody, searchQuery, getSearchResult, getImages, saveSearchSet, getSemanticSearchSets, getKeywordSearchSets } from "@/utils/api";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import AppBar from "@/components/AppBar";
import ArousalGraph from "@/components/dashboard/ArousalGraph";
import SearchModal from "@/components/dashboard/SearchModal";
import SearchPanel from "@/components/dashboard/SearchPanel";
import { useSearchParams } from "next/navigation";
import {
  audioTimeState,
  audioDurationState,
  playerState,
  PlayerState,
  playerRequestState,
  PlayerRequestType,
} from "@/app/recoil/LectureAudioState";

import { Pie } from 'react-chartjs-2';
import { Chart, ArcElement, Tooltip, Legend } from 'chart.js';
Chart.register(ArcElement, Tooltip, Legend);

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
    "hover:font-bold " + (index === tocIndex.section && "font-bold");
  return (
    <li className="bg-gray-200 px-4 py-2 mb-1 rounded-2xl">
      <p className={className} onClick={handleSectionClick}>
        {`${index + 1}. ${title}`}
      </p>
      {clicked && subsections && <div className="mt-3">{subTitleElements}</div>}
    </li>
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
  setPageInfo,
  setHoverState,
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
  setPageInfo: (pageInfo: any) => void;
  setPages: (pages: any) => void;
  setHoverState: (hoverState: any) => void;
  tocIndex: any;
  setTocIndex: (tocIndex: any) => void;
}) {
  const gridMode = useRecoilValue(gridModeState);
  const toc = useRecoilValue(tocState);
  // const [tocIndex, setTocIndex] = useRecoilState(tocIndexState);
  const [paragraphs, setParagraphs] = useRecoilState(matchedParagraphsState);
  const [currentPlayerState, setPlayerState] = useRecoilState(playerState);
  const [audioSource, setAudioSource] = useState<string>("");
  const [audioDuration, setAudioDuration] = useRecoilState(audioDurationState);
  const [playerRequest, setPlayerRequest] = useRecoilState(playerRequestState);
  const [activeSubTabIndex, setActiveSubTabIndex] = useState(0);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [scripts, setScripts] = useState<IScript[]>([]);
  const [timeline, setTimeline] = useState<{ start: number; end: number }>({
    start: 0,
    end: 0,
  });
  const [bboxList, setBboxList] = useState<any[]>([]);
  const pdfWidth = useRef(0);
  const pdfHeight = useRef(0);
  const bboxIndex = useRef(-1);

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

  let i = 0;
  const subTabElements = subTabs.map((tab, idx) => {
    const className =
      "rounded-t-2xl w-fit py-1 px-4 font-bold " +
      (i++ === activeSubTabIndex ? "bg-gray-300/50" : "bg-gray-300");

    return (
      <div className={className} onClick={tab.onClick} key={"subtab-" + idx}>
        {tab.title}
      </div>
    );
  });

  const findPage = (time: number): number => {
    if (pageInfo === null) {
      return 0;
    }

    for (const [key, value] of Object.entries<{ start: number; end: number }>(
      pageInfo
    )) {
      if (time > value.start && time < value.end) {
        return parseInt(key);
      }
    }

    return 0;
  };

  const findTocIndex = (page: number) => {
    for (let i = 0; i < toc.length; i++) {
      const section = toc[i];
      for (let j = 0; j < section.subsections.length; j++) {
        const subsection = section.subsections[j];
        if (subsection.page.includes(page)) {
          return { section: i, subsection: j };
        }
      }
    }

    console.log("No ToC index found for page: ", page);
    return null;
  };

  const fetchMatchedParagraphs = async () => {
    try {
      const paragraphs = await getMatchParagraphs({
        queryKey: ["matchParagraphs", projectId],
      });
      setParagraphs(paragraphs);
      console.log(paragraphs);
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
      setBboxList(bboxes.bboxes);
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
    audioRef.current!.ontimeupdate = () => {
      const handleProgressBar = () => {
        if (!isMouseDown && audioRef.current) {
          progressRef.current!.value = audioRef.current.currentTime;
        }

        if (pageInfo && page > 0) {
          const timelineForPage = Object.entries<{
            start: number;
            end: number;
          }>(pageInfo)[page - 1][1];

          // if (audioRef.current!.currentTime >= timelineForPage.end) {
          //   const newPage = page + 1;
          //   const newTocIndex = findTocIndex(newPage);

          //   newTocIndex && newTocIndex !== tocIndex && setTocIndex(newTocIndex);
          //   setPage(newPage);
          //   console.log("setPage1");
          // }
        }

        if (audioRef.current!.currentTime >= timeline.end) {
          console.log("Time is up");
          setPlayerState(PlayerState.IDLE);
        }
      };

      const handleHighlightBox = () => {
        if (!isMouseDown && audioRef.current) {
          // console.log(audioRef.current.currentTime);
          // console.log(bboxList[0]);
          // console.log(bboxIndex.current);
          let changeIndexFlag = false;
          for (let i = 0; i < bboxList.length; i++) {
            if (
              audioRef.current.currentTime >= bboxList[i].start &&
              audioRef.current.currentTime < bboxList[i].end
            ) {
              if (i !== bboxIndex.current) {
                bboxIndex.current = i;
                changeIndexFlag = true;
              }
              break;
            }
          }
          if (!changeIndexFlag) return;
          const bbox = bboxList[bboxIndex.current].bbox;
          const canvas = spotlightRef.current;
          const ctx = canvas?.getContext("2d");
          if (!canvas || !ctx) return;

          ctx.clearRect(0, 0, canvas.width, canvas.height);
          console.log("pdfWidth.current, pdfHeight.current: ", pdfWidth.current, pdfHeight.current); 
          console.log("bbox: ", bbox);
          console.log("canvas.width, canvas.height: ", canvas.width, canvas.height);  
          // 중심점 계산
          const centerX =
            ((bbox[0] + bbox[2] / 2) / pdfWidth.current) * canvas.width;
          const centerY =
            ((bbox[1] + bbox[3] / 2) / pdfHeight.current) * canvas.height;
          console.log("centerX, centerY: ", centerX, centerY); 
          // 그라디언트 생성
          const maxRadius = Math.max(canvas.width, canvas.height) / 1.2; // 큰 반경을 설정하여 부드러운 전환
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
          gradient.addColorStop(1, "rgba(0, 0, 0, 0.7)"); // 외곽부는 어두운 명암
          // ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          // ctx.clearRect(
          // (bbox[0] - bbox[2] < 0 ? 0 : bbox[0] - bbox[2]) / pdfWidth.current * canvas.width,
          // (bbox[1] - bbox[3] < 0 ? 0 : bbox[0] - bbox[2]) / pdfHeight.current * canvas.width,
          // (bbox[0] + bbox[2] > canvas.width ? canvas.width : bbox[0] + bbox[2]) / pdfWidth.current * canvas.width,
          // (bbox[1] + bbox[3] > canvas.height ? canvas.height : bbox[1] + bbox[3]) / pdfHeight.current * canvas.height);
          setInterval(() => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          }, 5000);
        }
      };

      handleProgressBar();
      handleHighlightBox();
    };
  }, [audioRef.current?.currentTime, isMouseDown, gridMode, page]);

  useEffect(() => {
    if (progressRef.current === null) {
      return;
    }

    const getNewProgressValue = (event: MouseEvent) => {
      return (
        (event.offsetX / progressRef.current!.offsetWidth) *
        audioRef.current!.duration
      );
    };

    progressRef.current.onmousedown = (event) => {
      event.preventDefault();
      console.log("mousedown", event.offsetX);
      progressRef.current!.value = getNewProgressValue(event);
      setIsMouseDown(true);
      setHoverState({
        hoverPosition: event.offsetX,
        hoverTime: progressRef.current?.value,
        activeLabel: progressRef.current?.value,
      });
    };

    progressRef.current.onmousemove = (event) => {
      if (isMouseDown && progressRef.current) {
        progressRef.current.value = getNewProgressValue(event);
        setHoverState({
          hoverPosition: event.offsetX,
          hoverTime: progressRef.current.value,
          activeLabel: progressRef.current.value,
        });
      }
    };

    progressRef.current.onmouseup = (event) => {
      event.preventDefault();
      if (isMouseDown) {
        console.log("mouseup", progressRef.current!.offsetWidth, event.offsetX);
        const timeValue = getNewProgressValue(event);
        const newPage = findPage(timeValue);
        const newTocIndex = findTocIndex(newPage);
        newTocIndex && newTocIndex !== tocIndex && setTocIndex(newTocIndex);
        newPage > 0 && setPage(newPage);

        audioRef.current!.currentTime = timeValue;
        setHoverState({
          hoverPosition: event.offsetX,
          hoverTime: timeValue,
          activeLabel: timeValue,
        });
        setIsMouseDown(false);
      }
    };

    window.onmouseup = () => {
      setIsMouseDown(false);
    };
  }, [progressRef, isMouseDown]);

  useEffect(() => {
    const newTimeline = { start: 0, end: 0 };

    switch (gridMode) {
      case 0: {
        const value = Object.entries<{ start: number; end: number }>(pageInfo)[
          page - 1
        ];

        if (value) {
          newTimeline.start = value[1].start;
          newTimeline.end = value[1].end;
        }
        break;
      }

      case 1: {
        const section = toc[tocIndex.section];
        const startSubSection = section.subsections[0];
        const endSubSection =
          section.subsections[section.subsections.length - 1];
        const startPage = startSubSection.page[0];
        const endPage = endSubSection.page[endSubSection.page.length - 1];

        const startValue = Object.entries<{ start: number; end: number }>(
          pageInfo
        )[startPage - 1];
        const endValue = Object.entries<{ start: number; end: number }>(
          pageInfo
        )[endPage - 1];

        if (startValue && endValue) {
          newTimeline.start = startValue[1].start;
          newTimeline.end = endValue[1].end;
        }
        break;
      }

      case 2: {
        const section = toc[tocIndex.section];
        const subsection = section.subsections[tocIndex.subsection];
        const startPage = subsection.page[0];
        const endPage = subsection.page[subsection.page.length - 1];

        const startValue = Object.entries<{ start: number; end: number }>(
          pageInfo
        )[startPage - 1];
        const endValue = Object.entries<{ start: number; end: number }>(
          pageInfo
        )[endPage - 1];

        if (startValue && endValue) {
          newTimeline.start = startValue[1].start;
          newTimeline.end = endValue[1].end;
        }
        break;
      }
    }

    console.log("newTimeline", newTimeline, audioRef.current!.currentTime);
    if (
      audioRef.current!.currentTime < newTimeline.start ||
      audioRef.current!.currentTime > newTimeline.end
    ) {
      audioRef.current!.currentTime = newTimeline.start;
    }
    setTimeline(newTimeline);
  }, [pageInfo, page, gridMode]);

  useEffect(() => {
    if (audioRef.current === null || !audioSource) {
      return;
    }

    switch (currentPlayerState) {
      case PlayerState.PLAYING: {
        console.log("PLAYING", timeline, audioRef.current!.currentTime);
        audioRef.current.play();
        break;
      }

      case PlayerState.PAUSED: {
        console.log("PAUSED", timeline, audioRef.current!.currentTime);
        audioRef.current.pause();
        break;
      }

      case PlayerState.IDLE: {
        console.log("IDLE");
        audioRef.current.pause();
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
        audioRef.current.currentTime -= 5;
        setPlayerRequest(PlayerRequestType.NONE);
        break;

      case PlayerRequestType.FORWARD:
        audioRef.current.currentTime += 5;
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

  const convertWhiteSpaces = (text: string) => {
    return text.replace(/  /g, "\u00a0\u00a0");
  };

  const convertStrongSymbols = (text: string) => {
    return text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  };

  const convertLineEscapes = (text: string) => {
    return text.replace(/\n/g, "<br />");
  };

  const convertListSymbols = (text: string) => {
    return text.replace(/- (.*?)(\n|$)/g, "• $1\n");
  };

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

  const preprocessText = (text: string, keywords: string[]) => {
    let processedHTML = convertListSymbols(text);
    processedHTML = convertLineEscapes(processedHTML);
    processedHTML = convertStrongSymbols(processedHTML);
    processedHTML = convertWhiteSpaces(processedHTML);
    processedHTML = highlightKeywords(processedHTML, keywords);
    return processedHTML;
  };

  const paragraph: React.JSX.Element[] = [];
  for (const page of pages) {
    for (const script of scripts) {
      if (script.page === page) {
        let processedHTML = "";
        if (activeSubTabIndex === 0) {
          processedHTML = preprocessText(script.original, script.keyword);
        } else {
          processedHTML = preprocessText(script.formal, script.keyword);
        }

        paragraph.push(
          <Fragment key={page}>
            <p className="font-bold text-lg">Page {script.page} -</p>
            <p
              className="mb-2"
              dangerouslySetInnerHTML={{ __html: processedHTML }}
            ></p>
          </Fragment>
        );
        break;
      }
    }
  }

  // useEffect(() => {
  //   const fetchResults = async () => {
  //     if (!searchId) return;

  //     try {
  //       const result = await getSearchResult(projectId, searchId, type);
  //       const sortedPages = result.similarities
  //         ? Object.entries(result.similarities).sort((a, b) => b[1] - a[1])
  //         : [];

  //       setSearchResult(sortedPages);
  //       setIsModalOpen(true); // 검색 결과를 불러오면 모달을 염
  //     } catch (error) {
  //       console.error("Error fetching search results:", error);
  //     }
  //   };

  //   fetchResults();
  // }, [searchId, type, projectId]);

  // useEffect(() => {
  //   const fetchSearchResults = async () => {
  //     if (query.trim() === "") return; // 검색어가 비어 있으면 API 호출하지 않음

  //     try {
  //       await searchQuery(projectId, query, type); // API 요청만 수행
  //     } catch (error) {
  //       console.error("Error during search:", error);
  //     }
  //   };

  //   fetchSearchResults();
  // }, [query, type, projectId]); // 검색어 또는 타입이 변경될 때만 API 호출

  return (
    <div className="flex-none w-1/5 bg-gray-50 overflow-y-auto h-[calc(100vh-4rem)]">
      <div className="rounded-t-2xl w-fit bg-gray-200 mt-4 mx-4 py-1 px-4 font-bold">
        Script
      </div>
      <div className="rounded-b-2xl rounded-tr-2xl bg-gray-200 mx-4 p-3">
        <div className="flex flex-row">{subTabElements}</div>
        <div className="rounded-b-2xl rounded-tr-2xl bg-gray-300/50 p-3">
          {paragraph}
        </div>
      </div>
    </div>
  );
}

export default function Page({ params }: { params: { id: string } }) {
  const projectId = params.id;
  const { query, type } = useRecoilValue(searchQueryState); // Recoil에서 검색어와 타입 가져오기
  const [searchId, setSearchId] = useState<string | null>(null);
  const [sortedPages, setSortedPages] = useState<any[]>([]);
  const [queryResult, setQueryResult] = useState(null);
  const [images, setImages] = useState<string[]>([]); // 이미지를 저장할 상태
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set()); // 선택된 페이지들
  const [semanticSearchSets, setSemanticSearchSets] = useState([]);
  const [keywordSearchSets, setKeywordSearchSets] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [tableOfContents, setTableOfContents] = useRecoilState(tocState);
  const [pdfData, setPdfData] = useRecoilState(pdfDataState);
  const [uploadStatus, setUploadStatus] = useState("");
  const [page, setPage] = useRecoilState(pdfPageState);
  const [pageInfo, setPageInfo] = useState({});
  const [tocIndex, setTocIndex] = useRecoilState(tocIndexState);

  const [hoverState, setHoverState] = useState<{
    hoverPosition: number | null;
    hoverTime: number | null;
    activeLabel: number | null;
  }>({
    hoverPosition: null,
    hoverTime: null,
    activeLabel: null,
  });
  const [threeStarPages, setThreeStarPages] = useState<any[]>([]);
  const [twoStarPages, setTwoStarPages] = useState<any[]>([]);
  const [oneStarPages, setOneStarPages] = useState<any[]>([]);
  const [selectedSearchId, setSelectedSearchId] = useState(null); // 선택된 search_id
  const [selectedSearchType, setSelectedSearchType] = useState<string>(''); 
  const [seletedSearchQuery, setSelectedSearchQuery] = useState<string>(''); 
  const [pageList, setPageList] = useState([]);
  const [hasOpenedModal, setHasOpenedModal] = useState(false); // 모달이 이미 열렸는지 확인하기 위한 상태
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

  // const [history, setHistory] = useState<string[]>([]);
  // const [redoStack, setRedoStack] = useState<string[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLProgressElement>(null);
  const toc = useRecoilValue(tocState);

  const handleAudioRef = (data: any) => {
    if (Number.isFinite(data?.begin)) {
      audioRef.current!.currentTime = data.begin;
    }
  };

  const [prosodyData, setProsodyData] = useState<any>(null);
  const [positiveEmotion, setpositiveEmotion] = useState([
    "Part for taking away",
    "Excitement",
    "Enthusiasm",
    "Interest",
    "Amusement",
    "Joy",
  ]);
  const [negativeEmotion, setnegativeEmotion] = useState([
    "Part for throwing away",
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

  const findPage = (time: number): number => {
    console.log("findPage", time, pageInfo);

    if (pageInfo === null) {
      return 0;
    }

    for (const [key, value] of Object.entries<{ start: number; end: number }>(
      pageInfo
    )) {
      if (time >= value.start && time < value.end) {
        return parseInt(key);
      }
    }

    return 0;
  };

  const findTocIndex = (page: number) => {
    for (let i = 0; i < toc.length; i++) {
      const section = toc[i];
      for (let j = 0; j < section.subsections.length; j++) {
        const subsection = section.subsections[j];
        if (subsection.page.includes(page)) {
          return { section: i, subsection: j };
        }
      }
    }

    console.log("No ToC index found for page: ", page);
    return null;
  };

  useEffect(() => {
    fetchTableOfContents();
    fetchProsody();
    fetchPageInfo();
  }, []);

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

  const containerRef = useRef<HTMLDivElement>(null);
  const [graphWidth, setGraphWidth] = useState(0);

  useEffect(() => {
    if (containerRef.current) {
      setGraphWidth(containerRef.current.offsetWidth);
    }
  }, []);

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
  const { data: fetchedImages, refetch: fetchImages } = useQuery(
    ["getImages", params.id],
    () => getImages(params.id),
    {
      enabled: true, // 항상 호출
      onSuccess: (data) => {
        setImages(data);
      },
      onError: (error) => {
        console.error("Error fetching images:", error);
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
      const result = await searchQuery(projectId, query, type);
      setSearchId(result.search_id); // 검색 ID를 저장
      setSelectedSearchId(null); // 선택된 search_id 초기화
      setInputText('')
      setSearchQuery((prevState) => ({ ...prevState, query: '' }));
      setPreviousQuery(query);
      setQueryText(query);
    } catch (error) {
      console.error("Error during search:", error);
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
  const handlePageClick = (event: React.MouseEvent<HTMLDivElement>, page: number) => {
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
      const data = await getSemanticSearchSets({
        queryKey: ["getSemanticSearchSets", projectId],
      });
      setSemanticSearchSets(data);
    } catch (error) {
      console.error("Error fetching semantic search sets:", error);
    }
  };

  useEffect(() => {
    fetchSemanticSearchSets();
  }, [projectId]);

  const fetchKeywordSearchSets = async () => {
    try {
      const data = await getKeywordSearchSets({
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
          <div className="flex-none w-1/5 bg-gray-50 p-4 overflow-y-auto h-[calc(100vh-4rem)]">
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
                    className={`bg-gray-200 px-4 py-2 mb-1 rounded-2xl ${
                      selectedSearchId === search_id ? "font-bold" : ""
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
                    className={`bg-gray-200 px-4 py-2 mb-1 rounded-2xl ${
                      selectedSearchId === search_id ? "font-bold" : ""
                    }`}
                    onClick={() => handleBoxClick(search_id, query, 'keyword')}
                  >
                    {search_id}. {query}
                  </div>
                ))}
            </div>
          </div>
          <div className="flex-auto h-full bg-slate-900 p-4 text-white">
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
                          src={images[page - 1]} // 이미지 배열에서 페이지에 해당하는 이미지를 가져옴
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
                      className="px-4 py-2 bg-gray-400 text-black rounded hover:bg-gray-500"
                      onClick={handleSaveSearchSet}
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
                              <img src={images[parseInt(page) - 1]} alt={`Page ${page}`} className="rounded-md mb-2" />
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
                              <img src={images[parseInt(page) - 1]} alt={`Page ${page}`} className="rounded-md mb-2" />
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
                              <img src={images[parseInt(page) - 1]} alt={`Page ${page}`} className="rounded-md mb-2" />
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
                          <input
                            type="checkbox"
                            checked={toggleScript}
                            onChange={() => handleToggle('script')}
                            className="mr-1"
                          />
                          <span className="text-black ml-1">Script</span>
                        </div>
                        {/* PDF Text 점수 토글 */}
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={togglePdfText}
                            onChange={() => handleToggle('pdfText')}
                            className="mr-1"
                          />
                          <span className="text-black ml-1">PDF Text</span>
                        </div>
                        {/* PDF Image 점수 토글 */}
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={togglePdfImage}
                            onChange={() => handleToggle('pdfImage')}
                            className="mr-1"
                          />
                          <span className="text-black ml-1">PDF Image</span>
                        </div>
                        {/* Annotation 점수 토글 */}
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={toggleAnnotation}
                            onChange={() => handleToggle('annotation')}
                            className="mr-1"
                          />
                          <span className="text-black ml-1">Annotation</span>
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
                                  src={images[page - 1]}
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
                                  src={images[page - 1]}
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
                                  src={images[page - 1]}
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
              <div className="flex flex-col bg-gray-200" ref={containerRef}>
                <ArousalGraph
                  data={prosodyData}
                  handleAudioRef={handleAudioRef}
                  positiveEmotion={positiveEmotion}
                  negativeEmotion={negativeEmotion}
                  page={page}
                  pageInfo={pageInfo}
                  pages={pages}
                  progressRef={progressRef}
                  tableOfContents={tableOfContents}
                  graphWidth={graphWidth}
                  findPage={findPage}
                  findTocIndex={findTocIndex}
                  tocIndex={tocIndex}
                  hoverState={hoverState}
                  setHoverState={setHoverState}
                  setTocIndex={setTocIndex}
                  setPage={setPage}
                  images={images}
                />
                <audio ref={audioRef} />
                <progress className="w-full rounded-lg" ref={progressRef} />
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
              setPageInfo={setPageInfo}
              setPages={setPages}
              setHoverState={setHoverState}
              tocIndex={tocIndex}
              setTocIndex={setTocIndex}
            />
          )}
        </div>
      )}
    </div>
  );
}
