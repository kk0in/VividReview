"use client";

import React, { useState, FormEvent, Fragment } from "react";
import FileUpload from "@/components/home/FileUploader";
import { useRecoilState } from "recoil";
import {
  csvDataState,
  videoDataState,
  keypointDataState,
} from "@/app/recoil/DataState";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  getProjectList,
  postProject,
  getTestCSV,
  getTestKeypoint,
  getTestVideo,
} from "@/utils/api";
import { useRouter } from "next/navigation";
import { Listbox, Transition, Dialog } from "@headlessui/react";
import { ChevronUpDownIcon, ChevronUpIcon } from "@heroicons/react/20/solid";
import Link from "next/link"


const AddProject: React.FC = () => {
  const router = useRouter();

  const [csvData, setCSVData] = useRecoilState(csvDataState);
  const [videoData, setVideoData] = useRecoilState(videoDataState);
  const [keypointData, setKeypointData] = useRecoilState(keypointDataState);

  const mutation = useMutation(postProject);

  const [videoFile, setVideoFile] = useState<File | null>(null);

  const [selectedGBM, setSeletedGBM] = useState<string | null>(null);
  const [selectedProduct, setSeletedProduct] = useState<string | null>(null);
  const [selectedPlant, setSeletedPlant] = useState<string | null>(null);
  const [selectedRoute, setSeletedRoute] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);


  const formFieldbyGBM: Object = {
    "MX(S)": {
      product: ["MOBILE", "APS", "PC", "TNP", "PKG"],
      plant: ["GUMI", "SEIL(N)", "SEV", "SEVT", "SEIN"],
      route: ["1000", "3000", "5000", "9000", "9100"],
    },
    "MX(P)": {
      product: ["CAMERA", "CNC", "GLASS", "INJ ASSY"],
      plant: ["SEV"],
      route: ["MC01", "MN01", "MLU1", "MI01", "MS01"],
    },
    VD: {
      product: ["TV", "LCM", "MONITOR", "AV"],
      plant: ["SUWON", "SAMEX", "SEH", "SEHC", "SEEG"],
      route: ["2260", "2660", "3560", "4260", "7160"],
    },
    DA: {
      product: ["REF", "A/C", "W/M", "MWO", "COMP"],
      plant: ["GWANGJU", "SSEC", "SEHC", "TSE", "SEPM"],
      route: ["2260", "2660", "3560", "4260", "7160"],
    },
    NET_SYS: {
      product: ["SYSTEM", "PBX"],
      plant: ["SUWON", "SEV", "SEIN"],
      route: ["2260", "2660", "3560", "4260", "7160"],
    },
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    setIsModalOpen(true);

    const metadata = {
      gbm: selectedGBM,
      product: selectedProduct,
      plant: selectedPlant,
      route: selectedRoute,
      userID: e.currentTarget.userID.value,
      insertDate: e.currentTarget.insertDate.value,
      updateDate: e.currentTarget.insertDate.value,
      description: e.currentTarget.description.value,
    };

    if (videoFile) {
      mutation
        .mutateAsync({ metadata, file: videoFile })
        .then((res) => {
          console.log(res);
          // setView("existing");
          setIsModalOpen(false);
        })
        .catch((err) => {
          console.log(err);
          setIsModalOpen(false);
        });
    }
  }

  const handleFileUploaded = (file: File) => {
    if (file.type === "video/mp4") {
      setVideoFile(file);
    }
  }



  return (
    <form onSubmit={handleSubmit} className="min-w-[50rem]">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900">Add new project</h3>
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
            <div className="flex w-full rounded-md ring-gray-300">
              <Listbox value={selectedGBM} onChange={setSeletedGBM}>
                <div className="relative w-full mt-1">
                  <input
                    type="text"
                    name="GBM"
                    value={selectedGBM ? selectedGBM : undefined}
                    hidden
                    required
                  />
                  <Listbox.Button className="relative w-full cursor-default rounded-lg bg-slate-100 py-2 pl-3 pr-10 text-left focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 sm:text-sm">
                    <span
                      className={`block truncate ${
                        selectedGBM ? "" : "text-gray-500"
                      }`}
                    >
                      {selectedGBM ? selectedGBM : "GBM"}
                    </span>
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                      <ChevronUpDownIcon
                        className="h-5 w-5 text-gray-400"
                        aria-hidden="true"
                      />
                    </span>
                  </Listbox.Button>
                  <Transition
                    as={Fragment}
                    leave="transition ease-in duration-100"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                  >
                    <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                      {Object.keys(formFieldbyGBM).map((gbm) => (
                        <Listbox.Option
                          key={gbm}
                          value={gbm}
                          className={({ active }) =>
                            `relative cursor-default select-none py-2 pl-10 pr-4 ${
                              active
                                ? "bg-slate-100 text-slate-900 font-semibold"
                                : "text-gray-900"
                            }`
                          }
                        >
                          {gbm}
                        </Listbox.Option>
                      ))}
                    </Listbox.Options>
                  </Transition>
                </div>
              </Listbox>
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
            <div className="flex w-full rounded-md ring-gray-300">
              <Listbox
                value={selectedProduct}
                onChange={setSeletedProduct}
                disabled={!selectedGBM}
              >
                <div className="relative w-full mt-1">
                  <input
                    type="text"
                    name="product"
                    value={selectedProduct ? selectedProduct : undefined}
                    hidden
                    required
                  />
                  <Listbox.Button className="relative w-full cursor-default rounded-lg bg-slate-100 py-2 pl-3 pr-10 text-left focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 sm:text-sm">
                    <span
                      className={`block truncate ${
                        selectedProduct ? "" : "text-gray-500"
                      }`}
                    >
                      {selectedProduct ? selectedProduct : "Product"}
                    </span>
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                      <ChevronUpDownIcon
                        className="h-5 w-5 text-gray-400"
                        aria-hidden="true"
                      />
                    </span>
                  </Listbox.Button>
                  <Transition
                    as={Fragment}
                    leave="transition ease-in duration-100"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                  >
                    <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                      {selectedGBM &&
                        formFieldbyGBM[selectedGBM as keyof Object].product.map(
                          (product) => (
                            <Listbox.Option
                              key={product}
                              value={product}
                              className={({ active }) =>
                                `relative cursor-default select-none py-2 pl-10 pr-4 ${
                                  active
                                    ? "bg-slate-100 text-slate-900 font-semibold"
                                    : "text-gray-900"
                                }`
                              }
                            >
                              {product}
                            </Listbox.Option>
                          )
                        )}
                    </Listbox.Options>
                  </Transition>
                </div>
              </Listbox>
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
            <div className="flex w-full rounded-md ring-gray-300">
              <Listbox
                value={selectedPlant}
                onChange={setSeletedPlant}
                disabled={!selectedGBM}
              >
                <div className="relative w-full mt-1">
                  <input
                    type="text"
                    name="plant"
                    value={selectedPlant ? selectedPlant : undefined}
                    hidden
                    required
                  />
                  <Listbox.Button className="relative w-full cursor-default rounded-lg bg-slate-100 py-2 pl-3 pr-10 text-left focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 sm:text-sm">
                    <span
                      className={`block truncate ${
                        selectedPlant ? "" : "text-gray-500"
                      }`}
                    >
                      {selectedPlant ? selectedPlant : "Plant"}
                    </span>
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                      <ChevronUpDownIcon
                        className="h-5 w-5 text-gray-400"
                        aria-hidden="true"
                      />
                    </span>
                  </Listbox.Button>
                  <Transition
                    as={Fragment}
                    leave="transition ease-in duration-100"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                  >
                    <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                      {selectedGBM &&
                        formFieldbyGBM[selectedGBM as keyof Object].plant.map(
                          (plant) => (
                            <Listbox.Option
                              key={plant}
                              value={plant}
                              className={({ active }) =>
                                `relative cursor-default select-none py-2 pl-10 pr-4 ${
                                  active
                                    ? "bg-slate-100 text-slate-900 font-semibold"
                                    : "text-gray-900"
                                }`
                              }
                            >
                              {plant}
                            </Listbox.Option>
                          )
                        )}
                    </Listbox.Options>
                  </Transition>
                </div>
              </Listbox>
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
            <div className="flex w-full rounded-md ring-gray-300">
              <Listbox
                value={selectedRoute}
                onChange={setSeletedRoute}
                disabled={!selectedGBM}
              >
                <div className="relative w-full mt-1">
                  <input
                    type="text"
                    name="route"
                    value={selectedRoute ? selectedRoute : undefined}
                    hidden
                    required
                  />
                  <Listbox.Button className="relative w-full cursor-default rounded-lg bg-slate-100 py-2 pl-3 pr-10 text-left focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 sm:text-sm">
                    <span
                      className={`block truncate ${
                        selectedRoute ? "" : "text-gray-500"
                      }`}
                    >
                      {selectedRoute ? selectedRoute : "route"}
                    </span>
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                      <ChevronUpDownIcon
                        className="h-5 w-5 text-gray-400"
                        aria-hidden="true"
                      />
                    </span>
                  </Listbox.Button>
                  <Transition
                    as={Fragment}
                    leave="transition ease-in duration-100"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                  >
                    <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                      {selectedGBM &&
                        formFieldbyGBM[selectedGBM as keyof Object].route.map(
                          (route) => (
                            <Listbox.Option
                              key={route}
                              value={route}
                              className={({ active }) =>
                                `relative cursor-default select-none py-2 pl-10 pr-4 ${
                                  active
                                    ? "bg-slate-100 text-slate-900 font-semibold"
                                    : "text-gray-900"
                                }`
                              }
                            >
                              {route}
                            </Listbox.Option>
                          )
                        )}
                    </Listbox.Options>
                  </Transition>
                </div>
              </Listbox>
            </div>
          </div>
        </div>
        <div className="sm:col-span-1">
          <label
            htmlFor="userID"
            className="block text-sm font-medium leading-6 text-gray-900"
          >
            User ID
          </label>
          <div className="mt-2">
            <div className="flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600">
              <input
                type="text"
                name="userID"
                id="userID"
                placeholder="User ID"
                className="block flex-1 border-0 py-1.5 pl-3 text-gray-900 text-sm placeholder:text-gray-400 focus:ring-0  bg-slate-100 rounded-md "
              />
            </div>
          </div>
        </div>
        <div className="sm:col-span-1">
          <label
            htmlFor="insertDate"
            className="block text-sm font-medium leading-6 text-gray-900"
          >
            Insert Date
          </label>
          <div className="mt-2">
            <div className="flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600">
              <input
                type="date"
                name="insertDate"
                id="insertDate"
                value={new Date().toISOString().slice(0, 10)}
                className="block flex-1 border-0 py-1.5 pl-3 text-gray-900 text-sm placeholder:text-gray-400 focus:ring-0  bg-slate-100 rounded-md "
                disabled
              />
            </div>
          </div>
        </div>
        <div className="sm:col-span-2">
          <label
            htmlFor="description"
            className="block text-sm font-medium leading-6 text-gray-900"
          >
            작업내용
          </label>
          <div className="mt-2">
            <div className="flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600">
              <input
                type="text"
                name="description"
                id="description"
                // autoComplete="description"
                placeholder="Description"
                className="block flex-1 border-0 py-1.5 pl-3 text-gray-900 text-sm placeholder:text-gray-400 focus:ring-0  bg-slate-100 rounded-md "
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
            <FileUpload onFileUploaded={handleFileUploaded} filetype="mp4" />
          </div>
        </div>
      </div>
      <div className="mt-6 flex items-center justify-between gap-x-6">
        {/* <button
          type="button"
          className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
          // disabled={!isUploaded}
          onClick={fetchData}
        >
          {isFetching ? "FETCHING..." : "FETCH TEST DATA"}
        </button> */}
        <button 
          className="rounded-md bg-white border border-slate-200 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-slate-300"
          // onClick={() => setView("select")}
        >
          <div className="flex items-center justify-center text-slate-500 gap-3">
            <Link href="/">Back</Link>
          </div>
        </button>

        <button
          type="submit"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-slate-300"
          // onClick={() => {                    }}
          disabled={mutation.isLoading}
        >
          {/* <Link href="/dashboard">Submit</Link> */}
          {mutation.isLoading ? "Uploading..." : "Upload"}
          <Transition appear show={isModalOpen} as={Fragment}>
            <Dialog
              as="div"
              className="relative z-10"
              onClose={() => setIsModalOpen(false)}
            >
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <div className="fixed inset-0 bg-black bg-opacity-25" />
              </Transition.Child>

              <div className="fixed inset-0 overflow-y-auto">
                <div className="flex min-h-full items-center justify-center p-4 text-center">
                  <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0 scale-95"
                    enterTo="opacity-100 scale-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100 scale-100"
                    leaveTo="opacity-0 scale-95"
                  >
                    <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                      <Dialog.Title
                        as="h3"
                        className="text-lg font-medium leading-6 text-gray-900"
                      >
                        Add new project
                      </Dialog.Title>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          Uploading Files...
                        </p>
                      </div>
                    </Dialog.Panel>
                  </Transition.Child>
                </div>
              </div>
            </Dialog>
          </Transition>
        </button>
      </div>
    </form>
  );
};

export default AddProject;
