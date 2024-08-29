"use client";
import { useDropzone } from "react-dropzone";
import { DocumentIcon, DocumentTextIcon } from "@heroicons/react/24/solid";
import { useEffect } from "react";

interface FileUploadProps {
  onFileUploaded: (file: File) => void;
  filetype: string;
}

// render component to upload video file
const FileUpload: React.FC<FileUploadProps> = ({
  onFileUploaded,
  // filetype,
}) => {
  const { getRootProps, getInputProps, acceptedFiles } =
    useDropzone({
      onDrop: (acceptedFiles) => {
        const file = acceptedFiles[0];
        onFileUploaded(file);
      },
      accept: {
        "application/pdf": [".pdf"],
      },
      maxFiles: 1
    });

  useEffect(() => {
    document.documentElement.requestFullscreen();
  }, [document]);

  return (
    <div {...getRootProps()} className="w-full h-full px-6 py-12">
      <input {...getInputProps()} />
      {}
      <div className="text-center">
        <DocumentIcon
          className="mx-auto h-12 w-12 text-gray-300"
          aria-hidden="true"
        />
        {acceptedFiles.length > 0 ? (
          <p className="text-center mt-4 text-sm leading-6 text-gray-600">
            {acceptedFiles[0].name}
          </p>
        ) : 
        <p className="text-center mt-4 text-sm leading-6 text-gray-600">
          Drag & drop your pdf file here, or click to select a file
        </p>
        }
      </div>
    </div>
  );
};

export default FileUpload;
