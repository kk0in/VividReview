"use client";
import React, { useState, useEffect } from "react";

export default function Page() {
  useEffect(() => {
    setTimeout(() => {
      window.location.href = "/projects";
    }, 3000);
  }, []);

  return (
    <div className="h-full flex flex-col bg-slate-700 ">
      <div className="rounded overflow-hidden shadow-lg px-12 py-8 bg-white w-2/3 mx-auto my-auto">
        Project not selected. Move to project list in 3 seconds.
      </div>
    </div>
  );
}
