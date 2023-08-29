"use client";
import { useDropzone } from "react-dropzone";
import { VideoCameraIcon, TableCellsIcon } from "@heroicons/react/24/solid";

interface FileUploadProps {
  onFileUploaded: (file: File) => void;
  filetype: string;
}

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
        "video/mp4": [".mp4"],
      },
      maxFiles: 1
    });

  return (
    <div {...getRootProps()} className="w-full h-full px-6 py-12">
      <input {...getInputProps()} />
      {}
      <div className="text-center">
        <VideoCameraIcon
          className="mx-auto h-12 w-12 text-gray-300"
          aria-hidden="true"
        />
        {acceptedFiles.length > 0 ? (
          <p className="text-center mt-4 text-sm leading-6 text-gray-600">
            {acceptedFiles[0].name}
          </p>
        ) : 
        <p className="text-center mt-4 text-sm leading-6 text-gray-600">
          Drag & drop your MP4 file here, or click to select a file
        </p>
        }
      </div>
    </div>
  );
};

export default FileUpload;
