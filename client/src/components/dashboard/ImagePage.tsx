import Image from 'next/image';
import { useRecoilState } from 'recoil';
import { pdfImagesState } from "@/app/recoil/ViewerState";
import { gridModeState } from '@/app/recoil/ToolState';
import { getDimensionsFromBase64 } from '@/utils/image';

const ImagePage = (props: {projectId: string, pageNumber: number, className?: string, divisions?: number}) => {
  const [pdfImages, ] = useRecoilState(pdfImagesState);
  const [gridMode, ] = useRecoilState(gridModeState);

  const pageNumber = props.pageNumber;
  const scale = (props.divisions && props.divisions > 1) ? 95 : 100;

  if(!pdfImages[pageNumber-1]) return <></>;

  if (gridMode === 0) {
    return (
      <Image
        className={props.className}
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
      <div className={props.className}>
        <Image
          src={pdfImages[pageNumber-1].image}
          width={pdfImages[pageNumber-1].dimensions[0]}
          height={pdfImages[pageNumber-1].dimensions[1]}
          alt={`Page ${pageNumber}`}
          style={{width: `${scale}%`, height: `${scale}%`}}
        />
        {numDrawings && Array.from(Array(parseInt(numDrawings)).keys()).map((i) => {
          const drawing = localStorage.getItem(`drawings_${props.projectId}_${pageNumber}_${i+1}`);
          if (!drawing) return <></>;
          const dimensions = getDimensionsFromBase64(drawing);
          return (
            <Image
              key={i+1}
              src={drawing}
              width={dimensions[0]}
              height={dimensions[1]}
              alt={`Drawing ${i+1}`}
              style={{width: `${scale}%`, height: `${scale}%`}}
            />
          )
        })}
      </div>
    )
  }
}

export default ImagePage;