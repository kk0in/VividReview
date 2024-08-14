"use client";

import React, { useState, Fragment, useEffect } from "react";
import Link from "next/link";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";

import { getProjectList, deleteProject, getMatchParagraphs, activateReview } from "@/utils/api";
import { ArrowUturnLeftIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useSetRecoilState } from "recoil";
import {
  pdfDataState,
} from "@/app/recoil/DataState";
import {
  modeState,
  ViewerMode,
} from "@/app/recoil/ViewerState";
import { Listbox, Dialog, Transition } from "@headlessui/react";
import { ChevronUpDownIcon, ChevronUpIcon } from "@heroicons/react/20/solid";

// render filter dropdowns and existing project list
const ExistingProject: React.FC = () => {
  const queryClient = useQueryClient();
  const setPdfData = useSetRecoilState(pdfDataState);
  const [activationAvailable, setActivationAvailable] = useState([]);
  const setViewerMode = useSetRecoilState(modeState);

  // get project list
  const { data: projectListData } = useQuery(["projectList"], getProjectList, {
    onSuccess: (data) => {
      console.log(data);
    },
  });

  // delete project request
  const deleteProjectMutation = useMutation((projectId: string) => deleteProject(projectId), {
    onSuccess: () => {
      queryClient.invalidateQueries(["projectList"]);
      setIsDeleteModalOpen(false);
      setProjectToDelete(null);
    },
  });

  // delete project
  const handleProjectDelete = (projectId: string) => {
    setProjectToDelete(projectId);
    deleteProjectMutation.mutate(projectId);
  };

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [filteredProjects, setFilteredProjects] = useState(projectListData?.projects);
  const [selecteduserID, setSelecteduserID] = useState<string | null>(null);
  const [selectedInsertDate, setSelectedInsertDate] = useState<string | null>(null);

  // update project list when filter is changed
  useEffect(() => {
    setFilteredProjects(projectListData?.projects.filter((project: any) => {
      const userIDFilter =
        !selecteduserID || project.userID && project.userID.includes(selecteduserID);
      const insertDateFilter =
        !selectedInsertDate ||
        project.insertDate === selectedInsertDate;

      return (
        userIDFilter &&
        insertDateFilter
      );
    }));

    // console.log(filteredProjects);

  }, [selecteduserID, selectedInsertDate, projectListData?.projects]);

  useEffect(() => {
    setActivationAvailable([]);
    filteredProjects?.forEach(async (project: any) => {
      try {
        const data = await getMatchParagraphs({ queryKey: ["getMatchParagraphs", project.id] });
        if (data) {
          activationAvailable.push(project.id);
          setActivationAvailable(activationAvailable);
        }
      } catch (error) {
        console.error("Failed to fetch paragraphs:", error);
      }
    });
  }, [filteredProjects]);

  return (
    <>
      <div className="flex place-items-center my-auto mx-auto">
        <Transition appear show={isDeleteModalOpen} as={Fragment}>
          <Dialog
            open={isDeleteModalOpen}
            onClose={() => {
              setIsDeleteModalOpen(false);
              setProjectToDelete(null);
            }}
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
                    onClick={() => {
                      projectToDelete && handleProjectDelete(projectToDelete);
                      setIsDeleteModalOpen(false)
                      setProjectToDelete(null);
                    }}
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
            <div className="mt-2 grid grid-cols-6 gap-x-6 gap-y-6">
              <div className="sm:col-span-1">
                <label
                  htmlFor="userID"
                  className="block text-sm font-medium leading-6 text-gray-900"
                >
                  User ID
                </label>
                <div className="mt-2">
                  <div className="flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600">
                    <div className="flex w-full rounded-md ring-gray-300">
                      <input
                        type="text"
                        name="userID"
                        id="userID"
                        placeholder="User ID"
                        className="block flex-1 border-0 py-2 pl-3 text-gray-900 text-sm placeholder:text-gray-400 focus:ring-0  bg-slate-100 rounded-md "
                        value={selecteduserID ?? ""}
                        onChange={(e) => setSelecteduserID(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="sm:col-span-1">
                <label
                  htmlFor="insertDate"
                  className="block text-sm font-medium leading-6 text-gray-900"
                >
                  Date
                </label>
                <div className="mt-2">
                  <div className="flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600">
                    <input
                      type="date"
                      name="insertDate"
                      id="insertDate"
                      className="block flex-1 border-0 py-2 pl-3 text-gray-900 text-sm placeholder:text-gray-400 focus:ring-0  bg-slate-100 rounded-md "
                      onChange={(e) => setSelectedInsertDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
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
                          <th className="w-10 border-b dark:border-slate-600 font-mediump-4 pl-6 pt-0 pb-3 text-slate-400 dark:text-slate-200 text-left">
                            ID
                          </th>
                          <th className="border-b dark:border-slate-600 font-medium p-4 pl-6 pt-0 pb-3 text-slate-400 dark:text-slate-200 text-left">
                            User ID
                          </th>
                          <th className="border-b dark:border-slate-600 font-medium p-4 pl-6 pt-0 pb-3 text-slate-400 dark:text-slate-200 text-left">
                            User Name
                          </th>
                          <th className="border-b dark:border-slate-600 font-medium p-4 pl-6 pt-0 pb-3 text-slate-400 dark:text-slate-200 text-left">
                            Insert Date
                          </th>
                          <th className="border-b dark:border-slate-600 font-medium p-4 pl-6 pt-0 pb-3 text-slate-400 dark:text-slate-200 text-left">
                            Update Date
                          </th>
                          <th className="border-b dark:border-slate-600 font-medium p-4 pl-6 pt-0 pb-3 text-slate-400 dark:text-slate-200 text-left">
                            Lecture Status
                          </th>
                          <th className="border-b dark:border-slate-600 font-medium p-4 pl-6 pt-0 pb-3 text-slate-400 dark:text-slate-200 text-left">
                            Review Status
                          </th>
                          <th className="border-b dark:border-slate-600 font-medium p-4 pl-6 pt-0 pb-3 text-slate-400 dark:text-slate-200 text-left">
                            Delete
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-slate-800">
                        {filteredProjects &&
                          filteredProjects.map((project: any) => (
                            <tr key={project.id}>
                              <td className="w-10 border-b border-slate-100 dark:border-slate-700 p-4 pl-6 text-slate-500 dark:text-slate-400">
                                {project.id}
                              </td>
                              <td className="border-b border-slate-100 dark:border-slate-700 p-4 pl-6 text-slate-500 dark:text-slate-400">
                                {project.userID}
                              </td>
                              <td className="border-b border-slate-100 dark:border-slate-700 p-4 pl-6 text-slate-500 dark:text-slate-400">
                                {project.userName}
                              </td>
                              <td className="border-b border-slate-100 dark:border-slate-700 p-4 pl-6 text-slate-500 dark:text-slate-400">
                                {project.insertDate}
                              </td>
                              <td className="border-b border-slate-100 dark:border-slate-700 p-4 pl-6 text-slate-500 dark:text-slate-400">
                                {project.updateDate}
                              </td>
                              <td className="border-b border-slate-100 dark:border-slate-700 p-4 pl-6 text-slate-500 dark:text-slate-400">
                                {project.done ? (
                                  <Link
                                    href={`/viewer/${project.id}`}
                                    className="rounded-md items-center justify-center text-slate-500 gap-3 bg-white border border-slate-200 px-2 py-2 text-sm shadow-sm hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-slate-300"
                                    onClick={() => {
                                      setViewerMode(ViewerMode.DEFAULT);
                                    }}
                                  >
                                    Go to Lecture mode
                                  </Link>
                                ) : (
                                  "NOT DONE"
                                )}
                              </td>
                              <td className="border-b border-slate-100 dark:border-slate-700 p-4 pl-6 text-slate-500 dark:text-slate-400">
                                {project.reviewMode ? (
                                  <Link
                                    href={`/viewer/${project.id}`}
                                    className="rounded-md items-center justify-center text-slate-500 gap-3 bg-white border border-slate-200 px-2 py-2 text-sm shadow-sm hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-slate-300"
                                    onClick={() => {
                                      setViewerMode(ViewerMode.REVIEW);
                                    }}
                                  >
                                    Go to Review mode
                                  </Link>
                                ) : activationAvailable.includes(project.id) ? (
                                  <button
                                    className="rounded-md items-center justify-center text-white bg-blue-500 hover:bg-blue-600 px-2 py-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                                    onClick={() => {
                                      activateReview(project.id);
                                    }}
                                  >
                                    Activation
                                  </button>
                                ) : (
                                  "NOT AVAILABLE"
                                )}
                              </td>
                              <td className="border-b border-slate-100 dark:border-slate-700 p-4 pl-6 text-slate-500 dark:text-slate-400">
                                {/* delete */}
                                <button
                                  className="rounded-md items-center justify-center text-slate-500 gap-3 bg-white  border-slate-200 px-2 py-2 text-sm hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-slate-300"
                                  onClick={() => {
                                    setIsDeleteModalOpen(true);
                                    setProjectToDelete(project.id);
                                  }}
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
            <button
              className="rounded-md bg-white border border-slate-200 mt-4 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-slate-300"
            >
              <div className="flex items-center justify-center text-slate-500 gap-3">
                <Link href="/">Back</Link>
              </div>
            </button>
            <div>
            </div>
          </div>
        </div>
      </div>

    </>
  );
};

export default ExistingProject;
