"use client";

import { CloudArrowDownIcon, PlusCircleIcon } from "@heroicons/react/24/solid";
import Link from "next/link"

// select whether to create new project or load existing project
export default function SelectProject() {
  return (
    <div className="flex items-center justify-center gap-10">
      <button
        className="not-prose relative bg-white hover:-translate-y-1 transition duration-200 hover:shadow-lg shadow-md flex justify-center items-center rounded-xl overflow-hidden w-80 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      >
        <Link href="/projects">
          <div className="relative overflow-auto flex flex-col justify-center items-center h-80">
            <CloudArrowDownIcon className="h-20 w-20 text-slate-400" />
            <div className="border-slate-100 dark:border-slate-700 p-4 font-semibold text-slate-500 dark:text-slate-400 text-center text-lg">Review Mode</div>
            <div className="border-slate-100 dark:border-slate-700 p-4 text-slate-500 dark:text-slate-400 text-center text-sm">Load existing projects from files on server.</div>
          </div>
          <div className="absolute inset-0 pointer-events-none border border-black/5 rounded-xl dark:border-white/5"></div>
        </Link>
      </button>
      <button
        className="not-prose relative bg-white hover:-translate-y-1 transition duration-200 hover:shadow-lg shadow-md flex justify-center items-center rounded-xl overflow-hidden w-80 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      >
        <Link href="/add">
          <div className="relative overflow-auto flex flex-col justify-center items-center h-80">
            <PlusCircleIcon className="h-20 w-20 text-slate-400" />
            <div className="border-slate-100 dark:border-slate-700 p-4 font-semibold text-slate-500 dark:text-slate-400 text-center text-lg">Lecture Mode</div>
            <div className="border-slate-100 dark:border-slate-700 p-4 text-slate-500 dark:text-slate-400 text-center text-sm">Create new project from your pdf file.</div>
          </div>
          <div className="absolute inset-0 pointer-events-none border border-black/5 rounded-xl dark:border-white/5"></div>
        </Link>
      </button>
    </div>
  );
}
