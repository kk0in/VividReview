import { useMemo } from "react";

export const processData = (
  data: any,
  positiveEmotion: string[],
  negativeEmotion: string[],
  selectedPositives: boolean[],
  selectedNegatives: boolean[]
) => {
  if (!data) return [];
  return data.map((d: any) => {
    const begin = parseFloat(d.begin);
    const end = parseFloat(d.end);
    const positiveSum = positiveEmotion.reduce((acc, cur) => {
      if (!selectedPositives[positiveEmotion.indexOf(cur)]) return acc;
      const value = d[cur];
      return acc + (isNaN(value) ? 0 : value);
    }, 0);

    const negativeSum = negativeEmotion.reduce((acc, cur) => {
      if (!selectedNegatives[negativeEmotion.indexOf(cur)]) return acc;
      const value = d[cur];
      return acc + (isNaN(value) ? 0 : value);
    }, 0);
    return {
      ...d,
      begin,
      end,
      positive_score: positiveSum,
      negative_score: negativeSum,
    };
  });
};

export const processPageInfo = (pageInfo: any) => {
  const timeToPagesMap = pageInfo
    ? Object.keys(pageInfo).map((page: any) => ({
        start: parseFloat(pageInfo[page].start),
        end: parseFloat(pageInfo[page].end),
        page: parseInt(page, 10),
      }))
    : [];
  return timeToPagesMap;
};

export const processTableOfContents = (tableOfContents: any) => {
  const pageToTitleSubtitleMap: {
    [key: number]: { title: string; subtitle: string };
  } = {};

  tableOfContents.forEach((content: any) => {
    content.subsections.forEach((sub: any) => {
      sub.page.forEach((page: number) => {
        pageToTitleSubtitleMap[page] = {
          title: content.title,
          subtitle: sub.title,
        };
      });
    });
  });

  return pageToTitleSubtitleMap;
};

export const calculateStartAndEnd = (
  pageKey: number | string,
  gridMode: number,
  pageInfo: any,
  pages: any[]
) => {
  let start: number = 0;
  let end: number = 0;
  switch (gridMode) {
    case 0:
      if (pageInfo && pageInfo[pageKey]) {
        start = pageInfo[pageKey].start;
        end = pageInfo[pageKey].end;
      }
      break;
    default:
      if (pageInfo && pageInfo[pages[0]] && pageInfo[pages[pages.length - 1]]) {
        start = pageInfo[pages[0]].start;
        end = pageInfo[pages[pages.length - 1]].end;
      }
      break;
  }
  return { start, end };
};

export const useProcessedData = (
  data: unknown,
  positiveEmotion: string[],
  negativeEmotion: string[],
  selectedPositives: boolean[],
  selectedNegatives: boolean[]
): any[] =>
  useMemo(
    () =>
      processData(
        data,
        positiveEmotion,
        negativeEmotion,
        selectedPositives,
        selectedNegatives
      ),
    [
      data,
      positiveEmotion,
      negativeEmotion,
      selectedPositives,
      selectedNegatives,
    ]
  );

export const useProcessedPageInfo = (pageInfo: unknown) =>
  useMemo(
    () => processPageInfo(pageInfo).map((page) => page.start),
    [pageInfo]
  );

export const useTableOfContentsMap = (tableOfContents: unknown) =>
  useMemo(() => processTableOfContents(tableOfContents), [tableOfContents]);

export const useMinMaxValues = (processedData: any[]) => {
  const yValues = processedData.flatMap(
    (data: { positive_score: any; negative_score: any }) => [
      data.positive_score,
      data.negative_score,
    ]
  );
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);

  const minX = Math.min(
    ...processedData
      .map((data: { begin: any; end: any }) => [data.begin, data.end])
      .flat()
  );
  const maxX = Math.max(
    ...processedData
      .map((data: { begin: any; end: any }) => [data.begin, data.end])
      .flat()
  );

  return { minY, maxY, minX, maxX };
};
