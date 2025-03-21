declare global {
  interface WindowEventMap {
    undoCanvas: CustomEvent<HistoryType>;
    redoCanvas: CustomEvent<HistoryType>;
  }
}

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { useRecoilValue, useRecoilState, useSetRecoilState } from "recoil";
import { toolState, recordingState, gridModeState, isSaveClickedState } from "@/app/recoil/ToolState";
import { getNewHistoryId, historyState, HistoryType, redoStackState } from "@/app/recoil/HistoryState";
import { pdfPageState, tocState, tocIndexState, pdfImagesState, scriptModeState, processingState } from "@/app/recoil/ViewerState";
import { defaultPromptsState, focusedLassoState, reloadFlagState, activePromptState, Prompt } from "@/app/recoil/LassoState";
import { saveAnnotatedPdf, getPdf, saveRecording, lassoQuery, getLassoInfo, getRawImages, projectPrompts, removeLassoPrompt } from "@/utils/api";
import "./Lasso.css";
import { useSearchParams } from "next/navigation";
import ImagePage from "./ImagePage";
import { navigationState, NavigationStateType } from "@/app/recoil/LectureAudioState";
import { findTocIndex } from "@/utils/lecture";
// import { layer } from "@fortawesome/fontawesome-svg-core";

import {
  FaArrowCircleLeft,
  FaArrowCircleRight,
  FaSave,
  FaTimes,
} from 'react-icons/fa';

pdfjs.GlobalWorkerOptions.workerSrc = '//cdn.jsdelivr.net/npm/pdfjs-dist@2.6.347/build/pdf.worker.js';

type NumberOrNull = number | null;

type PDFViewerProps = {
  scale: number;
  projectId: string;
  spotlightRef: React.RefObject<HTMLCanvasElement>;
};

export type CanvasLayer = {
  canvas: HTMLCanvasElement;
  id: number;
  projectId: string;
  pageNumber: number;
}

type Lasso = {
  image?: string | null,
  boundingBox: {
    x: number,
    y: number,
    width: number,
    height: number
  },
  lassoId: number | null
}

const PdfViewer = ({ scale, projectId, spotlightRef }: PDFViewerProps) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [clickedLasso, setClickedLasso] = useState<Lasso | null>(null);
  const [pageNumber, setPageNumber] = useRecoilState(pdfPageState);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [history, setHistory] = useRecoilState(historyState);
  const [redoStack, setRedoStack] = useRecoilState(redoStackState);
  const [toc, ] = useRecoilState(tocState);
  const [tocIndex, setTocIndexState] = useRecoilState(tocIndexState);
  const [focusedLasso, setFocusedLasso] = useRecoilState(focusedLassoState);
  const [addPrompt, setAddPrompt] = useState<boolean>(false);
  const [newPrompt, setNewPrompt] = useState<string>("");

  const viewerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const focusedLassoRef = useRef<HTMLCanvasElement>(null);
  const drawingsRef = useRef<CanvasLayer[]>([]);
  const selectedTool = useRecoilValue(toolState);
  const gridMode = useRecoilValue(gridModeState);
  const [isRecording, setIsRecording] = useRecoilState(recordingState);
  const [activePromptIndex, setActivePromptIndex] = useRecoilState(activePromptState);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [reloadFlag, setReloadFlag] = useRecoilState(reloadFlagState);
  const [pdfImages, setPdfImages] = useRecoilState(pdfImagesState);
  const [, setScriptMode] = useRecoilState(scriptModeState);
  const setNavigationState = useSetRecoilState(navigationState);
  const setProcessing = useSetRecoilState(processingState);
  const [defaultPrompts, setDefaultPrompts] = useRecoilState(defaultPromptsState);
  
  const lassoExists = useRef(false);
  const isLassoDrawing = useRef(false);
  const isDragging = useRef(false);
  const actuallyDragged = useRef(false);
  const lassoBox = useRef<{x1: NumberOrNull, y1: NumberOrNull, x2: NumberOrNull, y2: NumberOrNull}>({x1: null, y1: null, x2: null, y2: null});
  const dragOffset = useRef<{x: number, y: number} | null>(null);
  const capturedLayers = useRef<number[]>([]);
  const pageTimeline = useRef<{pageNum: number, start: number, end: number}[]>([]);
  const pageStart = useRef<number>(0);
  const pageTrack = useRef<number>(0);
  const fakeNewPrompts = useRef<string[]>([]);

  const refetchPromptsFlag = useRef(false);

  const setIsSaveClicked = useSetRecoilState(isSaveClickedState);

  const width = 700;
  const height = 600;

  const isReviewMode = useSearchParams().get("mode") === "review";

  const isCanvasBlank = (canvas: HTMLCanvasElement, range?: {x: number, y: number, width: number, height: number} | null) => {
    const context = canvas.getContext('2d');
    if(!context) return true;
  
    const pixelBuffer = new Uint32Array(
      context.getImageData(range?.x ?? 0, range?.y ?? 0, range?.width ?? canvas.width, range?.height ?? canvas.height).data.buffer
    );
  
    return !pixelBuffer.some(color => color !== 0);
  }

  useEffect(() => {
    const fetchPdfImages = async () => {
      const images = await getRawImages(projectId);
      setPdfImages(images);
      setNumPages(images.length);
    }
    fetchPdfImages();
  }, [projectId, setPdfImages]);

  useEffect(() => {
    const updateProjectPrompts = async () => {
      const prompts: string[] = await projectPrompts(projectId);
      console.log("prompts", prompts);
      setDefaultPrompts(prompts);
    }
    updateProjectPrompts();
  }, [projectId, refetchPromptsFlag.current]);

  const goToNextPage = useCallback(() => {
    switch (gridMode) {
      case 0: {
        const newPageNumber = Math.min(pageNumber + 1, numPages);
        const tocIndex = findTocIndex(newPageNumber, toc);
        if (tocIndex) {
          setTocIndexState(tocIndex);
        }
        setPageNumber(newPageNumber);
        break;
      }

      case 1: {
        const newToCIndex = { section: Math.min(tocIndex.section + 1, toc.length - 1), subsection: 0 };
        setTocIndexState(newToCIndex);
        setPageNumber(toc[newToCIndex.section].subsections[newToCIndex.subsection].page[0]); 
        break;
      }

      case 2: {
        let newToCIndex = null;
        if (tocIndex.subsection === toc[tocIndex.section].subsections.length - 1) {
          newToCIndex = { section: Math.min(tocIndex.section + 1, toc.length - 1), subsection: 0 };
        } else {
          newToCIndex = { section: tocIndex.section, subsection: tocIndex.subsection + 1 };
        }
        setTocIndexState(newToCIndex);
        setPageNumber(toc[newToCIndex.section].subsections[newToCIndex.subsection].page[0]); 
        break;
      }
    }
    setNavigationState(NavigationStateType.PAGE_CHANGED);
  }, [gridMode, numPages, pageNumber, setPageNumber, setTocIndexState, toc, tocIndex]);

  const goToPreviousPage = useCallback(() => {
    switch (gridMode) {
      case 0: {
        const newPageNumber = Math.max(pageNumber - 1, 1);
        const tocIndex = findTocIndex(newPageNumber, toc); 
        if (tocIndex) {
          setTocIndexState(tocIndex); 
        }
        setPageNumber(newPageNumber);
        break;
      }

      case 1: {
        const newToCIndex = { section: Math.max(tocIndex.section - 1, 0), subsection: 0 };
        setTocIndexState(newToCIndex);
        setPageNumber(toc[newToCIndex.section].subsections[newToCIndex.subsection].page[0]); 
        break;
      }

      case 2: {
        let newToCIndex = null;
        if (tocIndex.subsection === 0) {
          const newSectionIndex = Math.max(tocIndex.section - 1, 0);
          newToCIndex = { section: newSectionIndex, subsection: toc[newSectionIndex].subsections.length - 1 };
        } else {
          newToCIndex = { section: tocIndex.section, subsection: tocIndex.subsection - 1 };
        }
        setTocIndexState(newToCIndex);
        setPageNumber(toc[newToCIndex.section].subsections[newToCIndex.subsection].page[0]); 
        break;
      }
    }
    setNavigationState(NavigationStateType.PAGE_CHANGED);
  }, [gridMode, pageNumber, setPageNumber, setTocIndexState, toc, tocIndex]);

  const makeNewCanvas = useCallback(() => {
    const newCanvas = document.createElement("canvas");
    const newId = (drawingsRef.current.at(-1)?.id ?? 0)+ 1;
    newCanvas.id = `canvas_${newId}`;
    newCanvas.className = "multilayer-canvas";
    newCanvas.width = width;
    newCanvas.height = height;
    newCanvas.style.position = "absolute";
    newCanvas.style.top = "0";
    newCanvas.style.left = "0";
    newCanvas.style.width = "100%";
    newCanvas.style.height = "100%";
    newCanvas.style.zIndex = "2";
    newCanvas.style.pointerEvents = "none";
    canvasRef.current?.parentElement?.appendChild(newCanvas);
    drawingsRef.current = [...drawingsRef.current, {canvas:newCanvas, id:newId, projectId:projectId, pageNumber:pageNumber}];
    return {newCanvas, newId};
  }, [pageNumber, projectId]);

  useEffect(() => {
    const fetchPdf = async () => {
      try {
        const pdfBlob = await getPdf({ queryKey: ["pdfData", projectId] });
        const pdfUrl = URL.createObjectURL(pdfBlob);
        setPdfUrl(pdfUrl);
      } catch (error) {
        console.error("Failed to fetch PDF:", error);
      }
    };

    fetchPdf();
  }, [projectId]);

  useEffect(() => {
    const handleTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      startXRef.current = touch.clientX;
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (!startXRef.current) return;

      const touch = event.touches[0];
      const deltaX = touch.clientX - startXRef.current;

      if (deltaX > 50) {
        goToPreviousPage();
        startXRef.current = null;
      } else if (deltaX < -50) {
        goToNextPage();
        startXRef.current = null;
      }
    };

    const startXRef = { current: null as number | null };

    const viewer = viewerRef.current;
    if (viewer && (selectedTool !== "eraser" && selectedTool !== "pencil" && selectedTool !== "highlighter" && selectedTool !== "spinner")) {
      viewer.addEventListener("touchstart", handleTouchStart);
      viewer.addEventListener("touchmove", handleTouchMove);
    }

    return () => {
      if (viewer) {
        viewer.removeEventListener("touchstart", handleTouchStart);
        viewer.removeEventListener("touchmove", handleTouchMove);
      }
    };
  }, [goToNextPage, goToPreviousPage, numPages, selectedTool]);

  useEffect(() => {
    const canvas = focusedLassoRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);

    if (gridMode !== 0) return;

    const drawBorder = async () => {
      context.strokeStyle = "red";
      const lassoBox = await getLassoInfo(projectId, pageNumber, focusedLasso);
      if (lassoBox) {
        const xywh = lassoBox.bbox;
        context.strokeRect(xywh[0], xywh[1], xywh[2], xywh[3]);
      }
    }

    if (focusedLasso !== null) {
      drawBorder();
    }
  }, [focusedLasso, gridMode, pageNumber, projectId, setFocusedLasso]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);

    let topLayer = 0;

    let drawing = false;
    let erasing = false;
    let startX = 0;
    let startY = 0;
    // let highlightColor = "rgba(255, 255, 0, 0.1)";

    const startDrawing = (event: MouseEvent | TouchEvent) => {
      if (selectedTool === "pencil" || selectedTool === "highlighter") {
        const {newCanvas: layerCanvas, newId: layerId} = makeNewCanvas();
        const layerContext = layerCanvas.getContext("2d");
        if (layerContext) {
          drawing = true;
          const rect = layerCanvas.getBoundingClientRect();
          const scaleX = layerCanvas.width / rect.width;
          const scaleY = layerCanvas.height / rect.height;
          const x = ((event instanceof MouseEvent ? event.clientX : event.changedTouches[0].clientX) - rect.left) * scaleX;
          const y = ((event instanceof MouseEvent ? event.clientY : event.changedTouches[0].clientY) - rect.top) * scaleY;
          layerContext.beginPath();
          layerContext.moveTo(x, y);
          if (selectedTool === "highlighter") {
            layerContext.strokeStyle = "rgba(255, 255, 0, 0.02)";
            layerContext.lineWidth = 30;
          } else {
            layerContext.strokeStyle = "black";
            layerContext.lineWidth = 2;
          }
          layerContext.setLineDash([]);
          topLayer = layerId;
        }  
      } else if (selectedTool === "eraser") {
        const currentRefs = drawingsRef.current;
        drawingsRef.current = [];
        document.querySelectorAll(".multilayer-canvas").forEach((el) => el.remove());
        currentRefs.forEach((layer) => {
          const {newCanvas: layerCanvas, newId: layerId} = makeNewCanvas();
          const layerContext = layerCanvas.getContext("2d");
          if (layerContext) {
            layerContext.imageSmoothingEnabled = false;
            layerContext.drawImage(layer.canvas, 0, 0);
          }
        })
        erasing = true;
      }
    };
    
    const draw = (event: MouseEvent | TouchEvent) => {
      const topCanvas = drawingsRef.current.find((layer) => layer.id === topLayer)?.canvas;
      const topContext = topCanvas?.getContext("2d");
      if (!topCanvas || !topContext || !drawing) return;
      const rect = topCanvas.getBoundingClientRect();
      const scaleX = topCanvas.width / rect.width;
      const scaleY = topCanvas.height / rect.height;
      
      const x = ((event instanceof MouseEvent ? event.clientX : event.changedTouches[0].clientX) - rect.left) * scaleX;
      const y = ((event instanceof MouseEvent ? event.clientY : event.changedTouches[0].clientY) - rect.top) * scaleY;
      topContext.lineTo(x, y);
      topContext.stroke();
    };
    
    const stopDrawing = () => {
      if(erasing){
        erasing = false;
      } else {
        const topCanvas = drawingsRef.current.find((layer) => layer.id === topLayer)?.canvas; 
        const topContext = topCanvas?.getContext("2d");
        if (!topCanvas || !topContext || !drawing) return;
        drawing = false;
        topContext.closePath();
      }
      const filteredRefs = drawingsRef.current.filter((layer) => !isCanvasBlank(layer.canvas))
      drawingsRef.current.filter((layer) => isCanvasBlank(layer.canvas)).forEach((layer) => layer.canvas.remove());
      drawingsRef.current = [];
      filteredRefs.forEach((layer, idx) => {
        const drawingData = layer.canvas.toDataURL();
        localStorage.setItem(`drawings_${projectId}_${pageNumber}_${idx+1}`, drawingData);
        drawingsRef.current = [...drawingsRef.current, {canvas:layer.canvas, id:idx+1, projectId:projectId, pageNumber:pageNumber}];
      })
      localStorage.setItem(`numLayers_${projectId}_${pageNumber}`, String(drawingsRef.current.length));
      setHistory((prev) => [...prev, {pageNumber: pageNumber, layers: drawingsRef.current, id: getNewHistoryId()}]);
    };
    
    const erase = (event: MouseEvent | TouchEvent) => {
      if ((selectedTool !== "eraser") || !erasing) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = ((event instanceof MouseEvent ? event.clientX : event.changedTouches[0].clientX) - rect.left) * scaleX;
      const y = ((event instanceof MouseEvent ? event.clientY : event.changedTouches[0].clientY) - rect.top) * scaleY;
      for(const layer of drawingsRef.current) {
        const layerContext = layer.canvas.getContext("2d");
        if(layerContext){
          layerContext.clearRect(x-50, y-50, 100, 100);
        }
      }
    };
    
    const handleMouseMove = (event: MouseEvent | TouchEvent) => {
      if (selectedTool !== "spinner") {
        event.stopPropagation();
        event.preventDefault();
      }
      if (selectedTool === "eraser") {
        erase(event);
      } else {
        draw(event);
      }
    };
    
    // For mouse events
    canvas.addEventListener("mousedown", startDrawing);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", stopDrawing);
    canvas.addEventListener("mouseout", stopDrawing);

    // For touch events
    canvas.addEventListener("touchstart", startDrawing);
    canvas.addEventListener("touchmove", handleMouseMove);
    canvas.addEventListener("touchend", stopDrawing);
    
    return () => {
      // For mouse events
      canvas.removeEventListener("mousedown", startDrawing);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", stopDrawing);
      canvas.removeEventListener("mouseout", stopDrawing);

      // For touch events
      canvas.removeEventListener("touchstart", startDrawing);
      canvas.removeEventListener("touchmove", handleMouseMove);
      canvas.removeEventListener("touchend", stopDrawing);
    };
  }, [selectedTool, pageNumber, projectId, makeNewCanvas, setHistory]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!context || !canvas) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    drawingsRef.current = [];
    setClickedLasso(null);
    console.log("fnp", fakeNewPrompts.current);
    setDefaultPrompts((prev) => prev.filter((prompt) => !fakeNewPrompts.current.includes(prompt)));
    fakeNewPrompts.current = [];
    lassoExists.current = false;
    document.querySelectorAll(".multilayer-canvas").forEach((el) => el.remove());
    if (gridMode !== 0) return;
    const numLayers = localStorage.getItem(`numLayers_${projectId}_${pageNumber}`);
    for(let i = 1; i <= Number(numLayers); i++) {
      const savedDrawings = localStorage.getItem(`drawings_${projectId}_${pageNumber}_${i}`);
      if (savedDrawings) {
        const {newCanvas: layerCanvas, newId: layerId} = makeNewCanvas();
        const layerContext = layerCanvas.getContext("2d");
        if (layerContext) {
          const img = document.createElement('img');
          img.src = savedDrawings;
          img.onload = () => {
            layerContext.imageSmoothingEnabled = false;
            layerContext.clearRect(0, 0, canvas.width, canvas.height);
            layerContext.drawImage(img, 0, 0);
          };
        }
      }
    }
  }, [gridMode, makeNewCanvas, pageNumber, projectId]);

  const getImage = (lassoBox: {x: number, y: number, width: number, height: number}) => {
    console.log("getting Image");
    const pdfImage: HTMLImageElement | null = document.querySelector('.pdf-next-image');
    if (pdfImage === null) {
      console.error("no pdf image!");
      return "";
    }
    const canvas = canvasRef.current;
    if (!canvas){
      console.error("no canvas!");
      return "";
    }
    const pdfRect = pdfImage.getBoundingClientRect();
    console.log(pdfRect);
    console.log(pdfImage.width, pdfImage.height);
    const canvasRect = canvas.getBoundingClientRect();

    const xScale = canvasRect.width / canvas.width / pdfRect.width * pdfImage.naturalWidth;
    const yScale = canvasRect.height / canvas.height / pdfRect.height * pdfImage.naturalHeight;

    const x = lassoBox.x;
    const pdfx = x * xScale;
    const y = lassoBox.y;
    const pdfy = y * yScale
    const w = lassoBox.width;
    const pdfw = w * xScale;
    const h = lassoBox.height;
    const pdfh = h * yScale;

    const tmpCanvas = document.createElement("canvas");
    tmpCanvas.width = lassoBox.width * canvasRect.width / canvas.width;
    tmpCanvas.height = lassoBox.height * canvasRect.height / canvas.height;
    const tmpContext = tmpCanvas.getContext("2d");
    if (tmpContext) {
      tmpContext.imageSmoothingEnabled = false;
      tmpContext.clearRect(0, 0, tmpCanvas.width, tmpCanvas.height);
      tmpContext.drawImage(pdfImage, pdfx, pdfy, pdfw, pdfh, 0, 0, tmpCanvas.width, tmpCanvas.height);
      for (const layer of drawingsRef.current) {
        tmpContext.drawImage(layer.canvas, x, y, w, h, 0, 0, tmpCanvas.width, tmpCanvas.height);
      }
    }
    console.log("tmpcanvas", tmpCanvas.toDataURL());
    return tmpCanvas.toDataURL();
  }

  useEffect(() => {
    const handleUndoCanvas = (event: CustomEvent<HistoryType>) => {
      console.log("handleUndoCanvas");
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");
      if (!context || !canvas) return;

      const canvasLayers = event.detail ? event.detail.layers : [];
      drawingsRef.current = canvasLayers;
      if (drawingsRef.current === null) drawingsRef.current = [];
      document.querySelectorAll(".multilayer-canvas").forEach((el) => el.remove());
      context.clearRect(0, 0, canvas.width, canvas.height);
      const numLayers = drawingsRef.current.length;
      localStorage.setItem(`numLayers_${projectId}_${pageNumber}`, String(numLayers));
      for(let i = 1; i <= numLayers; i++) {
        canvasRef.current?.parentElement?.appendChild(drawingsRef.current[i-1].canvas);
      }
    };

    const handleRedoCanvas = (event: CustomEvent<HistoryType>) => {
      console.log("handleRedoCanvas");
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");
      if (!context || !canvas || !event.detail) return;

      const canvasLayers = event.detail.layers;
      drawingsRef.current = canvasLayers;
      document.querySelectorAll(".multilayer-canvas").forEach((el) => el.remove());
      context.clearRect(0, 0, canvas.width, canvas.height);
      const numLayers = drawingsRef.current.length;
      localStorage.setItem(`numLayers_${projectId}_${pageNumber}`, String(numLayers));
      for(let i = 1; i <= numLayers; i++) {
        canvasRef.current?.parentElement?.appendChild(drawingsRef.current[i-1].canvas);
      }
    };

    window.addEventListener('undoCanvas', handleUndoCanvas);
    window.addEventListener('redoCanvas', handleRedoCanvas);

    return () => {
      window.removeEventListener('undoCanvas', handleUndoCanvas);
      window.removeEventListener('redoCanvas', handleRedoCanvas);
    };
  }, [pageNumber, projectId]);

  const handleSave = async () => {
    try {
      const drawings: string[] = [];
      for (let i = 1; i <= numPages; i++) {
        const numLayers = Number(localStorage.getItem(`numLayers_${projectId}_${i}`));
        const tmpCanvas = document.createElement("canvas");
        tmpCanvas.width = width;
        tmpCanvas.height = height;
        const tmpContext = tmpCanvas.getContext("2d");
        if (tmpContext) {
          tmpContext.imageSmoothingEnabled = false;
          tmpContext.clearRect(0, 0, width, height);
          for (let l = 1; l <= numLayers; l++) {
            const drawingLayer = localStorage.getItem(`drawings_${projectId}_${i}_${l}`);
            if (drawingLayer) {
              const img = document.createElement('img');
              img.src = drawingLayer;
              await img.decode();
              tmpContext.drawImage(img, 0, 0);
            }
          }
          drawings.push(tmpCanvas.toDataURL());
        }
      }
      setProcessing({isProcessing: true, message: "Saving annotated pdf..."});
      await saveAnnotatedPdf(projectId, drawings);
      console.log("Annotated PDF saved successfully");
      setProcessing({isProcessing: false, message: ""});
      
      // Update the Recoil state to enable the useQuery call
      setIsSaveClicked(true);

    } catch (error) {
      console.error("Failed to save annotated PDF:", error);
      alert("Failed to save annotated PDF");
      setProcessing({isProcessing: false, message: ""});
    };
  };

  useEffect(() => {
    const handleMic = async () => {
      if (!isRecording) {
        mediaRecorderRef.current?.stop();
        // setIsRecording(!isRecording);
      } 
      else {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.start();
        // setIsRecording(!isRecording);
  
        const audioChunks: Blob[] = [];
        mediaRecorder.ondataavailable = (event) => {
          audioChunks.push(event.data);
        };
  
        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
          const formData = new FormData();
          formData.append('recording', audioBlob, 'recording.webm');

          // pageTimeline을 JSON 문자열로 변환하여 FormData에 추가
          formData.append('timestamp', JSON.stringify(pageTimeline.current));
          
          const drawings: string[] = [];
          for (let i = 1; i <= numPages; i++) {
            const numLayers = Number(localStorage.getItem(`numLayers_${projectId}_${i}`));
            const tmpCanvas = document.createElement("canvas");
            tmpCanvas.width = width;
            tmpCanvas.height = height;
            const tmpContext = tmpCanvas.getContext("2d");
            if (tmpContext) {
              tmpContext.imageSmoothingEnabled = false;
              tmpContext.clearRect(0, 0, width, height);
              for (let l = 1; l <= numLayers; l++) {
                const drawingLayer = localStorage.getItem(`drawings_${projectId}_${i}_${l}`);
                if (drawingLayer) {
                  const img = document.createElement('img');
                  img.src = drawingLayer;
                  await img.decode();
                  tmpContext.drawImage(img, 0, 0);
                }
              }
              drawings.push(tmpCanvas.toDataURL());
            }
          }
          formData.append('drawings', JSON.stringify(drawings));

          try {
            setProcessing({isProcessing: true, message: "Saving recorded lecture audio..."});
            await saveRecording(projectId, formData); // 서버에 녹음 파일 저장
            console.log("Recording saved successfully");
            setProcessing({isProcessing: false, message: ""});
            pageTimeline.current = [];
          } catch (error) {
            console.error("Failed to save recording:", error);
            alert("Failed to save recorded lecture audio.");
            setProcessing({isProcessing: false, message: ""});
          }
        };
      }
    };

    if (isRecording) {
      console.log("Recording started");
      handleMic();
    } else if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
  }, [isRecording, projectId]);

  useEffect(() => { // Timer
    let interval: NodeJS.Timer;
    if (isRecording) {
      if (pageTrack.current === 0) {
        pageTrack.current = pageNumber;
        pageStart.current = recordingTime;
      } else if (pageTrack.current !== pageNumber) {
        pageTimeline.current = [...pageTimeline.current, {pageNum: pageTrack.current, start: pageStart.current, end: recordingTime}];
        pageTrack.current = pageNumber;
        pageStart.current = recordingTime;
      }
      interval = setInterval(() => setRecordingTime(recordingTime + 10), 10);
    } else {
      if (pageTrack.current !== 0) {
        pageTimeline.current = [...pageTimeline.current, {pageNum: pageTrack.current, start: pageStart.current, end: recordingTime}];
        pageStart.current = 0;
        pageTrack.current = 0;
        setRecordingTime(0);
      }
    }
    return () => clearInterval(interval);
  }, [recordingTime, isRecording]);

  useEffect(() => { // lasso
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    const slideCanvas = (target: HTMLCanvasElement, x: number, y: number) => {
      const tmpCanvas = document.createElement("canvas");
      tmpCanvas.width = target.width;
      tmpCanvas.height = target.height;
      const targetCtx = target.getContext("2d");
      const tmpCtx = tmpCanvas.getContext("2d");
      if (targetCtx && tmpCtx) {
        tmpCtx.imageSmoothingEnabled = false;
        targetCtx.imageSmoothingEnabled = false;
        tmpCtx.clearRect(0, 0, target.width, target.height);
        tmpCtx.drawImage(target, 0, 0);
        targetCtx.clearRect(0, 0, target.width, target.height);
        targetCtx.drawImage(tmpCanvas, x, y);
      }
    }
  
    if (selectedTool === "spinner" && canvas && context) {
      const clearLasso = () => {
        lassoExists.current = false;
        lassoBox.current = {x1: null, y1: null, x2: null, y2: null};
        context.clearRect(0, 0, canvas.width, canvas.height);
        console.log("fnp from cl", fakeNewPrompts.current);
        setDefaultPrompts((prev) => prev.filter((prompt) => !fakeNewPrompts.current.includes(prompt)));
        fakeNewPrompts.current = [];
        setClickedLasso(null);
      }

      const handleMouseDown = (event: MouseEvent | TouchEvent) => {        
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = ((event instanceof MouseEvent ? event.clientX : event.changedTouches[0].clientX) - rect.left) * scaleX;
        const y = ((event instanceof MouseEvent ? event.clientY : event.changedTouches[0].clientY) - rect.top) * scaleY;
        
        if (isDragging.current) return;
        
        if (lassoExists.current) {
          if (!isPointInPath(lassoBox.current, x, y)) {
            clearLasso();
            isLassoDrawing.current = true;
            lassoBox.current = { x1: x, y1: y, x2: null, y2: null };
            context.beginPath();
            context.moveTo(x, y);
            context.setLineDash([5, 5]);
            context.strokeStyle = "black";
            context.lineWidth = 1;
          } else {
            dragOffset.current = {
              x: x,
              y: y,
            };
            const currentRefs = drawingsRef.current;
            drawingsRef.current = [];
            document.querySelectorAll(".multilayer-canvas").forEach((el) => el.remove());
            currentRefs.forEach((layer) => {
              const {newCanvas: layerCanvas, newId: layerId} = makeNewCanvas();
              const layerContext = layerCanvas.getContext("2d");
              if (layerContext) {
                layerContext.imageSmoothingEnabled = false;
                layerContext.drawImage(layer.canvas, 0, 0);
              }
            })
            isDragging.current = true;
            actuallyDragged.current = false;
          }
        } else if (!lassoExists.current) {
          isLassoDrawing.current = true;
          lassoBox.current = { x1: x, y1: y, x2: null, y2: null };
          context.beginPath();
          context.moveTo(x, y);
          context.setLineDash([5, 5]);
          context.strokeStyle = "black";
          context.lineWidth = 1;
        }
      };

      const nullfreeStrokerect = (context: CanvasRenderingContext2D, box: {x1: NumberOrNull, y1: NumberOrNull, x2: NumberOrNull, y2: NumberOrNull}) => {
        if (box.x1 && box.y1 && box.x2 && box.y2) {
          context.strokeRect(Math.min(box.x1, box.x2), Math.min(box.y1, box.y2), Math.abs(box.x2 - box.x1), Math.abs(box.y2 - box.y1));
        }
      }

      const slideBox = (box: {x1: NumberOrNull, y1: NumberOrNull, x2: NumberOrNull, y2: NumberOrNull}, x: number, y: number) => {
        return {
          x1: box.x1 ? box.x1 + x : null,
          y1: box.y1 ? box.y1 + y : null,
          x2: box.x2 ? box.x2 + x : null,
          y2: box.y2 ? box.y2 + y : null,
        };
      }

      const boxBounds = (box: {x1: NumberOrNull, y1: NumberOrNull, x2: NumberOrNull, y2: NumberOrNull}) => {
        return {
          x: (box.x1 && box.x2) ? Math.min(box.x1, box.x2) : 0,
          y: (box.y1 && box.y2) ? Math.min(box.y1, box.y2) : 0,
          width: (box.x1 && box.x2) ? Math.abs(box.x2 - box.x1) : 0,
          height: (box.y1 && box.y2) ? Math.abs(box.y2 - box.y1) : 0,
        };
      }
  
      const handleMouseMove = (event: MouseEvent | TouchEvent) => {
        if (isDragging.current) {
          actuallyDragged.current = true;
          handleLassoDragMove(event);
          return;
        }
        if (!isLassoDrawing.current) return;
  
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = ((event instanceof MouseEvent ? event.clientX : event.changedTouches[0].clientX) - rect.left) * scaleX;
        const y = ((event instanceof MouseEvent ? event.clientY : event.changedTouches[0].clientY) - rect.top) * scaleY;
  
        lassoBox.current = {x1: lassoBox.current.x1, y1: lassoBox.current.y1, x2: x, y2: y};
        context.clearRect(0, 0, canvas.width, canvas.height);
        nullfreeStrokerect(context, lassoBox.current);
      };
  
      const handleMouseUp = (event: MouseEvent | TouchEvent) => {
        if (isDragging.current) {
          isDragging.current = false;

          if (!actuallyDragged.current) {
            // lasso exists and clicked inside lasso
            setClickedLasso({boundingBox: boxBounds(lassoBox.current), lassoId: null});
            
            return;
          }
          actuallyDragged.current = false;

          const capturedList = capturedLayers.current;

          const rect = canvas.getBoundingClientRect();
          const scaleX = canvas.width / rect.width;
          const scaleY = canvas.height / rect.height;
          const x = ((event instanceof MouseEvent ? event.clientX : event.changedTouches[0].clientX) - rect.left) * scaleX;
          const y = ((event instanceof MouseEvent ? event.clientY : event.changedTouches[0].clientY) - rect.top) * scaleY;

          const newX = x - (dragOffset.current?.x ?? 0);
          const newY = y - (dragOffset.current?.y ?? 0);

          dragOffset.current = null;
          lassoBox.current = slideBox(lassoBox.current, newX, newY);
          slideCanvas(canvas, newX, newY);

          const tmpRefs = drawingsRef.current;
          drawingsRef.current = [];
          for (const layer of tmpRefs) {
            const layerContext = layer.canvas.getContext("2d");
            if (layerContext) {
              if(capturedList.find((layerId) => layerId === layer.id)){
                slideCanvas(layer.canvas, newX, newY);
              }
              localStorage.setItem(`drawings_${projectId}_${pageNumber}_${layer.id}`, layer.canvas.toDataURL());
              drawingsRef.current = [...drawingsRef.current, {canvas:layer.canvas, id:layer.id, projectId:projectId, pageNumber:pageNumber}];
            }
          }
          setHistory((prev) => [...prev, {pageNumber: pageNumber, layers: drawingsRef.current, id: getNewHistoryId()}]);

          return;
        }
        if (!isLassoDrawing.current) return;
  
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = ((event instanceof MouseEvent ? event.clientX : event.changedTouches[0].clientX) - rect.left) * scaleX;
        const y = ((event instanceof MouseEvent ? event.clientY : event.changedTouches[0].clientY) - rect.top) * scaleY;
        
        lassoBox.current = {x1: lassoBox.current.x1, y1: lassoBox.current.y1, x2: x, y2: y};
        context.clearRect(0, 0, canvas.width, canvas.height);
        nullfreeStrokerect(context, lassoBox.current);
  
        if(lassoBox.current.x1 === lassoBox.current.x2 || lassoBox.current.y1 === lassoBox.current.y2) {
          lassoBox.current = {x1: null, y1: null, x2: null, y2: null};
          lassoExists.current = false;
        } else {
          lassoExists.current = true;
          capturedLayers.current = [];
          for(const layer of drawingsRef.current) {
            if(!isCanvasBlank(layer.canvas, boxBounds(lassoBox.current))){
              capturedLayers.current.push(layer.id);
            }
          }           
        }

        isLassoDrawing.current = false;
      };
  
      const handleLassoDragMove = (event: MouseEvent | TouchEvent) => {
        if (!dragOffset.current || !lassoBox.current.x2 ) return;

        const capturedList = capturedLayers.current;
  
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = ((event instanceof MouseEvent ? event.clientX : event.changedTouches[0].clientX) - rect.left) * scaleX;
        const y = ((event instanceof MouseEvent ? event.clientY : event.changedTouches[0].clientY) - rect.top) * scaleY;

        const newX = x - dragOffset.current.x;
        const newY = y - dragOffset.current.y;
        lassoBox.current = slideBox(lassoBox.current, newX, newY);
        
        dragOffset.current = {x, y};

        slideCanvas(canvas, newX, newY);
        const tmpRefs = drawingsRef.current;
        drawingsRef.current = [];
        for (const layer of tmpRefs) {
          const layerContext = layer.canvas.getContext("2d");
          if (layerContext) {
            if(capturedList.find((layerId) => layerId === layer.id)){
              slideCanvas(layer.canvas, newX, newY);
            }
            drawingsRef.current = [...drawingsRef.current, {canvas:layer.canvas, id:layer.id, projectId:projectId, pageNumber:pageNumber}];
          }
        }
      };
  
      canvas.addEventListener("mousedown", handleMouseDown);
      canvas.addEventListener("mousemove", handleMouseMove);
      canvas.addEventListener("mouseup", handleMouseUp);
      canvas.addEventListener("mouseleave", handleMouseUp);
      
      canvas.addEventListener("touchstart", handleMouseDown);
      canvas.addEventListener("touchmove", handleMouseMove);
      canvas.addEventListener("touchend", handleMouseUp);
  
      return () => {
        canvas.removeEventListener("mousedown", handleMouseDown);
        canvas.removeEventListener("mousemove", handleMouseMove);
        canvas.removeEventListener("mouseup", handleMouseUp);
        canvas.removeEventListener("mouseleave", handleMouseUp);
        
        canvas.removeEventListener("touchstart", handleMouseDown);
        canvas.removeEventListener("touchmove", handleMouseMove);
        canvas.removeEventListener("touchend", handleMouseUp);
      };
    }
  }, [selectedTool, projectId, pageNumber, setHistory, makeNewCanvas]);  


  const isPointInPath = (box: {x1: NumberOrNull, y1: NumberOrNull, x2: NumberOrNull, y2: NumberOrNull}, x: number, y: number) => {
    if (box.x1 === null || box.y1 === null || box.x2 === null || box.y2 === null) return false;
    if (box.x1 > box.x2) {
      if (box.y1 > box.y2) {
        return (x >= box.x2 && x <= box.x1 && y >= box.y2 && y <= box.y1);
      } else {
        return (x >= box.x2 && x <= box.x1 && y >= box.y1 && y <= box.y2);
      }
    } else {
      if (box.y1 > box.y2) {
        return (x >= box.x1 && x <= box.x2 && y >= box.y2 && y <= box.y1);
      } else {
        return (x >= box.x1 && x <= box.x2 && y >= box.y1 && y <= box.y2);
      }
    }
  };

  let pageComponents = [];
  switch (gridMode) {
    case 0: {
      pageComponents.push(
        <ImagePage
          className="shadow-2xl"
          key={pageNumber}
          projectId={projectId}
          pageNumber={pageNumber}
        />
      );
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
        pageComponents.push(
          <ImagePage
            className={
              "flex items-center justify-center " +
              (isReviewMode && startIndex + i === pageNumber
                ? "shadow-md border-4 border-blue-500"
                : "")
            }
            key={i}
            projectId={projectId}
            pageNumber={startIndex + i}
            divisions={2}
          />
        );
      }
      break;
    }

    case 2: {
      const section = toc[tocIndex.section];
      const subsection = section.subsections[tocIndex.subsection];
      for (const page of subsection.page) {
        pageComponents.push(
          <ImagePage
            className={
              "flex items-center justify-center " +
              (isReviewMode && page === pageNumber
                ? "shadow-md border-4 border-blue-500"
                : "")
            }
            key={page}
            projectId={projectId}
            pageNumber={page}
            divisions={2}
          />
        );
      }
      break;
    }
  }

  const PromptList = (props: {promptStrings: string[]}) => {
    if (!clickedLasso) return <></>;

    const prompts = props.promptStrings;

    const boxToArray = (lassoBox: {x: number, y: number, width: number, height: number}) => {
      return [lassoBox.x, lassoBox.y, lassoBox.width, lassoBox.height];
    }

    const handleRemove = (prompt: string) => async () => {
      await removeLassoPrompt(projectId, prompt);
      console.log(defaultPrompts);
      console.log(defaultPrompts.filter((p) => p !== prompt));
      setDefaultPrompts((prev) => prev.filter((p) => p !== prompt));
      setReloadFlag((prev) => !prev);
      refetchPromptsFlag.current = !refetchPromptsFlag.current;
    }

    const handlePrompt = (prompt: string, idx: number) => async (e: React.MouseEvent) => {
      e.preventDefault();
      console.log("clickedLasso", clickedLasso);
      const image = (clickedLasso.image && (clickedLasso.image !== null)) ? clickedLasso.image : getImage(clickedLasso.boundingBox);
      console.log(image);
      setProcessing({isProcessing: true, message: "Querying lasso..."});
      const response = await lassoQuery(projectId, pageNumber, prompt, image, boxToArray(clickedLasso.boundingBox), clickedLasso.lassoId);
      setProcessing({isProcessing: false, message: ""});
      setReloadFlag((prev) => !prev);
      setFocusedLasso(response.lasso_id);
      setClickedLasso({...clickedLasso, lassoId: response.lasso_id});
      setScriptMode("prompts");
      setActivePromptIndex([response.lasso_id, prompt, 0]);
      if (!defaultPrompts.find((p) => p === prompt)) {
        setDefaultPrompts((prev) => [...prev, prompt]);
        refetchPromptsFlag.current = !refetchPromptsFlag.current;
      }
      if (fakeNewPrompts.current.find((p) => p === prompt)) {
        fakeNewPrompts.current = fakeNewPrompts.current.filter((p) => p !== prompt);
      }
      console.log(response);
    }

    const handleAddPrompt = (e: React.MouseEvent) => {
      e.preventDefault();
      setAddPrompt(true);
    }

    const handleNewPrompt = () => {
      setDefaultPrompts((prev) => [...prev, newPrompt]);
      fakeNewPrompts.current = [...fakeNewPrompts.current, newPrompt];
      setAddPrompt(false);
      setNewPrompt("");
    }

    const rect = canvasRef.current?.getBoundingClientRect();
    if(!rect || !canvasRef.current) return <></>;
    const scaleX = canvasRef.current?.width / rect?.width;
    const scaleY = canvasRef.current?.height / rect?.height;

    return (
      <>
        <ul
          className="prompt-list"
          key="prompt-list"
          style={{
            position: "absolute",
            top: clickedLasso.boundingBox.y / scaleY,
            left: clickedLasso.boundingBox.x / scaleX,
            color: "black",
            background: "gray",
            zIndex: 20,
          }}
        >
          {prompts.map((prompt, idx) => {
            return (
              <li
                key={idx}
                style={{
                  display: "inline-flex",
                }}
              >
                <div
                  onClick={handlePrompt(prompt, idx)}
                >
                {prompt}
                </div>
                <button
                  onClick={handleRemove(prompt)}
                  className={"ml-2 mr-0"}
                >
                  <FaTimes />
                </button>
              </li>
            )
          })}
          {!addPrompt && <li
            key={-1}
            onClick={handleAddPrompt}
            style={{
              display: "inline",
            }}
          >+</li>}
          {addPrompt && <li
            key={-1}
            style={{
              display: "inline",
            }}
          >
            <input
              type="text"
              autoFocus
              value={newPrompt}
              onChange={(e) => setNewPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleNewPrompt();
                }
              }}  
            />
          </li>}
        </ul>
      </>
    )
  }

  return (
    <div className="flex w-full flex-col items-center">
      <div className="flex w-full justify-center">
        <div
          className="relative flex flex-col w-full items-center"
          ref={viewerRef}
        >
          <div
            className={
              "overflow-y-auto w-fit " +
              (isReviewMode ? "max-h-[56dvh] " : "max-h-[80dvh] ") +
              (gridMode !== 0 ? "grid grid-cols-2 justify-items-center" : "shadow-xl ")
            }
          >
            {pageComponents}
          </div>
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              zIndex: 1,
              pointerEvents:
                selectedTool === "pencil" ||
                selectedTool === "highlighter" ||
                selectedTool === "eraser" ||
                selectedTool === "spinner"
                  ? "auto"
                  : "none",
            }}
          />
          <canvas
            ref={spotlightRef}
            width={width}
            height={height}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              zIndex: 3,
              pointerEvents: "none",
            }}
          />
          <canvas
            ref={focusedLassoRef}
            width={width}
            height={height}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              zIndex: 1,
              pointerEvents: "none",
            }}
          />

          {clickedLasso !== null && isReviewMode && <PromptList promptStrings={defaultPrompts} />}
        </div>
      </div>
      <div className="relative w-[60vw] h-10 z-[2] text-sm my-4">
        <button
          className="absolute right-[51%] w-28 justify-center h-10 flex items-center bg-slate-600 text-white p-2 rounded disabled:text-zinc-400"
          onClick={goToPreviousPage}
          disabled={pageNumber <= 1}
        >
          <FaArrowCircleLeft className="w-fit h-4 mr-2" />
          Previous
        </button>
        <button
          className="absolute left-[51%] flex w-28 justify-center h-10 items-center bg-slate-600 text-white p-2 rounded disabled:text-zinc-400"
          onClick={goToNextPage}
          disabled={
            gridMode === 0
              ? pageNumber >= numPages
              : gridMode === 1
              ? tocIndex.section >= toc.length - 1
              : tocIndex.section >= toc.length - 1 &&
                tocIndex.subsection >=
                  toc[tocIndex.section].subsections.length - 1
          }
        >
          Next
          <FaArrowCircleRight className="w-fit h-4 ml-2" />
        </button>
        <button
          className="absolute right-[5%] flex w-28 justify-center h-10 items-center bg-slate-600 text-white p-2 rounded"
          onClick={handleSave}
        >
          <FaSave className="w-fit h-4 mr-2" />
          Save
        </button>
      </div>
    </div>
  );
};

export default PdfViewer;
