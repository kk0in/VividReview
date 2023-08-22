"use client";
import { useDropzone } from "react-dropzone";
import { VideoCameraIcon, TableCellsIcon } from "@heroicons/react/24/solid";

interface FileUploadProps {
  onFileUploaded: (file: File) => void;
  filetype: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFileUploaded,
  filetype,
}) => {
  const { getRootProps, getInputProps, isDragActive, acceptedFiles } = useDropzone({
    onDrop: (acceptedFiles) => {
      const file = acceptedFiles[0];
      onFileUploaded(file);
    },
    accept:
      filetype === "mp4"
        ? {
            "video/mp4": [".mp4"],
          }
        : { "text/csv": [".csv"] },
  });

  return (
    <div {...getRootProps()} className="w-full h-full px-6 py-12">
      <input {...getInputProps()} />
      {}
      <div className="text-center">
        {filetype === 'mp4' ? <VideoCameraIcon
          className="mx-auto h-12 w-12 text-gray-300"
          aria-hidden="true"
        /> : <TableCellsIcon className="mx-auto h-12 w-12 text-gray-300" aria-hidden="true" />
  }
  {acceptedFiles.length > 0 && <p className="text-center mt-4 text-sm leading-6 text-gray-600">{acceptedFiles[0].name}</p>}
        {isDragActive ? (
        <p className="text-center mt-4 text-sm leading-6 text-gray-600">Drop your {filetype.toUpperCase()} file here...</p>
      ) : (
        <p className="text-center mt-4 text-sm leading-6 text-gray-600">Drag & drop your {filetype.toUpperCase()} file here, or click to select a file</p>
      )}
        {/* <p className="text-xs leading-5 text-gray-600">MP4 File</p> */}
      </div>
    </div>
  );
};

export default FileUpload;
