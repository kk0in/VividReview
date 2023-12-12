"use client";
import React, { useState, useEffect } from "react";
import ExisitingProject from "@/components/home/ExistingProject";

export default function Page() {
  return (
    <div className="flex w-full h-full flex-col items-center justify-between px-24 py-16 bg-slate-700 overflow-auto">
      <div className="flex place-items-center my-auto mx-auto">
      <div className="rounded overflow-hidden shadow-lg px-12 py-8 bg-white w-full">

        <ExisitingProject />
        </div>
      </div>
    </div>
  );
}