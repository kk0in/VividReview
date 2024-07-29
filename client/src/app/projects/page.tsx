"use client";
import React, { useState, useEffect } from "react";
import ExisitingProject from "@/components/home/ExistingProject";
import AppBar from '@/components/AppBar'

export default function Page() {
  return (
    <div className="flex w-full h-full flex-col items-center justify-between px-24 py-16 bg-slate-700 overflow-auto">
      
        <ExisitingProject />
        </div>
  );
}