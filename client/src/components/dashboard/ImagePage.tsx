import Image from 'next/image';
import { useRecoilState } from 'recoil';
import { pdfImagesState } from "@/app/recoil/ViewerState";

const ImagePage = (props: {pageNumber: number, className?: string, divisions?: number}) => {
  const [pdfImages, ] = useRecoilState(pdfImagesState);

  const pageNumber = props.pageNumber;
  const scale = (props.divisions && props.divisions > 1) ? 95 : 100;

  let width = 0;
  let height = 0;

  const img = document.createElement('img');
  img.src = pdfImages[pageNumber-1];
  img.onload = () => {
    width = img.naturalWidth;
    height = img.naturalHeight;
  }

  return (
    <Image
      className={props.className}
      src={pdfImages[pageNumber-1]}
      width={width}
      height={height}
      alt={`Page ${pageNumber}`}
      style={{width: `${scale}%`, height: `${scale}%`}}
    />
  )
}

export default ImagePage;