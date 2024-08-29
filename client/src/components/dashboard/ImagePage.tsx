import Image from 'next/image';
import { useRecoilState } from 'recoil';
import { pdfImagesState } from "@/app/recoil/ViewerState";
import { gridModeState } from '@/app/recoil/ToolState';
import { getDimensionsFromBase64 } from '@/utils/image';
import { useEffect, useRef } from 'react';

const ImagePage = (props: {projectId: string, pageNumber: number, className?: string, divisions?: number}) => {
  const [pdfImages, ] = useRecoilState(pdfImagesState);
  const [gridMode, ] = useRecoilState(gridModeState);
  const dummyRef = useRef<HTMLCanvasElement>(null);

  const pageNumber = props.pageNumber;
  const scale = (props.divisions && props.divisions > 1) ? 95 : 100;

  useEffect(() => {
    if (gridMode === 1 && dummyRef.current) {
      const ctx = dummyRef.current.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, dummyRef.current.width, dummyRef.current.height);
    }
  }, [gridMode, pageNumber]);

  if(!pdfImages[pageNumber-1]) return <></>;

  if (gridMode === 0) {
    return (
      <Image
        className={`pdf-next-image ${props.className}`}
        src={pdfImages[pageNumber-1].image}
        width={pdfImages[pageNumber-1].dimensions[0]}
        height={pdfImages[pageNumber-1].dimensions[1]}
        alt={`Page ${pageNumber}`}
        style={{width: `${scale}%`, height: `${scale}%`}}
      />
    )
  } else {
    const numDrawings = localStorage.getItem(`numLayers_${props.projectId}_${pageNumber}`)
    return (
      <div className={`${props.className} w-fit h-fit`} style={{position: "relative"}}>
        <Image
          className={"pdf-next-image"}
          src={pdfImages[pageNumber-1].image}
          width={pdfImages[pageNumber-1].dimensions[0]}
          height={pdfImages[pageNumber-1].dimensions[1]}
          alt={`Page ${pageNumber}`}
          style={{width: `${scale}%`, height: `${scale}%`, position: "absolute"}}
        />
        {numDrawings && Array.from(Array(parseInt(numDrawings)).keys()).map((i) => {
          const drawing = localStorage.getItem(`drawings_${props.projectId}_${pageNumber}_${i+1}`);
          if (!drawing) return <></>;
          return (
            <Image
              key={i+1}
              src={drawing}
              width={pdfImages[pageNumber-1].dimensions[0]}
              height={pdfImages[pageNumber-1].dimensions[1]}
              alt={`Drawing ${i+1}`}
              style={{width: `${scale}%`, height: `${scale}%`, position: "absolute"}}
            />
          )
        })}
        <canvas
          ref={dummyRef}
          id={`dummy-canvas-${pageNumber}`}
          width={pdfImages[pageNumber-1].dimensions[0]}
          height={pdfImages[pageNumber-1].dimensions[1]}
          style={{width: `${scale}%`, height: `${scale}%`}}
        />
      </div>
    )
  }
}

export default ImagePage;