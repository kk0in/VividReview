import React, { useState, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { PencilIcon, EraserIcon, SelectionIcon } from "@heroicons/react/24/solid";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

// PDF.js worker 설정
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

interface PdfViewerProps {
  pdfSrc: string;
}

const PdfViewer: React.FC<PdfViewerProps> = ({ pdfSrc }) => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [tool, setTool] = useState("pencil");

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  const handleNextPage = () => {
    if (pageNumber < numPages) {
      setPageNumber(pageNumber + 1);
    }
  };

  const handlePrevPage = () => {
    if (pageNumber > 1) {
      setPageNumber(pageNumber - 1);
    }
  };

  const handleToolChange = (newTool) => {
    setTool(newTool);
  };

  const handleCanvasClick = (e) => {
    if (tool === "pencil") {
      // Implement pencil drawing logic
    } else if (tool === "eraser") {
      // Implement eraser logic
    }
  };

  return (
    <div className="pdf-viewer">
      <div className="toolbar">
        <button onClick={() => handleToolChange("pencil")}>
          <PencilIcon className="h-6 w-6" />
        </button>
        <button onClick={() => handleToolChange("eraser")}>
          <EraserIcon className="h-6 w-6" />
        </button>
        <button onClick={() => handleToolChange("selection")}>
          <SelectionIcon className="h-6 w-6" />
        </button>
      </div>
      <div className="pdf-document">
        <Document file={pdfSrc} onLoadSuccess={onDocumentLoadSuccess}>
          <Page pageNumber={pageNumber} canvasRef={canvasRef} onClick={handleCanvasClick} />
        </Document>
        <div className="navigation">
          <button onClick={handlePrevPage} disabled={pageNumber <= 1}>Previous</button>
          <button onClick={handleNextPage} disabled={pageNumber >= numPages}>Next</button>
        </div>
      </div>
    </div>
  );
};

export default PdfViewer;