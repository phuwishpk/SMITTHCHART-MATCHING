import React, { useEffect, useRef, useState } from 'react';

/** What scripts/tts.mjs writes next to the audio files. */
interface Manifest {
  voice: string;
  items: Record<string, { chapter: string; section: string; title: string; hash: string; files: string[]; chars: number }>;
}

// vite is configured with base './', so the audio is addressed relative to the page
const BASE = 'audio/course/';

/**
 * The manifest is fetched once per session and shared by every section. A course with no audio
 * generated yet simply has no manifest, and every section quietly renders nothing — the narration
 * is an addition to the page, never a requirement for it.
 */
let cache: Promise<Manifest | null> | null = null;
const load = (): Promise<Manifest | null> => {
  cache ??= fetch(`${BASE}manifest.json`)
    .then((r) => (r.ok ? (r.json() as Promise<Manifest>) : null))
    .catch(() => null);
  return cache;
};

export const useNarration = (): Manifest | null => {
  const [m, setM] = useState<Manifest | null>(null);
  useEffect(() => { let live = true; load().then((v) => { if (live) setM(v); }); return () => { live = false; }; }, []);
  return m;
};

/**
 * Play one section's narration. A long section is generated as several files; they are played back
 * to back so the reader hears one continuous reading, and the progress text says which part of how
 * many, because a gap between files should not look like the audio has stopped.
 */
export const Narration: React.FC<{ manifest: Manifest | null; chapter: string; section: string }> = ({ manifest, chapter, section }) => {
  const item = manifest?.items[`${chapter}-${section}`];
  const audio = useRef<HTMLAudioElement | null>(null);
  const [part, setPart] = useState<number | null>(null);

  // Leaving the section, or the chapter, must stop the sound: nothing is more confusing than a
  // voice still reading a page that is no longer on screen.
  useEffect(() => () => { audio.current?.pause(); audio.current = null; }, []);
  useEffect(() => { audio.current?.pause(); audio.current = null; setPart(null); }, [chapter, section]);

  if (!item) return null;

  const playFrom = (i: number) => {
    audio.current?.pause();
    if (i >= item.files.length) { audio.current = null; setPart(null); return; }
    const el = new Audio(BASE + item.files[i]);
    el.onended = () => playFrom(i + 1);
    el.onerror = () => { audio.current = null; setPart(null); };
    audio.current = el;
    setPart(i);
    void el.play().catch(() => { audio.current = null; setPart(null); });
  };

  const playing = part !== null;
  return (
    <div className="narration">
      <button
        className={`btn small narrate ${playing ? 'on' : ''}`}
        onClick={() => (playing ? (audio.current?.pause(), (audio.current = null), setPart(null)) : playFrom(0))}
        title={playing ? 'หยุดอ่าน' : 'ฟังเสียงอ่านหัวข้อนี้'}
      >
        {playing ? '⏸ หยุดอ่าน' : '🔊 ฟังเสียงอ่าน'}
      </button>
      {playing && item.files.length > 1 && (
        <span className="narrate-part">ตอนที่ {(part ?? 0) + 1} / {item.files.length}</span>
      )}
    </div>
  );
};
