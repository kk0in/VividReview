"use client";
import { useEffect, useState } from "react";
import { usePapaParse } from "react-papaparse";

export default function VideoTimeline() {
  const { readRemoteFile } = usePapaParse();
  const [csvData, setCSVData] = useState([]);

  const csvFilePath = "/X_fv_0804_MX_0001.csv";

  const handleRemoteFile = () => {
    readRemoteFile(csvFilePath, {
      complete: (results: any) => {
        console.log(csvData);
        setCSVData(results.data);
      },
      download: true,
      header: true,
    });
  };

  useEffect(() => {
    handleRemoteFile();
  }, []);

  function timeToMilliseconds(timeString: string): number {
    // time string format hh:mm:ss.frame
    // fps = 60
    // console.log(timeString)
    if (timeString){
      const timeArray = timeString.split(":");
      const minute = parseInt(timeArray[1]);
      const second = parseInt(timeArray[2].split(".")[0]);
      const frame = parseInt(timeArray[2].split(".")[1]);
  
      const milliseconds =
        minute * 60 * 1000 +
        second * 1000 +
        (frame * 1000) / 60;
  
      return milliseconds;
    }
    else return 0;
  }

  const colormap = (label: string) => {
  }


  return (
    <>
      <div className="flex flex-row gap-1 overflow-auto">
        {csvData.map((row: any, rowIndex: number) => (
          <div key={rowIndex} className={`rounded py-1 px-3 border`} style={{width : timeToMilliseconds(row['duration'])}} >
            {row["label"]}
          </div>
        ))}
      </div>
    </>
  );
}
