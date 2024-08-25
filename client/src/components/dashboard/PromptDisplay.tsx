import React from "react";
import { lassoTransform } from "@/utils/api";
import { useRecoilState } from "recoil";
import { activePromptState } from "@/app/recoil/LassoState";

const PromptDisplay = (props: {answers: string[], projectId: string, page: number, focusedLasso: number, prompts: string[], rerenderFlag: boolean}) => {
  const [activePromptIndex, setActivePromptIndex] = useRecoilState(activePromptState);

  return (
    <>
      <div>
        {props.answers.length >= activePromptIndex[2] ? props.answers[activePromptIndex[2]] : ""}
      </div>
      <div className="control-buttons">
        {activePromptIndex[2] > 0 && (
          <button onClick={() => setActivePromptIndex([activePromptIndex[0], activePromptIndex[1], activePromptIndex[2] - 1])}>
            Previous
          </button>
        )}
        {activePromptIndex[2] < props.answers.length - 1 && ( // TOFIX
          <button onClick={() => setActivePromptIndex([activePromptIndex[0], activePromptIndex[1], activePromptIndex[2] + 1])}>
            Next
          </button>
        )}
      </div>
      <div className="change-answers">
        {["regenerate", "shorten", "bullet_point"].map((prompt, idx) => {
          return (
            <>
              <button onClick={async () => {
                const response = await lassoTransform(props.projectId, props.page, props.focusedLasso, activePromptIndex[2]+1, props.prompts[activePromptIndex[1]], prompt);
                setActivePromptIndex([activePromptIndex[0], activePromptIndex[1], response.version - 1]);
              }}>
                {prompt}
              </button>
            </>
          )
        })}
      </div>
    </>
  )
}

export default PromptDisplay;