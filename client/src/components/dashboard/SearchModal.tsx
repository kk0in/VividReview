import React from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { FaXmark } from "react-icons/fa6";

ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  pieChartData: { [key: number]: { labels: string[]; datasets: any[] } | null };
  showPieChart: { [key: number]: boolean };
  // pieChartData: { labels: string[]; datasets: any[] } | null;
  // showPieChart: boolean;
  // chartPosition: { top: number; left: number } | null; 
}

export default function SearchModal({
  isOpen,
  onClose,
  children,
  pieChartData,
  showPieChart,
  // chartPosition, 
}: SearchModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-gray-200 rounded-lg shadow-lg w-11/12 max-w-7xl h-full p-6 relative">
        <button
          className="absolute z-10 bg-slate-400 p-1 rounded-full top-2 right-2 text-slate-700 hover:text-slate-900 text-3xl"
          onClick={onClose}
        >
          <FaXmark />
        </button>
        <div className="h-full overflow-y-auto relative">{children}</div>
      </div>
    </div>
  );
}
