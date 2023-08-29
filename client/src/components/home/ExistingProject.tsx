"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { getProjectList } from "@/utils/api";

interface ExistingrojectProps {
    setView: React.Dispatch<React.SetStateAction<string>>;
  };
  
const ExistingProject: React.FC<ExistingrojectProps> = ({ setView }) => {
  const { data: projectListData } = useQuery(["projectList"], getProjectList, {
    onSuccess: (data) => {
      console.log(data);
    },
  });

  return (
    <div className="min-w-[50rem]">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900">Existing Projects</h3>
        <h4 className="text-sm font-medium text-gray-500">
          Project information
        </h4>
      </div>
      <div>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>GBM</th>
              <th>Product</th>
              <th>Plant</th>
              <th>Route</th>
              <th>Description</th>
              <th>Done</th>
            </tr>
          </thead>
          <tbody>
            {projectListData &&
              projectListData.projects.map((project: any) => (
                <tr key={project.id}>
                  <td>{project.id}</td>
                  <td>{project.gbm}</td>
                  <td>{project.product}</td>
                  <td>{project.plant}</td>
                  <td>{project.route}</td>
                  <td>{project.description}</td>
                  <td>
                    {project.done ? (
                      <Link href={`/dashboard/${project.id}`}>
                        Go to dashboard
                      </Link>
                    ) : (
                      "NOT DONE"
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <button onClick={() => setView("select")}>go back</button>
    </div>
  );
}

export default ExistingProject