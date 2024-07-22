import React, { useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/restrict-template-expressions
pdfjs.GlobalWorkerOptions.workerSrc = '//cdn.jsdelivr.net/npm/pdfjs-dist@2.6.347/build/pdf.worker.js';;

type PDFViewerProps = {
  path: string;
  scale: number;
};

const PdfViewer = ({ path, scale }: PDFViewerProps) => {
  const [numPages, setNumPages] = useState<number>(0);

  const onDocumentLoadSuccess = ({ numPages }: pdfjs.PDFDocumentProxy) => {
    setNumPages(numPages);
    console.log(numPages);
  };

  const onDocumentError = (error: Error) => {
    console.log("pdf viewer error", error);
  };

  const onDocumentLocked = () => {
    console.log("pdf locked");
  };

  return (
    <div>
      <Document
        file={path}
        onLoadSuccess={onDocumentLoadSuccess}
        onLoadError={onDocumentError}
        onPassword={onDocumentLocked}
      >
        {Array.from(new Array(numPages), (_, index) => {
          return (
            <Page
              key={`page_${index + 1}`}
              pageNumber={index + 1}
              width={700}
              renderAnnotationLayer={false}
              scale={scale}
            />
          );
        })}
      </Document>
    </div>
  );
};

export default PdfViewer;