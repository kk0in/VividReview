declare global {
  interface WindowEventMap {
    undoCanvas: CustomEvent<CanvasLayer[]>;
    redoCanvas: CustomEvent<CanvasLayer[]>;
  }
}

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { useRecoilValue, useRecoilState } from "recoil";
import { toolState, recordingState, gridModeState } from "@/app/recoil/ToolState";
import { historyState, redoStackState } from "@/app/recoil/HistoryState";
import { pdfPageState, tocState, tocIndexState } from "@/app/recoil/ViewerState";
import { lassoState, Lasso, defaultPrompts } from "@/app/recoil/LassoState";
import { saveAnnotatedPdf, getPdf, saveRecording, lassoQuery } from "@/utils/api";
import "./Lasso.css";
// import { layer } from "@fortawesome/fontawesome-svg-core";

pdfjs.GlobalWorkerOptions.workerSrc = '//cdn.jsdelivr.net/npm/pdfjs-dist@2.6.347/build/pdf.worker.js';

type NumberOrNull = number | null;

type PDFViewerProps = {
  scale: number;
  projectId: string;
};

export type CanvasLayer = {
  canvas: HTMLCanvasElement;
  id: number;
  projectId: string;
  pageNumber: number;
}

const PdfViewer = ({ scale, projectId }: PDFViewerProps) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [clickedLasso, setClickedLasso] = useState<Lasso | null>(null);
  const [pageNumber, setPageNumber] = useRecoilState(pdfPageState);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [history, setHistory] = useRecoilState(historyState);
  const [redoStack, setRedoStack] = useRecoilState(redoStackState);
  const [toc, ] = useRecoilState(tocState);
  const [tocIndex, setTocIndexState] = useRecoilState(tocIndexState);
  const [lassoRec, setLassoRec] = useRecoilState(lassoState);
  const [addPrompt, setAddPrompt] = useState<boolean>(false);
  const [newPrompt, setNewPrompt] = useState<string>("");

  const viewerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingsRef = useRef<CanvasLayer[]>([]);
  const selectedTool = useRecoilValue(toolState);
  const gridMode = useRecoilValue(gridModeState);
  const [isRecording, setIsRecording] = useRecoilState(recordingState);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  
  const lassoExists = useRef(false);
  const isLassoDrawing = useRef(false);
  const isDragging = useRef(false);
  const actuallyDragged = useRef(false);
  const lassoBox = useRef<{x1: NumberOrNull, y1: NumberOrNull, x2: NumberOrNull, y2: NumberOrNull}>({x1: null, y1: null, x2: null, y2: null});
  const dragOffset = useRef<{x: number, y: number} | null>(null);
  const capturedLayers = useRef<number[]>([]);

  const width = 700;
  const height = 600;

  const isCanvasBlank = (canvas: HTMLCanvasElement, range?: {x: number, y: number, width: number, height: number} | null) => {
    const context = canvas.getContext('2d');
    if(!context) return true;
  
    const pixelBuffer = new Uint32Array(
      context.getImageData(range?.x ?? 0, range?.y ?? 0, range?.width ?? canvas.width, range?.height ?? canvas.height).data.buffer
    );
  
    return !pixelBuffer.some(color => color !== 0);
  }

  const onDocumentLoadSuccess = ({ numPages }: pdfjs.PDFDocumentProxy) => {
    setNumPages(numPages);
  };
  
  const onDocumentError = (error: Error) => {
    console.log("pdf viewer error", error);
  };
  
  const onDocumentLocked = () => {
    console.log("pdf locked");
  };

  const findToCIndex = useCallback((page: number) => {
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
  }, [toc])

  const goToNextPage = useCallback(() => {
    switch (gridMode) {
      case 0: {
        const newPageNumber = Math.min(pageNumber + 1, numPages);
        const tocIndex = findToCIndex(newPageNumber);
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
  }, [findToCIndex, gridMode, numPages, pageNumber, setPageNumber, setTocIndexState, toc, tocIndex]);

  const goToPreviousPage = useCallback(() => {
    switch (gridMode) {
      case 0: {
        const newPageNumber = Math.max(pageNumber - 1, 1);
        const tocIndex = findToCIndex(newPageNumber); 
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
  }, [findToCIndex, gridMode, pageNumber, setPageNumber, setTocIndexState, toc, tocIndex]);

  const makeNewCanvas = useCallback(() => {
    const newCanvas = document.createElement("canvas");
    console.log(drawingsRef.current);
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
    if (viewer) {
      viewer.addEventListener("touchstart", handleTouchStart);
      viewer.addEventListener("touchmove", handleTouchMove);
    }

    return () => {
      if (viewer) {
        viewer.removeEventListener("touchstart", handleTouchStart);
        viewer.removeEventListener("touchmove", handleTouchMove);
      }
    };
  }, [goToNextPage, goToPreviousPage, numPages]);

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

    const startDrawing = (event: MouseEvent) => {
      if (selectedTool === "pencil" || selectedTool === "highlighter") {
        const {newCanvas: layerCanvas, newId: layerId} = makeNewCanvas();
        const layerContext = layerCanvas.getContext("2d");
        if (layerContext) {
          drawing = true;
          const rect = layerCanvas.getBoundingClientRect();
          const scaleX = layerCanvas.width / rect.width;
          const scaleY = layerCanvas.height / rect.height;
          const x = (event.clientX - rect.left) * scaleX;
          const y = (event.clientY - rect.top) * scaleY;
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
    
    const draw = (event: MouseEvent) => {
      const topCanvas = drawingsRef.current.find((layer) => layer.id === topLayer)?.canvas;
      const topContext = topCanvas?.getContext("2d");
      if (!topCanvas || !topContext || !drawing) return;
      const rect = topCanvas.getBoundingClientRect();
      const scaleX = topCanvas.width / rect.width;
      const scaleY = topCanvas.height / rect.height;
      const x = (event.clientX - rect.left) * scaleX;
      const y = (event.clientY - rect.top) * scaleY;
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
      setHistory((prev) => [...prev, drawingsRef.current]);
    };
    
    const erase = (event: MouseEvent) => {
      if ((selectedTool !== "eraser") || !erasing) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (event.clientX - rect.left) * scaleX;
      const y = (event.clientY - rect.top) * scaleY;
      for(const layer of drawingsRef.current) {
        const layerContext = layer.canvas.getContext("2d");
        if(layerContext){
          layerContext.clearRect(x-50, y-50, 100, 100);
        }
      }
    };
    
    const handleMouseMove = (event: MouseEvent) => {
      if (selectedTool === "eraser") {
        erase(event);
      } else {
        draw(event);
      }
    };
    
    canvas.addEventListener("mousedown", startDrawing);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", stopDrawing);
    canvas.addEventListener("mouseout", stopDrawing);
    
    return () => {
      canvas.removeEventListener("mousedown", startDrawing);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", stopDrawing);
      canvas.removeEventListener("mouseout", stopDrawing);
    };
  }, [selectedTool, pageNumber, projectId, makeNewCanvas, setHistory]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!context || !canvas) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    drawingsRef.current = [];
    document.querySelectorAll(".multilayer-canvas").forEach((el) => el.remove());
    const numLayers = localStorage.getItem(`numLayers_${projectId}_${pageNumber}`);
    for(let i = 1; i <= Number(numLayers); i++) {
      const savedDrawings = localStorage.getItem(`drawings_${projectId}_${pageNumber}_${i}`);
      if (savedDrawings) {
        const {newCanvas: layerCanvas, newId: layerId} = makeNewCanvas();
        const layerContext = layerCanvas.getContext("2d");
        if (layerContext) {
          const img = new Image();
          img.src = savedDrawings;
          img.onload = () => {
            layerContext.imageSmoothingEnabled = false;
            layerContext.clearRect(0, 0, canvas.width, canvas.height);
            layerContext.drawImage(img, 0, 0);
          };
        }
      }
    }
  }, [makeNewCanvas, pageNumber, projectId]);

  const getImage = (lassoBox: {x: number, y: number, width: number, height: number}) => {
    const x = lassoBox.x;
    const y = lassoBox.y;
    const w = lassoBox.width;
    const h = lassoBox.height;
    const canvas = canvasRef.current;
    if (!canvas) return "";
    const numLayers = Number(localStorage.getItem(`numLayers_${projectId}_${pageNumber}`));
    const tmpCanvas = document.createElement("canvas");
    tmpCanvas.width = w;
    tmpCanvas.height = h;
    const tmpContext = tmpCanvas.getContext("2d");
    if (tmpContext) {
      tmpContext.imageSmoothingEnabled = false;
      tmpContext.clearRect(0, 0, w, h);
      for (let l = 1; l <= numLayers; l++) {
        const drawingLayer = localStorage.getItem(`drawings_${projectId}_${pageNumber}_${l}`);
        if (drawingLayer) {
          const img = new Image();
          img.src = drawingLayer;
          img.onload = () => {
            tmpContext.drawImage(img, x, y, w, h, 0, 0, w, h);
            if (l === numLayers){
              return tmpCanvas.toDataURL();
            }
          }; 
        }
      }
    }
    return "";
  }

  useEffect(() => {
    const handleUndoCanvas = (event: {detail: CanvasLayer[]}) => {
      console.log("handleUndoCanvas");
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");
      if (!context || !canvas) return;

      const canvasLayers = event.detail;
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

    const handleRedoCanvas = (event: CustomEvent<CanvasLayer[]>) => {
      console.log("handleRedoCanvas");
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");
      if (!context || !canvas) return;

      const canvasLayers = event.detail;
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
    const canvas = canvasRef.current;
    if (canvas) {
      try {
        const drawings: Record<number, string> = {};
        for (let i = 1; i <= numPages; i++) {
          const numLayers = Number(localStorage.getItem(`numLayers_${projectId}_${i}`));
          console.log('numLayers', numLayers);
          const tmpCanvas = document.createElement("canvas");
          tmpCanvas.width = canvas.width;
          tmpCanvas.height = canvas.height;
          const tmpContext = tmpCanvas.getContext("2d");
          if (tmpContext) {
            tmpContext.imageSmoothingEnabled = false;
            tmpContext.clearRect(0, 0, canvas.width, canvas.height);
            for (let l = 1; l <= numLayers; l++) {
              const drawingLayer = localStorage.getItem(`drawings_${projectId}_${i}_${l}`);
              if (drawingLayer) {
                const img = new Image();
                img.src = drawingLayer;
                img.onload = () => {
                  tmpContext.drawImage(img, 0, 0);
                  if (l === numLayers){
                    console.log("hello!");
                    drawings[i] = tmpCanvas.toDataURL();
                    console.log(drawings[i]);
                  }
                }; 
              }
            }
          }
        }
        await saveAnnotatedPdf(projectId, drawings, numPages);
        console.log("Annotated PDF saved successfully");
      } catch (error) {
        console.error("Failed to save annotated PDF:", error);
      }
    }
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
          try {
            await saveRecording(projectId, formData); // 서버에 녹음 파일 저장
            console.log("Recording saved successfully");
          } catch (error) {
            console.error("Failed to save recording:", error);
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
        setClickedLasso(null);
      }

      const handleMouseDown = (event: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (event.clientX - rect.left) * scaleX;
        const y = (event.clientY - rect.top) * scaleY;
        
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
  
      const handleMouseMove = (event: MouseEvent) => {
        if (isDragging.current) {
          actuallyDragged.current = true;
          handleLassoDragMove(event);
          return;
        }
        if (!isLassoDrawing.current) return;
  
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (event.clientX - rect.left) * scaleX;
        const y = (event.clientY - rect.top) * scaleY;
  
        lassoBox.current = {x1: lassoBox.current.x1, y1: lassoBox.current.y1, x2: x, y2: y};
        context.clearRect(0, 0, canvas.width, canvas.height);
        nullfreeStrokerect(context, lassoBox.current);
      };
  
      const handleMouseUp = (event: MouseEvent) => {
        if (isDragging.current) {
          isDragging.current = false;

          if (!actuallyDragged.current) {
            // lasso exists and clicked inside lasso
            const newLassoRec = {...lassoRec};

            if (!newLassoRec[projectId]){
              newLassoRec[projectId] = {};
            } else newLassoRec[projectId] = {...lassoRec[projectId]};
            if (!newLassoRec[projectId][pageNumber]){
              newLassoRec[projectId][pageNumber] = [];
            }
            newLassoRec[projectId][pageNumber] = [...newLassoRec[projectId][pageNumber], {boundingBox: boxBounds(lassoBox.current), lassoId: null, prompts: defaultPrompts}];
            setLassoRec(newLassoRec);

            setClickedLasso({boundingBox: boxBounds(lassoBox.current), lassoId: null, prompts: defaultPrompts});
            
            return;
          }
          actuallyDragged.current = false;

          const capturedList = capturedLayers.current;

          const rect = canvas.getBoundingClientRect();
          const scaleX = canvas.width / rect.width;
          const scaleY = canvas.height / rect.height;
          const x = (event.clientX - rect.left) * scaleX;
          const y = (event.clientY - rect.top) * scaleY;

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
          setHistory((prev) => [...prev, drawingsRef.current]);

          return;
        }
        if (!isLassoDrawing.current) return;
  
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (event.clientX - rect.left) * scaleX;
        const y = (event.clientY - rect.top) * scaleY;
        
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
  
      const handleLassoDragMove = (event: MouseEvent) => {
        if (!dragOffset.current || !lassoBox.current.x2 ) return;

        const capturedList = capturedLayers.current;
  
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (event.clientX - rect.left) * scaleX;
        const y = (event.clientY - rect.top) * scaleY;

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
  
      return () => {
        canvas.removeEventListener("mousedown", handleMouseDown);
        canvas.removeEventListener("mousemove", handleMouseMove);
        canvas.removeEventListener("mouseup", handleMouseUp);
        canvas.removeEventListener("mouseleave", handleMouseUp);
      };
    }
  }, [selectedTool, projectId, pageNumber, setHistory, makeNewCanvas, lassoRec, setLassoRec]);  


  const isPointInPath = (box: {x1: NumberOrNull, y1: NumberOrNull, x2: NumberOrNull, y2: NumberOrNull}, x: number, y: number) => {
    if (!box.x1 || !box.y1 || !box.x2 || !box.y2) return false;
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
        <Page
          pageNumber={pageNumber}
          width={width}
          renderAnnotationLayer={false}
          scale={scale}
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
          <Page
            className="mr-4 mb-10"
            key={i}
            pageNumber={startIndex + i}
            width={width / 2}
            renderAnnotationLayer={false}
            scale={scale}
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
          <Page
            className="mr-4 mb-10"
            key={page}
            pageNumber={page}
            width={width / 2}
            renderAnnotationLayer={false}
            scale={scale}
          />
        );
      }
      break;
    }
  }

  const PromptList = () => {
    if (!clickedLasso) return <></>;

    const prompts = clickedLasso.prompts;

    const boxToArray = (lassoBox: {x: number, y: number, width: number, height: number}) => {
      return [lassoBox.x, lassoBox.y, lassoBox.width, lassoBox.height];
    }

    const handlePrompt = (prompt: string, idx: number) => async (e: React.MouseEvent) => {
      e.preventDefault();
      const response = await lassoQuery(projectId, pageNumber, prompt, getImage(clickedLasso.boundingBox), boxToArray(clickedLasso.boundingBox), clickedLasso.lassoId);
      const newLasso = {...clickedLasso};
      newLasso.prompts[idx].answers = [...newLasso.prompts[idx].answers, response];
    }

    const handleAddPrompt = (e: React.MouseEvent) => {
      e.preventDefault();
      setAddPrompt(true);
    }

    const handleNewPrompt = () => {
      const newLasso = {...clickedLasso};
      newLasso.prompts = [...newLasso.prompts, {prompt: newPrompt, answers: []}];
      setClickedLasso(newLasso);
      const newLassoRec = {...lassoRec};
      newLassoRec[projectId] = {...lassoRec[projectId]};
      newLassoRec[projectId][pageNumber] = [...newLassoRec[projectId][pageNumber]];
      newLassoRec[projectId][pageNumber][newLassoRec[projectId][pageNumber].length - 1] = newLasso;
      setLassoRec(newLassoRec);
      setAddPrompt(false);
      setNewPrompt("");
    }

    return (
      <>
        <ul
          className="prompt-list"
          key="prompt-list"
          style={{
            position: "absolute",
            top: clickedLasso.boundingBox.y,
            left: clickedLasso.boundingBox.x,
            color: "black",
            background: "gray",
            zIndex: 2,
          }}
        >
          {prompts.map((prompt, idx) => {
            return (
              <li
                key={idx}
                onClick={handlePrompt(prompt.prompt, idx)}
                style={{
                  display: "inline",
                }}
              >{prompt.prompt}</li>
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
    <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
      <div style={{ maxWidth: '90%', marginRight: '25px', position: 'relative' }} ref={viewerRef}>
        <Document
          className="grid grid-cols-2"
          file={pdfUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentError}
          onPassword={onDocumentLocked}
        >
          {pageComponents}
        </Document>
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 1,
            pointerEvents: selectedTool === "pencil" || selectedTool === "highlighter" || selectedTool === "eraser" || selectedTool === "spinner" ? 'auto' : 'none',
          }}
        />
        <div style={{ marginTop: '10px', textAlign: 'center', zIndex: 2, position: 'relative' }}>
          <button onClick={goToPreviousPage} disabled={pageNumber <= 1} style={{ marginRight: '10px' }}>
            Previous
          </button>
          <button
            onClick={goToNextPage}
            disabled={
              gridMode === 0 ? pageNumber >= numPages :
              gridMode === 1 ? tocIndex.section >= toc.length - 1 :
              tocIndex.section >= toc.length - 1 && tocIndex.subsection >= toc[tocIndex.section].subsections.length - 1
            }>
            Next
          </button>
        </div>
        <button
          onClick={handleSave}
          style={{
            position: 'absolute',
            bottom: '2px',
            right: '-25px',
            zIndex: 2,
          }}
        >
          Save
        </button>
        {clickedLasso !== null && (
          <PromptList/>
        )}
      </div>
    </div>
  );
};

export default PdfViewer;
