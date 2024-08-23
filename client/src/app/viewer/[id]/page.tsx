"use client";

import React, { useState, useEffect, useRef, useCallback, Fragment } from "react";
import PdfViewer from "@/components/dashboard/PdfViewer";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import { pdfDataState } from "@/app/recoil/DataState";
import { gridModeState, searchQueryState } from "@/app/recoil/ToolState";
import { pdfPageState, tocState, IToCSubsection, tocIndexState, matchedParagraphsState } from '@/app/recoil/ViewerState';
import { getProject, getPdf, getTableOfContents, getMatchParagraphs, getRecording, getBbox, getKeywords, getPageInfo, getProsody, searchQuery } from "@/utils/api";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import AppBar from "@/components/AppBar";
import ArousalGraph from "@/components/dashboard/ArousalGraph";
import { useSearchParams } from "next/navigation";
import {
  audioTimeState,
  audioDurationState,
  playerState,
  PlayerState,
  playerRequestState,
  PlayerRequestType,
} from "@/app/recoil/LectureAudioState";

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
  setPages,
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
}) {
  const gridMode = useRecoilValue(gridModeState);
  const toc = useRecoilValue(tocState);
  const [tocIndex, setTocIndex] = useRecoilState(tocIndexState);
  const { query, type } = useRecoilValue(searchQueryState); // Recoil에서 검색어와 타입 가져오기
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

          if (audioRef.current!.currentTime >= timelineForPage.end) {
            const newPage = page + 1;
            const newTocIndex = findTocIndex(newPage);
            console.log("Current Page update", newPage, newTocIndex);

            newTocIndex && newTocIndex !== tocIndex && setTocIndex(newTocIndex);
            setPage(newPage);
          }
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
    };

    progressRef.current.onmousemove = (event) => {
      if (isMouseDown && progressRef.current) {
        progressRef.current.value = getNewProgressValue(event);
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

  useEffect(() => {
    const fetchSearchResults = async () => {
      if (query.trim() === "") return; // 검색어가 비어 있으면 API 호출하지 않음

      try {
        await searchQuery(projectId, query, type); // API 요청만 수행
      } catch (error) {
        console.error("Error during search:", error);
      }
    };

    fetchSearchResults();
  }, [query, type, projectId]); // 검색어 또는 타입이 변경될 때만 API 호출

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
  const [isLoaded, setIsLoaded] = useState(false);
  const [tableOfContents, setTableOfContents] = useRecoilState(tocState);
  const [pdfData, setPdfData] = useRecoilState(pdfDataState);
  const [uploadStatus, setUploadStatus] = useState("");
  const [page, setPage] = useRecoilState(pdfPageState);
  const [pageInfo, setPageInfo] = useState({});

  // const [history, setHistory] = useState<string[]>([]);
  // const [redoStack, setRedoStack] = useState<string[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLProgressElement>(null);

  const handlePointClick = (data: any) => {
    console.log("Clicked data point:", data);
    // console.log("Clicked data point:", data, audioRef.current!.currentTime);
    if (Number.isFinite(data?.begin)) {
      console.log("Seeking to", data.begin);
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
            <div className="mb-4 font-bold">Table</div>
            <ol>{buildTableOfContents(tableOfContents)}</ol>
          </div>
          <div className="flex-auto h-full bg-slate-900 p-4 text-white">
            <PdfViewer
              scale={1.5}
              projectId={params.id}
              spotlightRef={spotlightRef}
            />
            {isReviewMode && (
              <div className="flex flex-col rounded-2xl bg-gray-200" ref={containerRef}>
                <ArousalGraph
                  data={prosodyData}
                  onPointClick={handlePointClick}
                  positiveEmotion={positiveEmotion}
                  negativeEmotion={negativeEmotion}
                  page={page}
                  pageInfo={pageInfo}
                  pages={pages}
                  tableOfContents={tableOfContents}
                  graphWidth={graphWidth}
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
            />
          )}
        </div>
      )}
    </div>
  );
}
