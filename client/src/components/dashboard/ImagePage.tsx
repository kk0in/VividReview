import Image from 'next/image';
import { useRecoilState } from 'recoil';
import { pdfImagesState } from "@/app/recoil/ViewerState";
import { getDimensionsFromBase64 } from '@/utils/image';

const ImagePage = (props: {pageNumber: number, className?: string, divisions?: number}) => {
  const [pdfImages, ] = useRecoilState(pdfImagesState);

  const pageNumber = props.pageNumber;
  const scale = (props.divisions && props.divisions > 1) ? 95 : 100;

  if(!pdfImages[pageNumber-1]) return <></>;

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
}

export default ImagePage;