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

  if(!pdfImages || !pdfImages[pageNumber-1] || !pdfImages[pageNumber-1].dimensions || !pdfImages[pageNumber-1].image) return <></>;

  if (gridMode === 0) {
    return (
      <div className={props.className + " w-full h-full pointer-events-none"}>
        <Image
          className={"pdf-next-image h-full"}
          src={pdfImages[pageNumber - 1].image}
          width={pdfImages[pageNumber - 1].dimensions[0]}
          height={pdfImages[pageNumber - 1].dimensions[1]}
          alt={`Page ${pageNumber}`}
        />
      </div>
    );
  } else {
    const numDrawings = localStorage.getItem(`numLayers_${props.projectId}_${pageNumber}`)
    return (
      <div className={"relative w-fit h-fit mx-1 mb-5"}>
        <Image
          className={props.className + " absolute h-full pdf-next-image"}
          src={pdfImages[pageNumber-1].image}
          width={pdfImages[pageNumber-1].dimensions[0]}
          height={pdfImages[pageNumber-1].dimensions[1]}
          alt={`Page ${pageNumber}`}
        />
        {numDrawings && Array.from(Array(parseInt(numDrawings)).keys()).map((i) => {
          const drawing = localStorage.getItem(`drawings_${props.projectId}_${pageNumber}_${i+1}`);
          if (!drawing) return <></>;
          return (
            <Image
              className="absolute w-full h-full"
              key={i+1}
              src={drawing}
              width={pdfImages[pageNumber-1].dimensions[0]}
              height={pdfImages[pageNumber-1].dimensions[1]}
              alt={`Drawing ${i+1}`}
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