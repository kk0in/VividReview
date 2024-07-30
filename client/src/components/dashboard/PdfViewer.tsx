import React, { useRef, useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { useRecoilValue, useRecoilState } from "recoil";
import { toolState, recordingState } from "@/app/recoil/ToolState";
import { historyState, redoStackState } from "@/app/recoil/HistoryState";
import { saveAnnotatedPdf, getPdf, saveRecording} from "@/utils/api";
import * as d3 from "d3";

pdfjs.GlobalWorkerOptions.workerSrc = '//cdn.jsdelivr.net/npm/pdfjs-dist@2.6.347/build/pdf.worker.js';

type PDFViewerProps = {
  scale: number;
  projectId: string;
};

const PdfViewer = ({ scale, projectId }: PDFViewerProps) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [drawings, setDrawings] = useState<Record<number, string>>({});
  const [history, setHistory] = useRecoilState(historyState);
  const [redoStack, setRedoStack] = useRecoilState(redoStackState);
  const viewerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const selectedTool = useRecoilValue(toolState);
  const [isRecording, setIsRecording] = useRecoilState(recordingState);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [lassoPath, setLassoPath] = useState<{ x: number; y: number }[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<ImageData | null>(null);
  const [initialPosition, setInitialPosition] = useState<{ x: number; y: number } | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const onDocumentLoadSuccess = ({ numPages }: pdfjs.PDFDocumentProxy) => {
    setNumPages(numPages);
  };

  const onDocumentError = (error: Error) => {
    console.log("pdf viewer error", error);
  };

  const onDocumentLocked = () => {
    console.log("pdf locked");
  };

  const goToNextPage = () => {
    setPageNumber((prevPageNumber) => Math.min(prevPageNumber + 1, numPages));
  };

  const goToPreviousPage = () => {
    setPageNumber((prevPageNumber) => Math.max(prevPageNumber - 1, 1));
  };

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
  }, [numPages]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const savedDrawings = localStorage.getItem(`drawings_${projectId}_${pageNumber}`);
    if (savedDrawings) {
      const img = new Image();
      img.src = savedDrawings;
      img.onload = () => {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(img, 0, 0);
      };
    } else {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }

    let drawing = false;
    let startX = 0;
    let startY = 0;
    // let highlightColor = "rgba(255, 255, 0, 0.1)";

    const startDrawing = (event: MouseEvent) => {
      if (selectedTool === "pencil" || selectedTool === "highlighter") {
        drawing = true;
        context.beginPath();
        context.moveTo(event.offsetX, event.offsetY);
        if (selectedTool === "highlighter") {
          context.strokeStyle = "rgba(255, 255, 0, 0.02)";
          context.lineWidth = 30;
        } else {
          context.strokeStyle = "black";
          context.lineWidth = 2;
        }
        context.setLineDash([]);
      } 
    };

    const draw = (event: MouseEvent) => {
      if (!drawing) return;
      context.lineTo(event.offsetX, event.offsetY);
      context.stroke();
    };

    const stopDrawing = () => {
      if (!drawing) return;
      drawing = false;
      context.closePath();
      const drawingData = canvas.toDataURL();
      localStorage.setItem(`drawings_${projectId}_${pageNumber}`, drawingData);
      setHistory((prev) => [...prev, [drawingData]]);
    };

    const erase = (event: MouseEvent) => {
      if (selectedTool !== "eraser") return;
      context.clearRect(event.offsetX, event.offsetY, 100, 100);
      const drawingData = canvas.toDataURL();
      localStorage.setItem(`drawings_${projectId}_${pageNumber}`, drawingData);
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
  }, [selectedTool, pageNumber, projectId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!context || !canvas) return;

    const savedDrawings = localStorage.getItem(`drawings_${projectId}_${pageNumber}`);
    if (savedDrawings) {
      const img = new Image();
      img.src = savedDrawings;
      img.onload = () => {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(img, 0, 0);
      };
    }
  }, [pageNumber, projectId]);

  useEffect(() => {
    const handleUndoCanvas = (event) => {
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");
      if (!context || !canvas) return;

      const img = new Image();
      img.src = event.detail;
      img.onload = () => {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(img, 0, 0);
      };
    };

    const handleRedoCanvas = (event) => {
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");
      if (!context || !canvas) return;

      const img = new Image();
      img.src = event.detail;
      img.onload = () => {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(img, 0, 0);
      };
    };

    window.addEventListener('undoCanvas', handleUndoCanvas);
    window.addEventListener('redoCanvas', handleRedoCanvas);

    return () => {
      window.removeEventListener('undoCanvas', handleUndoCanvas);
      window.removeEventListener('redoCanvas', handleRedoCanvas);
    };
  }, []);

  const handleSave = async () => {
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
    setDrawings((prev) => ({
      ...prev,
      [pageNumber]: lastDrawing.length ? lastDrawing[0] : '',
    }));
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setHistory((prev) => [...prev, next]);
    setRedoStack((prev) => prev.slice(0, -1));
    setDrawings((prev) => ({
      ...prev,
      [pageNumber]: next.length ? next[0] : '',
    }));
  };

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

  useEffect(() => {
    if (isRecording) {
      console.log("Recording started");
      handleMic();
    } else if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
  }, [isRecording]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (selectedTool === "spinner" && canvas && context) {
      let isLassoDrawing = false;
      let lassoPath = [];
      

      const handleMouseDown = (event: MouseEvent) => {
        if (isDragging) return;
        isLassoDrawing = true;
        lassoPath = [{ x: event.offsetX, y: event.offsetY }];
        context.beginPath();
        context.moveTo(event.offsetX, event.offsetY);
        context.setLineDash([5, 5]);
        context.strokeStyle = "black";
        context.lineWidth = 1;
      };

      const handleMouseMove = (event: MouseEvent) => {
        if (isDragging) {
          handleLassoDragMove(event);
          return;
        }
        if (!isLassoDrawing) return;
        const newPoint = { x: event.offsetX, y: event.offsetY };
        lassoPath.push(newPoint);
        context.lineTo(newPoint.x, newPoint.y);
        context.stroke();
      };

      const handleMouseUp = () => {
        if (isDragging) {
          setIsDragging(false);
          return;
        }
        if (!isLassoDrawing) return;
        isLassoDrawing = false;
        context.closePath();

        context.beginPath();
        context.moveTo(lassoPath[lassoPath.length - 1].x, lassoPath[lassoPath.length - 1].y);
        context.lineTo(lassoPath[0].x, lassoPath[0].y);
        context.stroke();
        context.closePath();

        setLassoPath(lassoPath);

        console.log("Lasso path:", lassoPath);

        // Save the selected region
        const lassoBoundingBox = getBoundingBox(lassoPath);
        
        console.log("Lasso bounding box:", lassoBoundingBox);

        const selectedData = context.getImageData(
          lassoBoundingBox.x,
          lassoBoundingBox.y,
          lassoBoundingBox.width,
          lassoBoundingBox.height
        );
        console.log("Selected region:", selectedData);
        setSelectedRegion(selectedData);
        setInitialPosition({ x: lassoBoundingBox.x, y: lassoBoundingBox.y });

        // 드래그 모드로 전환
        setIsDragging(true);
        setDragOffset({
          x: event.offsetX - lassoBoundingBox.x,
          y: event.offsetY - lassoBoundingBox.y,
        });
      };

      const handleLassoDragStart = (event: MouseEvent) => {
        if (selectedRegion && isPointInPath(lassoPath, event.offsetX, event.offsetY)) {
          setDragOffset({
            x: event.offsetX - (initialPosition?.x ?? 0),
            y: event.offsetY - (initialPosition?.y ?? 0),
          });
        }
      };

      const handleLassoDragMove = (event: MouseEvent) => {
        if (!dragOffset || !selectedRegion || !initialPosition) return;

        const newX = event.offsetX - dragOffset.x;
        const newY = event.offsetY - dragOffset.y;

        context.clearRect(0, 0, canvas.width, canvas.height);
        const savedDrawings = localStorage.getItem(`drawings_${projectId}_${pageNumber}`);
        if (savedDrawings) {
          const img = new Image();
          img.src = savedDrawings;
          img.onload = () => {
            context.drawImage(img, 0, 0);
            context.putImageData(selectedRegion, newX, newY);
          };
        } else {
          context.putImageData(selectedRegion, newX, newY);
        }

        setInitialPosition({ x: newX, y: newY });
      };

      canvas.addEventListener("mousedown", handleMouseDown);
      canvas.addEventListener("mousemove", handleMouseMove);
      canvas.addEventListener("mouseup", handleMouseUp);
      canvas.addEventListener("mouseleave", handleMouseUp);
      // canvas.addEventListener("mousedown", handleLassoDragStart);
      // canvas.addEventListener("mousemove", handleLassoDragMove);
      // canvas.addEventListener("mouseup", () => setDragOffset(null));

      return () => {
        canvas.removeEventListener("mousedown", handleMouseDown);
        canvas.removeEventListener("mousemove", handleMouseMove);
        canvas.removeEventListener("mouseup", handleMouseUp);
        canvas.addEventListener("mouseleave", handleMouseUp);
        // canvas.removeEventListener("mousedown", handleLassoDragStart);
        // canvas.removeEventListener("mousemove", handleLassoDragMove);
        // canvas.removeEventListener("mouseup", () => setDragOffset(null));
      };
    }
  }, [selectedTool, lassoPath, selectedRegion, initialPosition, dragOffset, isDragging]);

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
            width={700}
            renderAnnotationLayer={false}
            scale={scale}
          />
        </Document>
        <canvas
          ref={canvasRef}
          width={700}
          height={600}
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
