"use client";

import Image from "next/image";
import Link from "next/link";
import { VideoCameraIcon, TableCellsIcon } from "@heroicons/react/24/solid";
import { FormEvent, useState } from "react";
import FileUpload from "@/components/FileUploader";
import Papa from "papaparse";
import { useRecoilState } from "recoil";
import {
  csvDataState,
  videoDataState,
  keypointDataState,
} from "./recoil/DataState";
import { QueryKey, useMutation, useQuery } from "@tanstack/react-query";
import {
  postNewProejct,
  getTestCSV,
  getTestKeypoint,
  getTestVideo,
} from "@/utils/api";
import { useRouter } from "next/navigation";

export default function Home() {
  const [view, setView] = useState("select");

  const [csvData, setCSVData] = useRecoilState(csvDataState);
  const [videoData, setVideoData] = useRecoilState(videoDataState);
  const [keypointData, setKeypointData] = useRecoilState(keypointDataState);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const mutation = useMutation(postNewProejct);
  const [isUploaded, setIsUploaded] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  const router = useRouter();

  const { data: videoBlob, refetch: refetchVideo } = useQuery(["videoData"], getTestVideo, {
    onSuccess: (data) => {
      const videoUrl = URL.createObjectURL(data);
      setVideoData(videoUrl); // Assuming you have a Recoil state or local state to store this URL
  },
    enabled: false,
  });

  const { refetch: refetchCSV } = useQuery(["csvData"], getTestCSV, {
    onSuccess: (data) => {
      const reader = new FileReader();
      reader.readAsText(data);
      reader.onload = function () {
        console.log(reader.result);
        let results = Papa.parse(reader.result as string, { header: true });
        setCSVData(results.data);
      };
    },
    enabled: false,
  });

  const { refetch: refetchKeypoint } = useQuery(
    ["keypointData"],
    getTestKeypoint,
    {
      onSuccess: (data) => {
        setKeypointData(data);
      },
      enabled: false,
    }
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const metadata = {
      gbm: "X",
      product: "X",
      plant: "X",
      route: "X",
      description: "X",
    };

    if (videoFile) {
      mutation
        .mutateAsync({ metadata, file: videoFile })
        .then((res) => {
          console.log(res);
          setIsUploaded(true);
        })
        .catch((err) => {
          console.log(err);
        });
    }
  }

  const fetchData = async () => {
    setIsFetching(true);
    console.log("fetching data");
    // get csv
    await Promise.all([
    refetchVideo(),
    refetchCSV(),
    refetchKeypoint()
      ]).then(() => {
        router.push("/dashboard");
      }).catch((err) => {
        console.log(err);
      }).finally(() => { 
        setIsFetching(false);
      })

  };

  const handleFileUploaded = (file: File) => {
    if (file.type === "video/mp4") {
      setVideoFile(file);
    } else if (file.type === "text/csv") {
      console.log("csv");

      // save file to /public folder of client
      const reader = new FileReader();
      reader.readAsText(file);
      reader.onload = function () {
        console.log(reader.result);
        let results = Papa.parse(reader.result as string, { header: true });

        console.log(results);

        setCSVData(results.data);
      };
    }
  };

  // const handleRemoteFile = () => {
  //   readRemoteFile(csvFilePath, {
  //     complete: (results: any) => {
  //       console.log(csvData);
  //       setCSVData(results.data);
  //     },
  //     download: true,
  //     header: true,
  //   });
  // };

  return (
    <div className="flex w-full h-full flex-col items-center justify-between px-24 py-16 bg-slate-700 overflow-auto">
      <div className="flex place-items-center my-auto mx-auto">
        <div>
          <div className="rounded overflow-hidden shadow-lg px-12 py-8 bg-white w-full">
            {/* GBM, Product, Plant, Route, 작업내용 */}
            {view === "select" && (
              <div>
                <div className="flex items-center justify-center gap-10">
                  <button
                    className="flex flex-col items-center justify-center border rounded-md border-gray-200 p-4 w-80 hover:shadow-md transition duration-200"
                    onClick={() => setView("existing")}
                  >
                    <div className="text-center">Load Existing Project</div>
                  </button>
                  <button
                    className="flex flex-col items-center justify-center border rounded-md border-gray-200 p-4 w-80 hover:shadow-md transition duration-200"
                    onClick={() => setView("new")}
                  >
                    <div className="text-center">Add New Project</div>
                  </button>
                </div>
                <div className="flex mt-10">
                  <button className="mx-auto bg-slate-700 py-2 px-3 text-white rounded-md shadow-md hover:bg-slate-600" onClick={fetchData}>
                    {isFetching ? "FETCHING..." : "TEST MODE"}
                  </button>
                </div>
              </div>
            )}
            {view === "existing" && (
              <div>
                <button onClick={() => setView("select")}>go back</button>
              </div>
            )}
            {view === "new" && (
              <form onSubmit={handleSubmit}>
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-900">
                    Add new project
                  </h3>
                  <h4 className="text-sm font-medium text-gray-500">
                    Project information
                  </h4>
                </div>
                <div className="mt-2 grid grid-cols-4 gap-x-6 gap-y-6">
                  <div className="sm:col-span-1">
                    <label
                      htmlFor="GBM"
                      className="block text-sm font-medium leading-6 text-gray-900"
                    >
                      GBM
                    </label>
                    <div className="mt-2">
                      <div className="flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600 sm:max-w-full">
                        <input
                          type="text"
                          name="GBM"
                          id="GBM"
                          autoComplete="GBM"
                          disabled
                          className="block flex-1 border-0 bg-transparent py-1.5 pl-1 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6 disabled:bg-slate-100 rounded-md disabled:cursor-not-allowed sm:w-full"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="sm:col-span-1">
                    <label
                      htmlFor="Product"
                      className="block text-sm font-medium leading-6 text-gray-900"
                    >
                      Product
                    </label>
                    <div className="mt-2">
                      <div className="flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600 sm:max-w-full">
                        <input
                          type="text"
                          name="product"
                          id="product"
                          disabled
                          autoComplete="product"
                          className="block flex-1 border-0 bg-transparent py-1.5 pl-1 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6 disabled:bg-slate-100 rounded-md disabled:cursor-not-allowed sm:w-full"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="sm:col-span-1">
                    <label
                      htmlFor="Plant"
                      className="block text-sm font-medium leading-6 text-gray-900"
                    >
                      Plant
                    </label>
                    <div className="mt-2">
                      <div className="flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600 sm:max-w-full">
                        <input
                          type="text"
                          name="plant"
                          id="plant"
                          disabled
                          autoComplete="plant"
                          className="block flex-1 border-0 bg-transparent py-1.5 pl-1 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6 disabled:bg-slate-100 rounded-md disabled:cursor-not-allowed sm:w-full"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="sm:col-span-1">
                    <label
                      htmlFor="Route"
                      className="block text-sm font-medium leading-6 text-gray-900"
                    >
                      Route
                    </label>
                    <div className="mt-2">
                      <div className="flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600 sm:max-w-full">
                        <input
                          type="text"
                          name="route"
                          id="route"
                          disabled
                          autoComplete="route"
                          className="block flex-1 border-0 bg-transparent py-1.5 pl-1 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6 disabled:bg-slate-100 rounded-md disabled:cursor-not-allowed sm:w-full"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="work-description"
                      className="block text-sm font-medium leading-6 text-gray-900"
                    >
                      작업내용
                    </label>
                    <div className="mt-2">
                      <div className="flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600">
                        <input
                          type="text"
                          name="work-description"
                          id="work-description"
                          disabled
                          autoComplete="work-description"
                          className="block flex-1 border-0 bg-transparent py-1.5 pl-1 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6 disabled:bg-slate-100 rounded-md disabled:cursor-not-allowed sm:w-full"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="col-span-full">
                    <label
                      htmlFor="video"
                      className="block text-sm font-medium leading-6 text-gray-900"
                    >
                      Video
                    </label>
                    <div className="mt-2 flex justify-center rounded-lg border border-dashed border-gray-900/25">
                      <FileUpload
                        onFileUploaded={handleFileUploaded}
                        filetype="mp4"
                      />
                      {/* <div className="text-center">
                      <VideoCameraIcon className="mx-auto h-12 w-12 text-gray-300" aria-hidden="true" />
                      <div className="mt-4 flex text-sm leading-6 text-gray-600">
                        <label
                          htmlFor="file-upload"
                          className="relative cursor-pointer rounded-md bg-white font-semibold text-indigo-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-600 focus-within:ring-offset-2 hover:text-indigo-500"
                        >
                          <span>Upload a file</span>
                          <input id="file-upload" name="file-upload" type="file" className="sr-only" />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs leading-5 text-gray-600">MP4 File</p>
                    </div> */}
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex items-center justify-end gap-x-6">
                  <button
                    type="submit"
                    className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-slate-300"
                    onClick={() => {
                      console.log(csvData);
                    }}
                    disabled={mutation.isLoading}
                  >
                    {/* <Link href="/dashboard">Submit</Link> */}
                    {mutation.isLoading ? "Uploading..." : "Upload"}
                  </button>
                  <button
                    type="button"
                    className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
                    // disabled={!isUploaded}
                    onClick={fetchData}
                  >
                    {isFetching ? "FETCHING..." : "FETCH TEST DATA"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
