"use client";

import React, { useState, Fragment, useEffect } from "react";
import Link from "next/link";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";

import { getProjectList, deleteProject } from "@/utils/api";
import { ArrowUturnLeftIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useSetRecoilState } from "recoil";
import {
  csvDataState,
  videoDataState,
  keypointDataState,
} from "@/app/recoil/DataState";
import { Listbox, Dialog, Transition } from "@headlessui/react";
import { ChevronUpDownIcon, ChevronUpIcon } from "@heroicons/react/20/solid";

const ExistingProject: React.FC = () => {
  const queryClient = useQueryClient();
  const setCSVData = useSetRecoilState(csvDataState);
  const setVideoData = useSetRecoilState(videoDataState);
  const setKeypointData = useSetRecoilState(keypointDataState);

  const { data: projectListData } = useQuery(["projectList"], getProjectList, {
    onSuccess: (data) => {
      console.log(data);
    },
  });

  const deleteProjectMutation = useMutation((projectId: string) => deleteProject(projectId), {
    onSuccess: () => {
      queryClient.invalidateQueries(["projectList"]);
      setIsDeleteModalOpen(false);
      setProjectToDelete(null);
    },
  });

  const handleProjectDelete = (projectId: string) => {
    setProjectToDelete(projectId);
    deleteProjectMutation.mutate(projectId);
  };

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null); 
  const [selectedGBM, setSeletedGBM] = useState<string | null>("ALL");
  const [selectedProduct, setSeletedProduct] = useState<string | null>("ALL");
  const [selectedPlant, setSeletedPlant] = useState<string | null>("ALL");
  const [selectedRoute, setSeletedRoute] = useState<string | null>("ALL");
  const [filteredProjects, setFilteredProjects] = useState(projectListData?.projects);
  const [selecteduserID, setSelecteduserID] = useState<string | null>(null);
  const [selectedInsertDate, setSelectedInsertDate] = useState<string | null>(null);

    const formFieldbyGBM: Object = {
      "ALL":
      {
        product: ["ALL"],
        plant: ["ALL"],
        route: ["ALL"],
      },  
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

  useEffect( () => {
    setFilteredProjects(projectListData?.projects.filter((project: any) => {
      const gbmFilter = selectedGBM === "ALL" || project.gbm === selectedGBM;
      const productFilter = selectedProduct === "ALL" || project.product === selectedProduct;
      const plantFilter = selectedPlant === "ALL" || project.plant === selectedPlant;
      const routeFilter = selectedRoute === "ALL" || project.route === selectedRoute;
      const userIDFilter =
        !selecteduserID || project.userID && project.userID.includes(selecteduserID);
      const insertDateFilter =
          !selectedInsertDate ||
          project.insertDate === selectedInsertDate;
    
      return (
        gbmFilter &&
        productFilter &&
        plantFilter &&
        routeFilter &&
        userIDFilter &&
        insertDateFilter
      );
    }));

    console.log(filteredProjects);

  } , [selectedGBM, selectedProduct, selectedPlant, selectedRoute, selecteduserID, selectedInsertDate, projectListData?.projects]);

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
                  htmlFor="GBM"
                  className="block text-sm font-medium leading-6 text-gray-900"
                >
                  GBM
                </label>
                <div className="mt-2">
                  <div className="flex w-full rounded-md ring-gray-300">
                    <Listbox value={selectedGBM} onChange={(value) => {
                      setSeletedGBM(value);
                      setSeletedProduct("ALL");
                      setSeletedPlant("ALL");
                      setSeletedRoute("ALL");
                    }}>
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
                            {selectedGBM ? selectedGBM : "ALL"}
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
                          <Listbox.Options className="absolute mt-1 max-h-60 w-full z-10 overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                            {formFieldbyGBM && Object.keys(formFieldbyGBM).map((gbm) => (
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
                            {selectedProduct ? selectedProduct : "ALL"}
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
                          <Listbox.Options className="absolute mt-1 max-h-60 w-full z-10 overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
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
                            {selectedPlant ? selectedPlant : "ALL"}
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
                          <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto z-10 rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
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
                            {selectedRoute ? selectedRoute : "ALL"}
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
                          <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto z-10 rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
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
                  Insert Date
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
                          <th className="border-b dark:border-slate-600 font-medium p-4 pl-4 pt-0 pb-3 text-slate-400 dark:text-slate-200 text-left">
                            GBM
                          </th>
                          <th className="border-b dark:border-slate-600 font-medium p-4 pl-6 pt-0 pb-3 text-slate-400 dark:text-slate-200 text-left">
                            Product
                          </th>
                          <th className="border-b dark:border-slate-600 font-medium p-4 pl-6 pt-0 pb-3 text-slate-400 dark:text-slate-200 text-left">
                            Plant
                          </th>
                          <th className="border-b dark:border-slate-600 font-medium p-4 pl-6 pt-0 pb-3 text-slate-400 dark:text-slate-200 text-left">
                            Route
                          </th>
                          <th className="border-b dark:border-slate-600 font-medium p-4 pl-6 pt-0 pb-3 text-slate-400 dark:text-slate-200 text-left">
                            Description
                          </th>
                          <th className="border-b dark:border-slate-600 font-medium p-4 pl-6 pt-0 pb-3 text-slate-400 dark:text-slate-200 text-left">
                            User ID
                          </th>
                          <th className="border-b dark:border-slate-600 font-medium p-4 pl-6 pt-0 pb-3 text-slate-400 dark:text-slate-200 text-left">
                            Insert Date
                          </th>
                          <th className="border-b dark:border-slate-600 font-medium p-4 pl-6 pt-0 pb-3 text-slate-400 dark:text-slate-200 text-left">
                            Update Date
                          </th>
                          <th className="border-b dark:border-slate-600 font-medium p-4 pl-6 pt-0 pb-3 text-slate-400 dark:text-slate-200 text-left">
                            Status
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
                              <td className="border-b border-slate-100 dark:border-slate-700 p-4 pl-4 text-slate-500 dark:text-slate-400">
                                {project.gbm}
                              </td>
                              <td className="border-b border-slate-100 dark:border-slate-700 p-4 pl-6 text-slate-500 dark:text-slate-400">
                                {project.product}
                              </td>
                              <td className="border-b border-slate-100 dark:border-slate-700 p-4 pl-6 text-slate-500 dark:text-slate-400">
                                {project.plant}
                              </td>
                              <td className="border-b border-slate-100 dark:border-slate-700 p-4 pl-6 text-slate-500 dark:text-slate-400">
                                {project.route}
                              </td>
                              <td className="border-b border-slate-100 dark:border-slate-700 p-4 pl-6 text-slate-500 dark:text-slate-400">
                                {project.description}
                              </td>
                              <td className="border-b border-slate-100 dark:border-slate-700 p-4 pl-6 text-slate-500 dark:text-slate-400">
                                {project.userID}
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
