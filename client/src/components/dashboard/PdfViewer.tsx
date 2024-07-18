"use client"; // 이 줄을 추가합니다.

import React, { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const PdfViewer = ({ pdfFile }) => {
  const [numPages, setNumPages] = useState(0);
  const [pdfDoc, setPdfDoc] = useState(null);
  const canvasRef = useRef([]);

  useEffect(() => {
    const loadingTask = pdfjsLib.getDocument(pdfFile);
    loadingTask.promise.then((pdf) => {
      setPdfDoc(pdf);
      setNumPages(pdf.numPages);
    });
  }, [pdfFile]);

  useEffect(() => {
    if (pdfDoc) {
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        pdfDoc.getPage(pageNum).then((page) => {
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = canvasRef.current[pageNum - 1];
          const context = canvas.getContext("2d");
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          const renderContext = {
            canvasContext: context,
            viewport: viewport,
          };
          page.render(renderContext);
        });
      }
    }
  }, [pdfDoc, numPages]);

  return (
    <div>
      {Array.from(new Array(numPages), (el, index) => (
        <div key={`page_${index + 1}`}>
          <canvas ref={(el) => (canvasRef.current[index] = el)} />
          <DrawingCanvas pageNumber={index + 1} />
        </div>
      ))}
    </div>
  );
};

const DrawingCanvas = ({ pageNumber }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const startDrawing = ({ nativeEvent }) => {
    const { offsetX, offsetY } = nativeEvent;
    canvasRef.current.getContext("2d").beginPath();
    canvasRef.current.getContext("2d").moveTo(offsetX, offsetY);
    setIsDrawing(true);
  };

  const draw = ({ nativeEvent }) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = nativeEvent;
    canvasRef.current.getContext("2d").lineTo(offsetX, offsetY);
    canvasRef.current.getContext("2d").stroke();
  };

  const stopDrawing = () => {
    canvasRef.current.getContext("2d").closePath();
    setIsDrawing(false);
  };

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={startDrawing}
      onMouseMove={draw}
      onMouseUp={stopDrawing}
      onMouseLeave={stopDrawing}
      className="absolute top-0 left-0"
      style={{ pointerEvents: isDrawing ? "auto" : "none" }}
    />
  );
};

export default PdfViewer;