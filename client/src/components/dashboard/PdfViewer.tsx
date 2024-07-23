import React, { useRef, useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { useRecoilValue } from "recoil";
import { toolState } from "@/app/recoil/ToolState";
import { saveAnnotatedPdf } from "@/utils/api";
import jsPDF from "jspdf";

pdfjs.GlobalWorkerOptions.workerSrc = '//cdn.jsdelivr.net/npm/pdfjs-dist@2.6.347/build/pdf.worker.js';

type PDFViewerProps = {
  path: string;
  scale: number;
  projectId: string;
};

const PdfViewer = ({ path, scale, projectId }: PDFViewerProps) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [drawings, setDrawings] = useState<Record<number, string>>({});
  const viewerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const selectedTool = useRecoilValue(toolState);

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

    if (drawings[pageNumber]) {
      const img = new Image();
      img.src = drawings[pageNumber];
      img.onload = () => {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(img, 0, 0);
      };
    } else {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }

    let drawing = false;

    const startDrawing = (event: MouseEvent) => {
      if (selectedTool !== "pencil") return;
      drawing = true;
      context.beginPath();
      context.moveTo(event.offsetX, event.offsetY);
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
      const newDrawings = { ...drawings };
      newDrawings[pageNumber] = canvas.toDataURL();
      setDrawings(newDrawings);
    };

    canvas.addEventListener("mousedown", startDrawing);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", stopDrawing);
    canvas.addEventListener("mouseout", stopDrawing);

    return () => {
      canvas.removeEventListener("mousedown", startDrawing);
      canvas.removeEventListener("mousemove", draw);
      canvas.removeEventListener("mouseup", stopDrawing);
      canvas.removeEventListener("mouseout", stopDrawing);
    };
  }, [selectedTool, pageNumber, drawings]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!context || !canvas) return;

    const img = new Image();
    img.src = drawings[pageNumber] || "";
    img.onload = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(img, 0, 0);
    };
  }, [pageNumber, drawings]);

  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const doc = new jsPDF();

      for (let i = 1; i <= numPages; i++) {
        setPageNumber(i);
        const dataUrl = drawings[i] || canvas.toDataURL();
        const img = new Image();
        img.src = dataUrl;

        await new Promise<void>((resolve) => {
          img.onload = () => {
            const pageCanvas = document.createElement("canvas");
            pageCanvas.width = canvas.width;
            pageCanvas.height = canvas.height;
            const pageContext = pageCanvas.getContext("2d");
            if (pageContext) {
              pageContext.drawImage(img, 0, 0);
              const imgData = pageCanvas.toDataURL("image/png");
              if (i > 1) doc.addPage();
              doc.addImage(imgData, "PNG", 0, 0, 210, 297); // A4 size
              resolve();
            }
          };
        });
      }

      const pdfBlob = doc.output("blob");
      await saveAnnotatedPdf(projectId, pdfBlob);
      console.log("Annotated PDF saved successfully");
    } catch (error) {
      console.error("Failed to save annotated PDF:", error);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
      <div style={{ maxWidth: '90%', marginRight: '25px', position: 'relative' }} ref={viewerRef}>
        <Document
          file={path}
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
            pointerEvents: selectedTool === "pencil" ? 'auto' : 'none',
          }}
        />
        <div style={{ marginTop: '10px', textAlign: 'center', zIndex: 2, position: 'relative' }}>
          <button onClick={goToPreviousPage} disabled={pageNumber <= 1} style={{ marginRight: '10px' }}>
            Previous
          </button>
          <button onClick={goToNextPage} disabled={pageNumber >= numPages}>
            Next
          </button>
          <button onClick={handleSave} style={{ marginLeft: '10px' }}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default PdfViewer;