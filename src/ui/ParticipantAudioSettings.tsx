import { useEffect, useMemo, useState } from "react";
import { mergeBrowserVoiceOptions, selectBrowserVoice, type BrowserVoiceOption, type ParticipantPromptSettings } from "../audio/participantPrompts";

interface Props { settings: ParticipantPromptSettings; onChange: (settings: ParticipantPromptSettings) => void; }
function readVoices(): BrowserVoiceOption[] { return typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis.getVoices().map(({ name, lang, voiceURI, default: isDefault }) => ({ name, lang, voiceURI, default: isDefault })) : []; }

export function ParticipantAudioSettings({ settings, onChange }: Props) {
  const [voices, setVoices] = useState<BrowserVoiceOption[]>(readVoices);
  useEffect(() => { if (!("speechSynthesis" in window)) return; const refresh = () => setVoices((known) => mergeBrowserVoiceOptions(known, readVoices())); refresh(); window.speechSynthesis.addEventListener?.("voiceschanged", refresh); return () => window.speechSynthesis.removeEventListener?.("voiceschanged", refresh); }, []);
  const selected = useMemo(() => selectBrowserVoice(voices, settings.voiceURI), [settings.voiceURI, voices]);
  const update = (change: Partial<ParticipantPromptSettings>) => onChange({ ...settings, ...change });
  return <section className="development-section participant-audio-settings"><p className="eyebrow">Participant audio</p><h2>Voice prompt settings</h2><div className="audio-settings-grid">
    <label><input type="checkbox" checked={settings.enabled} onChange={(event) => update({ enabled: event.target.checked })} /> Voice prompts on</label>
    <label>Preferred mode<select value={settings.preferredMode} onChange={(event) => update({ preferredMode: event.target.value as ParticipantPromptSettings["preferredMode"] })}><option value="natural-audio">Natural audio</option><option value="browser-voice">Browser voice</option></select></label>
    <label>Browser voice<select value={settings.voiceURI ?? ""} onChange={(event) => update({ voiceURI: event.target.value || null })}><option value="">Automatic ({selected ? `${selected.name}, ${selected.lang}` : "unavailable"})</option>{voices.map((voice) => <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name} ({voice.lang})</option>)}</select></label>
    <label>Volume: {Math.round(settings.volume * 100)}%<input type="range" min="0" max="1" step="0.05" value={settings.volume} onChange={(event) => update({ volume: Number(event.target.value) })} /></label>
    <label>Browser rate: {settings.rate.toFixed(2)}<input type="range" min="0.5" max="1.5" step="0.05" value={settings.rate} onChange={(event) => update({ rate: Number(event.target.value) })} /></label>
    <label>Browser pitch: {settings.pitch.toFixed(2)}<input type="range" min="0.5" max="1.5" step="0.05" value={settings.pitch} onChange={(event) => update({ pitch: Number(event.target.value) })} /></label>
  </div><p>Detected browser voices: {voices.length}. Selected fallback: {selected ? `${selected.name} (${selected.lang})` : "none"}.</p></section>;
}
