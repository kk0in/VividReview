import React from "react";
import { lassoTransform } from "@/utils/api";
import { useRecoilState, useSetRecoilState } from "recoil";
import { activePromptState } from "@/app/recoil/LassoState";
import { TriangleLeftIcon, TriangleRightIcon } from "@primer/octicons-react";
import { processingState } from "@/app/recoil/ViewerState";

const PromptDisplay = (props: {answers: string[], projectId: string, page: number, focusedLasso: number, prompts: string[], rerenderFlag: boolean}) => {
  const [activePromptIndex, setActivePromptIndex] = useRecoilState(activePromptState);
  const setProcessing = useSetRecoilState(processingState);

  const showFlag = (props.answers.length >= activePromptIndex[2] && props.answers.length > 0);

  const convertWhiteSpaces = (text: string) => {
    return text.replace(/  /g, "\u00a0\u00a0");
  };

  const convertStrongSymbols = (text: string) => {
    return text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  };

  const convertLineEscapes = (text: string) => {
    return text.replace(/\n/g, "<br/>");
  };

  const convertListSymbols = (text: string) => {
    return text.replace(/- (.*?)(\n|$)/g, "|• $1\n");
  };

  const highlightKeywords = (text: string, keywords: string[]) => {
    let result = text;
    for (const keyword of keywords) {
      result = result.replace(
        new RegExp(keyword, "gi"),
        (text) => `<span class="text-red-600 font-bold">${text}</span>`
      );
    }
    return result;
  };

  const preprocessText = (text: string, keywords: string[]) => {
    if (!text) return [];
    let processedHTML = convertListSymbols(text);
    processedHTML = convertStrongSymbols(processedHTML);
    processedHTML = convertWhiteSpaces(processedHTML);
    processedHTML = highlightKeywords(processedHTML, keywords);
    return processedHTML.split("|");
  };

  return (
    <>
      <div className="px-2">
        {showFlag
          ? preprocessText(props.answers[activePromptIndex[2]], []).map(
              (line) => {
                return (
                  <div key={`promptdisplaysubdiv-${line}`}>
                    {line}
                    <br />
                  </div>
                );
              }
            )
          : ""}
      </div>
      <div className="relative grid grid-cols-3 items-center h-9">
        <div className="flex flex-grow justify-start px-1">
          {activePromptIndex[2] > 0 && (
            <button
              onClick={() =>
                setActivePromptIndex([
                  activePromptIndex[0],
                  activePromptIndex[1],
                  activePromptIndex[2] - 1,
                ])
              }
            >
              <TriangleLeftIcon size="medium" />
            </button>
          )}
        </div>
        <div className="flex justify-center">
          {props.answers.length > 0 && (
            <div>
              {activePromptIndex[2] + 1} / {props.answers.length}
            </div>
          )}
        </div>
        <div className="flex justify-end">
          {activePromptIndex[2] < props.answers.length - 1 && (
            <button
              onClick={() =>
                setActivePromptIndex([
                  activePromptIndex[0],
                  activePromptIndex[1],
                  activePromptIndex[2] + 1,
                ])
              }
            >
              <TriangleRightIcon size="medium" />
            </button>
          )}
        </div>
      </div>
      {showFlag && (
        <div className="change-answers flex flex-row justify-items-center font-sans">
          {["regenerate", "shorten", "bullet point"].map((prompt, idx) => {
            const transformedPrompt = prompt === "bullet point" ? "bullet_point" : prompt;

            return (
                <button
                  className="bg-slate-500 text-white grow rounded mx-0.5 px-2 py-1"
                  onClick={async () => {
                    setProcessing({isProcessing: true, message: "Transforming answers..."});
                    const response = await lassoTransform(
                      props.projectId,
                      props.page,
                      props.focusedLasso,
                      activePromptIndex[2] + 1,
                      activePromptIndex[1],
                      transformedPrompt
                    );
                    setProcessing({isProcessing: false, message: ""});
                    console.log(response);
                    setActivePromptIndex([
                      activePromptIndex[0],
                      activePromptIndex[1],
                      response.version - 1,
                    ]);
                  }}
                >
                  {prompt}
                </button>
            );
          })}
        </div>
      )}
    </>
  );
}

export default PromptDisplay;