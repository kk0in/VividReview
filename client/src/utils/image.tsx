export const getDimensionsFromBase64 = (image: string) => {
  const img = new Image();
  img.src = image;
  let width = 0;
  let height = 0;
  img.onload = () => {
    width = img.naturalWidth;
    height = img.naturalHeight;
  }
  return [width, height];
}