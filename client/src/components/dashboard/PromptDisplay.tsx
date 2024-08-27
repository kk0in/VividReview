import React from "react";
import { lassoTransform } from "@/utils/api";
import { useRecoilState } from "recoil";
import { activePromptState } from "@/app/recoil/LassoState";
import { TriangleLeftIcon, TriangleRightIcon } from "@primer/octicons-react";

const PromptDisplay = (props: {answers: string[], projectId: string, page: number, focusedLasso: number, prompts: string[], rerenderFlag: boolean}) => {
  const [activePromptIndex, setActivePromptIndex] = useRecoilState(activePromptState);

  const showFlag = (props.answers.length >= activePromptIndex[2] && props.answers.length > 0);

  const preprocessText = (text: string, keywords: string[]) => {
    if (text === undefined) return "";
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

    const processedHTML = text.replace(/- (.*?)(\n|$)/g, "• $1\n")
                            .replace(/\n/g, "<br />")
                            .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                            .replace(/  /g, "\u00a0\u00a0");
    return highlightKeywords(processedHTML, keywords);
  };

  return (
    <>
      <div>
        {showFlag ? preprocessText(props.answers[activePromptIndex[2]], []) : ""}
      </div>
      <div className="flex control-buttons">
        {activePromptIndex[2] > 0 && (
          <button onClick={() => setActivePromptIndex([activePromptIndex[0], activePromptIndex[1], activePromptIndex[2] - 1])}
            style={{marginRight: "auto", marginLeft: "0", display: "block"}}
          >
            <TriangleLeftIcon size="medium"/>
          </button>
        )}
        {activePromptIndex[2] < props.answers.length - 1 && (
          <button onClick={() => setActivePromptIndex([activePromptIndex[0], activePromptIndex[1], activePromptIndex[2] + 1])}
            style={{marginLeft: "auto", marginRight: "0", display: "block"}}
          >
            <TriangleRightIcon size="medium"/>
          </button>
        )}
      </div>
      {showFlag && <div className="change-answers">
        {["regenerate", "shorten", "bullet_point"].map((prompt, idx) => {
          return (
            <>
              <button onClick={async () => {
                const response = await lassoTransform(props.projectId, props.page, props.focusedLasso, activePromptIndex[2]+1, props.prompts[activePromptIndex[1]], prompt);
                setActivePromptIndex([activePromptIndex[0], activePromptIndex[1], response.version - 1]);
              }}
                style={{border: "2px solid black", margin: "5px", padding: "3px", borderRadius: "3px"}}  
              >
                {prompt}
              </button>
            </>
          )
        })}
      </div>
      }
    </>
  )
}

export default PromptDisplay;