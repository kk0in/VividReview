"use client";

import React, { useState, Fragment } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { getProjectList } from "@/utils/api";
import { ArrowUturnLeftIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useSetRecoilState } from "recoil";
import {
  csvDataState,
  videoDataState,
  keypointDataState,
} from "@/app/recoil/DataState";
import { Dialog, Transition } from "@headlessui/react";

const ExistingProject: React.FC = () => {
  const setCSVData = useSetRecoilState(csvDataState);
  const setVideoData = useSetRecoilState(videoDataState);
  const setKeypointData = useSetRecoilState(keypointDataState);

  const { data: projectListData } = useQuery(["projectList"], getProjectList, {
    onSuccess: (data) => {
      console.log(data);
    },
  });

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  return (
    <>
     <div className="flex place-items-center my-auto mx-auto">

     <Transition appear show={isDeleteModalOpen} as={Fragment}>
        <Dialog
          open={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          className="fixed inset-0 flex items-center justify-center"
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
            <div className="fixed inset-0 bg-black/25" />
          </Transition.Child>
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
                Delete Project
              </Dialog.Title>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete this project? All of your data
                  will be permanently removed. This action cannot be undone.
                </p>
              </div>

              <div className="mt-4">
                <button
                  type="button"
                  className="inline-flex justify-center rounded-md border border-transparent bg-red-100 px-4 py-2 text-sm font-medium text-red-900 hover:bg-red-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                  onClick={() => setIsDeleteModalOpen(false)}
                >
                  Delete
                </button>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </Dialog>
      </Transition>
      <div className="rounded overflow-hidden shadow-lg px-12 py-8 bg-white w-full">

      <div className="min-w-[50rem]">
        <div className="mb-6">
          <h3 className="text-lg font-bold text-gray-900">Existing Projects</h3>
          <h4 className="text-sm font-medium text-gray-500">
            Project information
          </h4>
        </div>
        <div>
          <div className="mt-4 mb-3">
            <div className="not-prose relative bg-slate-50 rounded-xl overflow-hidden dark:bg-slate-800/25">
              <div
                style={{ backgroundPosition: "10px 10px" }}
                className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,#fff,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/25 dark:[mask-image:linear-gradient(0deg,rgba(255,255,255,0.1),rgba(255,255,255,0.5))]"
              ></div>
              <div className="relative rounded-xl overflow-auto">
                <div className="shadow-sm overflow-hidden my-8">
                  <table className="border-collapse table-auto w-full text-sm">
                    <thead>
                      <tr>
                        <th className="border-b dark:border-slate-600 font-medium p-4 pl-8 pt-0 pb-3 text-slate-400 dark:text-slate-200 text-left">
                          ID
                        </th>
                        <th className="border-b dark:border-slate-600 font-medium p-4 pl-8 pt-0 pb-3 text-slate-400 dark:text-slate-200 text-left">
                          GBM
                        </th>
                        <th className="border-b dark:border-slate-600 font-medium p-4 pl-8 pt-0 pb-3 text-slate-400 dark:text-slate-200 text-left">
                          Product
                        </th>
                        <th className="border-b dark:border-slate-600 font-medium p-4 pl-8 pt-0 pb-3 text-slate-400 dark:text-slate-200 text-left">
                          Plant
                        </th>
                        <th className="border-b dark:border-slate-600 font-medium p-4 pl-8 pt-0 pb-3 text-slate-400 dark:text-slate-200 text-left">
                          Route
                        </th>
                        <th className="border-b dark:border-slate-600 font-medium p-4 pl-8 pt-0 pb-3 text-slate-400 dark:text-slate-200 text-left">
                          Description
                        </th>
                        <th className="border-b dark:border-slate-600 font-medium p-4 pl-8 pt-0 pb-3 text-slate-400 dark:text-slate-200 text-left">
                          Status
                        </th>
                        <th className="border-b dark:border-slate-600 font-medium p-4 pl-8 pt-0 pb-3 text-slate-400 dark:text-slate-200 text-left">
                          Delete
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-800">
                      {projectListData &&
                        projectListData.projects.map((project: any) => (
                          <tr key={project.id}>
                            <td className="border-b border-slate-100 dark:border-slate-700 p-4 pl-8 text-slate-500 dark:text-slate-400">
                              {project.id}
                            </td>
                            <td className="border-b border-slate-100 dark:border-slate-700 p-4 pl-8 text-slate-500 dark:text-slate-400">
                              {project.gbm}
                            </td>
                            <td className="border-b border-slate-100 dark:border-slate-700 p-4 pl-8 text-slate-500 dark:text-slate-400">
                              {project.product}
                            </td>
                            <td className="border-b border-slate-100 dark:border-slate-700 p-4 pl-8 text-slate-500 dark:text-slate-400">
                              {project.plant}
                            </td>
                            <td className="border-b border-slate-100 dark:border-slate-700 p-4 pl-8 text-slate-500 dark:text-slate-400">
                              {project.route}
                            </td>
                            <td className="border-b border-slate-100 dark:border-slate-700 p-4 pl-8 text-slate-500 dark:text-slate-400">
                              {project.description}
                            </td>
                            <td className="border-b border-slate-100 dark:border-slate-700 p-4 pl-8 text-slate-500 dark:text-slate-400">
                              {project.done ? (
                                <Link
                                  href={`/dashboard/${project.id}`}
                                  className="rounded-md items-center justify-center text-slate-500 gap-3 bg-white border border-slate-200 px-2 py-2 text-sm shadow-sm hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-slate-300"
                                  onClick={() => {
                                    setCSVData([]);
                                    setVideoData("");
                                    setKeypointData(null);
                                  }}
                                >
                                  Go to Dashboard
                                </Link>
                              ) : (
                                "NOT DONE"
                              )}
                            </td>
                            <td className="border-b border-slate-100 dark:border-slate-700 p-4 pl-8 text-slate-500 dark:text-slate-400">
                              {/* delete */}
                              <button
                                className="rounded-md items-center justify-center text-slate-500 gap-3 bg-white  border-slate-200 px-2 py-2 text-sm hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-slate-300"
                                onClick={() => setIsDeleteModalOpen(true)}
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="absolute inset-0 pointer-events-none border border-black/5 rounded-xl dark:border-white/5"></div>
            </div>
          </div>
        </div>
        <button
          className="rounded-md bg-white border border-slate-200 mt-4 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-slate-300"
          // onClick={() => setView("select")}
        >
          <div className="flex items-center justify-center text-slate-500 gap-3">
            <Link href="/">Back</Link>
          </div>
        </button>
{/* centering */}
      <div>
      </div>
      </div>
      </div>
      </div>

    </>
  );
};

export default ExistingProject;
