"use client";
import { useEffect, useState } from "react";
import { usePapaParse } from "react-papaparse";

export default function VideoTimeline() {
  const { readRemoteFile } = usePapaParse();
  const [csvData, setCSVData] = useState([]);

  const csvFilePath = "/X_fv_0701_MX_0001.csv";

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
      const minute = parseInt(timeArray[0]);
      const second = parseInt(timeArray[1].split(".")[0]);
      const frame = parseInt(timeArray[1].split(".")[1]);
  
      const milliseconds =
        minute * 60 * 1000 +
        second * 1000 +
        (frame * 1000) / 60;
  
      return milliseconds;
    }
    else return 0;
  }

  const colormap = (label: string) => {
    if (label === "BG") return "#BAB0AC"
    let label_alphabet = label[0]
    switch (label_alphabet) {
      case "M":
        return "#4E79A7"
      case "G":
        return "#F28E2B"
      case "P":
        return "#E15759"
      case "R":
        return "#76B7B2"
      case "A":
        return "#59A14F"
  }}


  return (
    <>
      <div className="flex flex-row gap-2 overflow-auto">
        {csvData.map((row: any, rowIndex: number) => (
          <div key={rowIndex} className={`rounded py-2 px-4 border flex-none`} style={{width : timeToMilliseconds(row['duration'])/5, backgroundColor: colormap(row['label'])}} >
            {row["label"]}
          </div>
        ))}
      </div>
    </>
  );
}
