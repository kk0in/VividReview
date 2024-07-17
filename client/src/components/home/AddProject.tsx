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

// component for adding new project
// renders form for inputting project metadata
// organizes form input and video file
const AddProject: React.FC = () => {
  const mutation = useMutation(postProject);

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // handle form submit
  // create new video metadata from form input
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    setIsModalOpen(true);

    const metadata = {
      userID: e.currentTarget.userID.value,
      date: e.currentTarget.date.value,
      updateDate: e.currentTarget.date.value,
      userName: e.currentTarget.userName.value,
    };

    if (pdfFile) {
      mutation
        .mutateAsync({ metadata, file: pdfFile })
        .then((res) => {
          // setView("existing");
          setIsModalOpen(false);
        })
        .catch((err) => {
          setIsModalOpen(false);
        });
    }
  }

  const handleFileUploaded = (file: File) => {
    if (file.type === "application/pdf") {
      setPdfFile(file);
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
            htmlFor="date"
            className="block text-sm font-medium leading-6 text-gray-900"
          >
            Date
          </label>
          <div className="mt-2">
            <div className="flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600">
              <input
                type="date"
                name="date"
                id="date"
                value={new Date().toISOString().slice(0, 10)}
                className="block flex-1 border-0 py-1.5 pl-3 text-gray-900 text-sm placeholder:text-gray-400 focus:ring-0  bg-slate-100 rounded-md "
                disabled
              />
            </div>
          </div>
        </div>
        <div className="sm:col-span-2">
          <label
            htmlFor="userName"
            className="block text-sm font-medium leading-6 text-gray-900"
          >
            User Name
          </label>
          <div className="mt-2">
            <div className="flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600">
              <input
                type="text"
                name="userName"
                id="userName"
                // autoComplete="userName"
                placeholder="kyi"
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
            File
          </label>
          <div className="mt-2 flex justify-center rounded-lg border border-dashed border-gray-900/25">
            <FileUpload onFileUploaded={handleFileUploaded} filetype="pdf" />
          </div>
        </div>
      </div>
      <div className="mt-6 flex items-center justify-between gap-x-6">
        <button
          className="rounded-md bg-white border border-slate-200 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-slate-300"
        >
          <div className="flex items-center justify-center text-slate-500 gap-3">
            <Link href="/">Back</Link>
          </div>
        </button>

        <button
          type="submit"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-slate-300"
          disabled={mutation.isLoading}
        >
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
