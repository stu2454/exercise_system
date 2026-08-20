import { describe, expect, it, vi } from "vitest";
import { DEFAULT_PARTICIPANT_PROMPT_SETTINGS, mergeBrowserVoiceOptions, ParticipantPromptService, rankBrowserVoices, selectBrowserVoice, type BrowserSpeechAdapter, type BrowserVoiceOption, type NaturalAudioAdapter, type ParticipantPromptSettings } from "./participantPrompts";

const prompt = { key: "begin-1", event: "exerciseBegin" as const, text: "Begin.", assetPath: "/audio/begin.mp3" };
const voices: BrowserVoiceOption[] = [
  { name: "US", lang: "en-US", voiceURI: "us", default: true }, { name: "GB", lang: "en-GB", voiceURI: "gb", default: false }, { name: "AU", lang: "en-AU", voiceURI: "au", default: false }, { name: "French", lang: "fr-FR", voiceURI: "fr", default: false },
];
function setup(audioResult: boolean) { const natural: NaturalAudioAdapter = { play: vi.fn().mockResolvedValue(audioResult), cancel: vi.fn() }; const speech: BrowserSpeechAdapter = { speak: vi.fn(), cancel: vi.fn() }; return { natural, speech, service: new ParticipantPromptService(natural, speech) }; }
function settings(change: Partial<ParticipantPromptSettings> = {}): ParticipantPromptSettings { return { ...DEFAULT_PARTICIPANT_PROMPT_SETTINGS, ...change }; }

describe("ParticipantPromptService", () => {
  it("prefers natural audio when its asset plays", async () => { const { natural, speech, service } = setup(true); await service.announce(prompt, settings(), voices); expect(natural.play).toHaveBeenCalledWith("/audio/begin.mp3", 0.9); expect(speech.speak).not.toHaveBeenCalled(); });
  it("uses browser TTS in browser-voice mode", async () => { const { natural, speech, service } = setup(true); await service.announce(prompt, settings({ preferredMode: "browser-voice" }), voices); expect(natural.play).not.toHaveBeenCalled(); expect(speech.speak).toHaveBeenCalledOnce(); });
  it("falls back when natural audio is missing or fails", async () => { const { speech, service } = setup(false); await service.announce(prompt, settings(), voices); expect(speech.speak).toHaveBeenCalledOnce(); });
  it("cancels stale prompts and ignores duplicate render announcements", async () => { const { natural, speech, service } = setup(true); await service.announce(prompt, settings(), voices); await service.announce(prompt, settings(), voices); expect(natural.play).toHaveBeenCalledOnce(); await service.announce({ ...prompt, key: "begin-2" }, settings(), voices); expect(natural.cancel).toHaveBeenCalledTimes(2); expect(speech.cancel).toHaveBeenCalledTimes(2); });
  it("mutes and cancels both delivery modes", async () => { const { natural, speech, service } = setup(true); await service.announce(prompt, settings({ enabled: false }), voices); expect(natural.play).not.toHaveBeenCalled(); expect(speech.speak).not.toHaveBeenCalled(); expect(natural.cancel).toHaveBeenCalledOnce(); });
  it("passes configured volume to natural audio and TTS", async () => { const { natural, speech, service } = setup(false); await service.announce(prompt, settings({ volume: 0.35 }), voices); expect(natural.play).toHaveBeenCalledWith(expect.any(String), 0.35); expect(speech.speak).toHaveBeenCalledWith("Begin.", expect.objectContaining({ volume: 0.35 }), expect.anything()); });
  it("selects en-AU, then en-GB, then another English voice", () => { expect(rankBrowserVoices(voices).map((voice) => voice.voiceURI).slice(0, 3)).toEqual(["au", "gb", "us"]); expect(selectBrowserVoice(voices, null)?.voiceURI).toBe("au"); expect(selectBrowserVoice(voices.filter((v) => v.voiceURI !== "au"), null)?.voiceURI).toBe("gb"); expect(selectBrowserVoice(voices.filter((v) => !["au", "gb"].includes(v.voiceURI)), null)?.voiceURI).toBe("us"); expect(selectBrowserVoice(voices, "us")?.voiceURI).toBe("us"); });
  it("retains a manually selectable voice across partial browser voice refreshes", () => {
    const refreshed = mergeBrowserVoiceOptions(voices, voices.filter((voice) => voice.voiceURI !== "us"));
    expect(selectBrowserVoice(refreshed, "us")?.voiceURI).toBe("us");
  });
});
