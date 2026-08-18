import { withPromptAsset, type ParticipantPrompt } from "../audio/participantPrompts";
import type { ParticipantViewModel } from "./participantMode";

export function participantSpeechPrompt(view: ParticipantViewModel): ParticipantPrompt | null {
  if (view.screen === "ready") return withPromptAsset({ key: `ready-${view.setNumber}-${view.exerciseNumber}`, event: "exerciseReady", text: `Exercise ${view.exerciseNumber}. Perform this exercise for ${view.durationSeconds} seconds. Raise your right arm when you are ready.` });
  if (view.screen === "exercising") return view.exerciseSecondsRemaining <= Math.floor(view.durationSeconds / 2)
    ? withPromptAsset({ key: `midpoint-${view.setNumber}-${view.exerciseNumber}`, event: "midpoint", text: `${Math.floor(view.durationSeconds / 2)} seconds remaining.` })
    : withPromptAsset({ key: `start-${view.setNumber}-${view.exerciseNumber}`, event: "exerciseBegin", text: "Begin." });
  if (view.screen === "rest") return view.exerciseNumber === view.exerciseCount
    ? withPromptAsset({ key: `set-complete-${view.setNumber}`, event: "setComplete", text: `Set ${view.setNumber} complete. Rest. Raise your right arm when you are ready for the next exercise.` })
    : withPromptAsset({ key: `rest-${view.setNumber}-${view.exerciseNumber}`, event: "exerciseComplete", text: "Exercise complete. Rest. Raise your right arm when you are ready for the next exercise." });
  if (view.screen === "complete") return withPromptAsset({ key: "programme-complete", event: "programmeComplete", text: "Programme complete." });
  return null;
}
