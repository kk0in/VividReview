import { IToCIndex, IToCSection } from "@/app/recoil/ViewerState";

export const findPage = (time: number, pageInfo: any): number => {
  if (!pageInfo) {
    return 0;
  }

  const fixedTime = calibratePrecision(time);
  for (const [key, value] of Object.entries<{ start: number; end: number }>(
    pageInfo
  )) {
    if (fixedTime >= calibratePrecision(value.start) && fixedTime < calibratePrecision(value.end)) {
      return parseInt(key);
    }
  }

  return 0;
};

export const findTocIndex = (page: number, toc: IToCSection[]) => {
  for (let i = 0; i < toc.length; i++) {
    const section = toc[i];
    for (let j = 0; j < section.subsections.length; j++) {
      const subsection = section.subsections[j];
      if (subsection.page[subsection.page.length - 1] >= page) {
        console.log("Found ToC index:", page, i, j);
        return { section: i, subsection: j };
      }
    }
  }

  console.log("No ToC index found for page: ", page);
  return null;
};

export const calibratePrecision = (time: number) => {
  return typeof time === "number" ? Number(time.toFixed(5)) : 0;
};

export const findTimeRange = (page: number, pageInfo: any, gridMode:number, toc: IToCSection[], tocIndex: IToCIndex) => {
  const newTimeRange = { start: 0, end: 0 };

  switch (gridMode) {
    case 0: {
      const value = pageInfo[page];

      if (value) {
        newTimeRange.start = value.start;
        newTimeRange.end = value.end;
      }
      break;
    }

    case 1: {
      const section = toc[tocIndex.section];
      const startSubSection = section.subsections[0];
      const endSubSection = section.subsections[section.subsections.length - 1];
      const startPage = startSubSection.page[0];
      const endPage = endSubSection.page[endSubSection.page.length - 1];

      const startValue = pageInfo[startPage];
      const endValue = pageInfo[endPage];

      if (startValue && endValue) {
        newTimeRange.start = startValue.start;
        newTimeRange.end = endValue.end;
      }
      break;
    }

    case 2: {
      const section = toc[tocIndex.section];
      const subsection = section.subsections[tocIndex.subsection];
      const startPage = subsection.page[0];
      const endPage = subsection.page[subsection.page.length - 1];

      const startValue = pageInfo[startPage];
      const endValue = pageInfo[endPage];

      if (startValue && endValue) {
        newTimeRange.start = startValue.start;
        newTimeRange.end = endValue.end;
      }
      break;
    }
  }

  newTimeRange.start = calibratePrecision(newTimeRange.start);
  newTimeRange.end = calibratePrecision(newTimeRange.end);

  return newTimeRange;
};
