"use client";

import { useState } from "react";
import SelectProject from "@/components/home/SelectProject";

export default function Home() {
  // const [view, setView] = useState("select");

  return (
    <div className="flex w-full h-full flex-col items-center justify-between px-24 py-16 bg-slate-700 overflow-auto">
      <div className="flex place-items-center my-auto mx-auto">
        <div>
          <div className="rounded overflow-hidden shadow-lg px-12 py-8 bg-white w-full">
            <SelectProject />
          </div>
        </div>
      </div>
    </div>
  );
}
