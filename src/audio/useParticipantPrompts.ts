import { useEffect, useRef, useState } from "react";
import { createBrowserSpeechAdapter, createHtmlAudioAdapter, mergeBrowserVoiceOptions, ParticipantPromptService, type BrowserVoiceOption, type ParticipantPrompt, type ParticipantPromptSettings } from "./participantPrompts";

function browserVoices(): BrowserVoiceOption[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  return window.speechSynthesis.getVoices().map(({ name, lang, voiceURI, default: isDefault }) => ({ name, lang, voiceURI, default: isDefault }));
}

export function useParticipantPrompts(prompt: ParticipantPrompt | null, settings: ParticipantPromptSettings) {
  const serviceRef = useRef<ParticipantPromptService | null>(null);
  if (!serviceRef.current) serviceRef.current = new ParticipantPromptService(createHtmlAudioAdapter(), createBrowserSpeechAdapter());
  const [voices, setVoices] = useState<BrowserVoiceOption[]>(browserVoices);
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const refresh = () => setVoices((known) => mergeBrowserVoiceOptions(known, browserVoices()));
    refresh(); window.speechSynthesis.addEventListener?.("voiceschanged", refresh);
    return () => window.speechSynthesis.removeEventListener?.("voiceschanged", refresh);
  }, []);
  useEffect(() => { void serviceRef.current?.announce(prompt, settings, voices); }, [prompt?.key, prompt?.text, prompt?.assetPath, settings, voices]);
  useEffect(() => () => serviceRef.current?.dispose(), []);
  return { available: serviceRef.current.available, voices };
}
