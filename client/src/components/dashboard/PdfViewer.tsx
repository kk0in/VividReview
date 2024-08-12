declare global {
  interface WindowEventMap {
    undoCanvas: CustomEvent<CanvasLayer[]>;
    redoCanvas: CustomEvent<CanvasLayer[]>;
  }
}

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { useRecoilValue, useRecoilState } from "recoil";
import { toolState, recordingState } from "@/app/recoil/ToolState";
import { historyState, redoStackState } from "@/app/recoil/HistoryState";
import { saveAnnotatedPdf, getPdf, saveRecording} from "@/utils/api";
// import { layer } from "@fortawesome/fontawesome-svg-core";

pdfjs.GlobalWorkerOptions.workerSrc = '//cdn.jsdelivr.net/npm/pdfjs-dist@2.6.347/build/pdf.worker.js';

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
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [history, setHistory] = useRecoilState(historyState);
  const [redoStack, setRedoStack] = useRecoilState(redoStackState);
  const viewerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingsRef = useRef<CanvasLayer[]>([]);
  const selectedTool = useRecoilValue(toolState);
  const [isRecording, setIsRecording] = useRecoilState(recordingState);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [selectedRegion, setSelectedRegion] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
  
  const lassoExists = useRef(false);
  const isLassoDrawing = useRef(false);
  const isDragging = useRef(false);
  const lassoPath = useRef<{x: number, y: number}[]>([]);
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

  const goToNextPage = useCallback(() => {
    setPageNumber((prevPageNumber) => Math.min(prevPageNumber + 1, numPages));
  }, [numPages]);

  const goToPreviousPage = () => {
    setPageNumber((prevPageNumber) => Math.max(prevPageNumber - 1, 1));
  };

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
  }, [goToNextPage, numPages]);

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
            layerContext.drawImage(layer.canvas, 0, 0);          }
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
            layerContext.clearRect(0, 0, canvas.width, canvas.height);
            layerContext.drawImage(img, 0, 0);
          };
          drawingsRef.current = [...drawingsRef.current, {canvas:layerCanvas, id:layerId, projectId:projectId, pageNumber:pageNumber}];
        }
      }
    }
  }, [makeNewCanvas, pageNumber, projectId]);

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

  const handleSave = async () => { // toFix
    const canvas = canvasRef.current;
    if (canvas) {
      try {
        const drawings: Record<number, string> = {};
        for (let i = 1; i <= numPages; i++) {
          const drawingData = localStorage.getItem(`drawings_${projectId}_${i}`);
          if (drawingData) {
            drawings[i] = drawingData;
          }
        }
        await saveAnnotatedPdf(projectId, drawings, numPages);
        console.log("Annotated PDF saved successfully");
      } catch (error) {
        console.error("Failed to save annotated PDF:", error);
      }
    }
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setRedoStack((prev) => [...prev, previous]);
    setHistory((prev) => prev.slice(0, -1));
    const lastDrawing = history.length > 1 ? history[history.length - 2] : [];
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setHistory((prev) => [...prev, next]);
    setRedoStack((prev) => prev.slice(0, -1));
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
  
    if (selectedTool === "spinner" && canvas && context) {
      const clearLasso = () => {
        lassoExists.current = false;
        lassoPath.current = [];
        setSelectedRegion(null);
        document.querySelectorAll(".multilayer-canvas").forEach((el) => el.remove());
        context.clearRect(0, 0, canvas.width, canvas.height);
      }

      const handleMouseDown = (event: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (event.clientX - rect.left) * scaleX;
        const y = (event.clientY - rect.top) * scaleY;
        
        if (isDragging.current) return;
        
        if (lassoExists.current && lassoPath.current.length > 2) {
          if (!isPointInPath(lassoPath.current, x, y)) {
            clearLasso();
            isLassoDrawing.current = true;
            lassoPath.current = [{ x, y }];
            context.beginPath();
            context.moveTo(x, y);
            context.setLineDash([5, 5]);
            context.strokeStyle = "black";
            context.lineWidth = 1;
          } else {
            localStorage.setItem(`drawings_${projectId}_${pageNumber}_0`, canvas.toDataURL());
            dragOffset.current = {
              x: x,
              y: y,
            };
            capturedLayers.current = [];
            for(const layer of drawingsRef.current) {
              if(!isCanvasBlank(layer.canvas, selectedRegion)){
                capturedLayers.current.push(layer.id);
              }
            }           
            console.log(capturedLayers.current);
            isDragging.current = true;
          }
        } else if (!lassoExists.current) {
          isLassoDrawing.current = true;
          lassoPath.current = [{ x, y }];
          context.beginPath();
          context.moveTo(x, y);
          context.setLineDash([5, 5]);
          context.strokeStyle = "black";
          context.lineWidth = 1;
        }
      };
  
      const handleMouseMove = (event: MouseEvent) => {
        if (isDragging.current) {
          handleLassoDragMove(event);
          return;
        }
        if (!isLassoDrawing.current) return;
  
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (event.clientX - rect.left) * scaleX;
        const y = (event.clientY - rect.top) * scaleY;
  
        const newPoint = { x, y };
        lassoPath.current.push(newPoint);
        context.lineTo(newPoint.x, newPoint.y);
        context.stroke();
      };
  
      const handleMouseUp = (event: MouseEvent) => {
        if (isDragging.current) {
          const capturedList = capturedLayers.current;

          const rect = canvas.getBoundingClientRect();
          const scaleX = canvas.width / rect.width;
          const scaleY = canvas.height / rect.height;
          const x = (event.clientX - rect.left) * scaleX;
          const y = (event.clientY - rect.top) * scaleY;

          const newX = x - (dragOffset.current?.x ?? 0);
          const newY = y - (dragOffset.current?.y ?? 0);

          isDragging.current = false;
          dragOffset.current = null;
          lassoPath.current = lassoPath.current.map((point) => {
            return {
              x: point.x + newX,
              y: point.y + newY,
            };
          });
          
          context.clearRect(0, 0, canvas.width, canvas.height);
          const tmpRefs = drawingsRef.current;
          drawingsRef.current = [];
          for (const layer of tmpRefs) {
            const tmpCanvasLayer = layer;
            const layerContext = tmpCanvasLayer.canvas.getContext("2d");
            if (layerContext) {
              if(capturedList.find((layerId) => layerId === tmpCanvasLayer.id)){
                layerContext.clearRect(0, 0, canvas.width, canvas.height);
                layerContext.drawImage(tmpCanvasLayer.canvas, newX, newY);
              }
              localStorage.setItem(`drawings_${projectId}_${pageNumber}_${tmpCanvasLayer.id}`, tmpCanvasLayer.canvas.toDataURL());
              drawingsRef.current = [...drawingsRef.current, {canvas:tmpCanvasLayer.canvas, id:tmpCanvasLayer.id, projectId:projectId, pageNumber:pageNumber}];
            }
          }
          capturedLayers.current = [];
          setHistory((prev) => [...prev, drawingsRef.current]);

          return;
        }
        if (!isLassoDrawing.current) return;
  
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (event.clientX - rect.left) * scaleX;
        const y = (event.clientY - rect.top) * scaleY;
  
        isLassoDrawing.current = false;
        context.closePath();
  
        context.beginPath();
        context.moveTo(lassoPath.current[lassoPath.current.length - 1].x, lassoPath.current[lassoPath.current.length - 1].y);
        context.lineTo(lassoPath.current[0].x, lassoPath.current[0].y);
        context.stroke();
        context.closePath();
  
        const lassoBoundingBox = getBoundingBox(lassoPath.current);

        if(lassoBoundingBox.width === 0 || lassoBoundingBox.height === 0) {
          lassoPath.current = [];
          lassoExists.current = false;
        } else {
          lassoExists.current = true;
          setSelectedRegion(lassoBoundingBox);
        }
      };
  
      const handleLassoDragMove = (event: MouseEvent) => {
        if (!dragOffset.current || !selectedRegion ) return;

        const capturedList = capturedLayers.current;
  
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (event.clientX - rect.left) * scaleX;
        const y = (event.clientY - rect.top) * scaleY;

        const newX = x - dragOffset.current.x;
        const newY = y - dragOffset.current.y;

        context.clearRect(0, 0, canvas.width, canvas.height);
        const tmpRefs = drawingsRef.current;
        drawingsRef.current = [];
        for (const layer of tmpRefs) {
          const tmpCanvasLayer = layer;
          const layerContext = tmpCanvasLayer.canvas.getContext("2d");
          if (layerContext) {
            if(capturedList.find((layerId) => layerId === tmpCanvasLayer.id)){
              layerContext.clearRect(0, 0, canvas.width, canvas.height);
              layerContext.drawImage(tmpCanvasLayer.canvas, newX, newY);
            }
            drawingsRef.current = [...drawingsRef.current, {canvas:tmpCanvasLayer.canvas, id:tmpCanvasLayer.id, projectId:projectId, pageNumber:pageNumber}];
          }
        }
        capturedLayers.current = [];
        setHistory((prev) => [...prev, drawingsRef.current]);

        return;
      };
  
      const handleCanvasClick = (event: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (event.clientX - rect.left) * scaleX;
        const y = (event.clientY - rect.top) * scaleY;
  
        if (lassoExists.current && !isPointInPath(lassoPath.current, x, y)) {
          clearLasso();
        }
      };
  
      canvas.addEventListener("mousedown", handleMouseDown);
      canvas.addEventListener("mousemove", handleMouseMove);
      canvas.addEventListener("mouseup", handleMouseUp);
      canvas.addEventListener("mouseleave", handleMouseUp);
      // canvas.addEventListener("click", handleCanvasClick);
  
      return () => {
        canvas.removeEventListener("mousedown", handleMouseDown);
        canvas.removeEventListener("mousemove", handleMouseMove);
        canvas.removeEventListener("mouseup", handleMouseUp);
        canvas.removeEventListener("mouseleave", handleMouseUp);
        // canvas.removeEventListener("click", handleCanvasClick);
      };
    }
  }, [selectedTool, selectedRegion, projectId, pageNumber, setHistory]);  
  
  
  const getBoundingBox = (path: { x: number; y: number }[]) => {
    const xValues = path.map(point => point.x);
    const yValues = path.map(point => point.y);
    const xMin = Math.min(...xValues);
    const xMax = Math.max(...xValues);
    const yMin = Math.min(...yValues);
    const yMax = Math.max(...yValues);
    return {
      x: xMin,
      y: yMin,
      width: xMax - xMin,
      height: yMax - yMin,
    };
  };

  const isPointInPath = (path: { x: number; y: number }[], x: number, y: number) => {
    const context = canvasRef.current?.getContext("2d");
    if (!context) return false;

    context.beginPath();
    context.moveTo(path[0].x, path[0].y);
    for (const point of path) {
      context.lineTo(point.x, point.y);
    }
    context.closePath();
    return context.isPointInPath(x, y);
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
      <div style={{ maxWidth: '90%', marginRight: '25px', position: 'relative' }} ref={viewerRef}>
        <Document
          file={pdfUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentError}
          onPassword={onDocumentLocked}
        >
          <Page
            pageNumber={pageNumber}
            width={width}
            renderAnnotationLayer={false}
            scale={scale}
          />
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
          <button onClick={goToNextPage} disabled={pageNumber >= numPages}>
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
      </div>
    </div>
  );
};

export default PdfViewer;
