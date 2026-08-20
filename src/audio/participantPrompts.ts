export type ParticipantPromptEvent =
  | "exerciseReady" | "exerciseBegin" | "midpoint" | "exerciseComplete"
  | "rest" | "nextExercise" | "setComplete" | "programmeComplete"
  | "trackingLost" | "fullBodyVisible";

export interface ParticipantPrompt { key: string; event: ParticipantPromptEvent; text: string; assetPath?: string; }
export type ParticipantPromptMode = "natural-audio" | "browser-voice";
export interface BrowserVoiceOption { name: string; lang: string; voiceURI: string; default: boolean; }
export interface ParticipantPromptSettings { enabled: boolean; preferredMode: ParticipantPromptMode; voiceURI: string | null; volume: number; rate: number; pitch: number; }

export const DEFAULT_PARTICIPANT_PROMPT_SETTINGS: ParticipantPromptSettings = { enabled: true, preferredMode: "natural-audio", voiceURI: null, volume: 0.9, rate: 0.92, pitch: 1 };

export const PARTICIPANT_AUDIO_ASSETS: Readonly<Partial<Record<ParticipantPromptEvent, string>>> = {
  exerciseReady: "/audio/exercise-ready.mp3", exerciseBegin: "/audio/begin.mp3",
  midpoint: "/audio/thirty-seconds-remaining.mp3", exerciseComplete: "/audio/exercise-complete.mp3",
  rest: "/audio/rest.mp3", nextExercise: "/audio/next-exercise.mp3", setComplete: "/audio/set-complete.mp3",
  programmeComplete: "/audio/programme-complete.mp3", trackingLost: "/audio/tracking-lost.mp3",
  fullBodyVisible: "/audio/full-body-visible.mp3",
};

export function withPromptAsset(prompt: Omit<ParticipantPrompt, "assetPath">): ParticipantPrompt {
  return { ...prompt, assetPath: PARTICIPANT_AUDIO_ASSETS[prompt.event] };
}

function languageRank(lang: string): number {
  const normalized = lang.toLowerCase();
  if (normalized === "en-au") return 0;
  if (normalized === "en-gb") return 1;
  if (normalized === "en" || normalized.startsWith("en-")) return 2;
  return 3;
}

export function rankBrowserVoices(voices: readonly BrowserVoiceOption[]): BrowserVoiceOption[] {
  return voices.map((voice, index) => ({ voice, index })).sort((a, b) => languageRank(a.voice.lang) - languageRank(b.voice.lang) || Number(b.voice.default) - Number(a.voice.default) || a.index - b.index).map(({ voice }) => voice);
}

/** Browser voice discovery is asynchronous and may temporarily return a partial list. */
export function mergeBrowserVoiceOptions(
  known: readonly BrowserVoiceOption[],
  discovered: readonly BrowserVoiceOption[],
): BrowserVoiceOption[] {
  const merged = new Map(known.map((voice) => [voice.voiceURI, voice]));
  for (const voice of discovered) merged.set(voice.voiceURI, voice);
  return [...merged.values()];
}

export function selectBrowserVoice(voices: readonly BrowserVoiceOption[], selectedVoiceURI: string | null): BrowserVoiceOption | null {
  if (selectedVoiceURI) {
    const manual = voices.find((voice) => voice.voiceURI === selectedVoiceURI);
    if (manual) return manual;
  }
  return rankBrowserVoices(voices).find((voice) => voice.lang.toLowerCase().startsWith("en")) ?? rankBrowserVoices(voices)[0] ?? null;
}

export interface NaturalAudioAdapter { play: (assetPath: string, volume: number) => Promise<boolean>; cancel: () => void; }
export interface BrowserSpeechAdapter { speak: (text: string, settings: ParticipantPromptSettings, voice: BrowserVoiceOption | null) => void; cancel: () => void; }

export class ParticipantPromptService {
  private lastKey: string | null = null;
  private generation = 0;
  constructor(private readonly naturalAudio: NaturalAudioAdapter | null, private readonly browserSpeech: BrowserSpeechAdapter | null) {}
  get available(): boolean { return this.naturalAudio !== null || this.browserSpeech !== null; }
  async announce(prompt: ParticipantPrompt | null, settings: ParticipantPromptSettings, voices: readonly BrowserVoiceOption[]): Promise<void> {
    if (!settings.enabled || !prompt) { this.cancel(); this.lastKey = null; return; }
    if (prompt.key === this.lastKey) return;
    this.cancel(); this.lastKey = prompt.key;
    const generation = this.generation;
    if (settings.preferredMode === "natural-audio" && prompt.assetPath && this.naturalAudio) {
      const played = await this.naturalAudio.play(prompt.assetPath, settings.volume);
      if (played || generation !== this.generation || this.lastKey !== prompt.key) return;
    }
    this.browserSpeech?.speak(prompt.text, settings, selectBrowserVoice(voices, settings.voiceURI));
  }
  cancel(): void { this.generation += 1; this.naturalAudio?.cancel(); this.browserSpeech?.cancel(); }
  dispose(): void { this.cancel(); this.lastKey = null; }
}

export function createHtmlAudioAdapter(): NaturalAudioAdapter | null {
  if (typeof Audio === "undefined") return null;
  let current: HTMLAudioElement | null = null;
  return {
    cancel: () => { if (current) { current.pause(); current.currentTime = 0; current = null; } },
    play: (assetPath, volume) => new Promise((resolve) => {
      const baseUrl = import.meta.env.BASE_URL.endsWith("/") ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
      const audio = new Audio(`${baseUrl}${assetPath.replace(/^\/+/, "")}`); current = audio; audio.volume = Math.max(0, Math.min(1, volume));
      const failed = () => { if (current === audio) current = null; resolve(false); };
      audio.addEventListener("error", failed, { once: true });
      void audio.play().then(() => resolve(true)).catch(failed);
    }),
  };
}

export function createBrowserSpeechAdapter(): BrowserSpeechAdapter | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") return null;
  const knownVoices = new Map<string, SpeechSynthesisVoice>();
  const refreshVoices = () => {
    for (const voice of window.speechSynthesis.getVoices()) knownVoices.set(voice.voiceURI, voice);
  };
  refreshVoices();
  return {
    cancel: () => window.speechSynthesis.cancel(),
    speak: (text, settings, selected) => {
      refreshVoices();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = settings.rate; utterance.pitch = settings.pitch; utterance.volume = settings.volume;
      if (selected) utterance.voice = knownVoices.get(selected.voiceURI) ?? null;
      window.speechSynthesis.speak(utterance);
    },
  };
}
