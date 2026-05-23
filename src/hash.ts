import { clamp } from "./audio";
import { CRY_STYLES, VOICES } from "./data";

export type HashState = {
  voiceIdx?: number;
  styleIdx?: number;
  morph?: number;
  curveStart?: number;
  curvePeak?: number;
  curveEnd?: number;
  ps?: number;
  dm?: number;
  vib?: number;
  vm?: number;
};

export type FullHashState = Required<HashState>;

const numFromHash = (
  params: URLSearchParams,
  key: string,
  fallback: number | undefined,
  min: number,
  max: number,
) => {
  if (!params.has(key)) return fallback;
  const raw = Number(params.get(key));
  if (!Number.isFinite(raw)) return fallback;
  return clamp(raw, min, max);
};

export const parseHashState = (): HashState => {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const voiceId = params.get("voice");
  const styleId = params.get("style");
  const voiceIndex = VOICES.findIndex((voice) => voice.id === voiceId);
  const styleIndex = CRY_STYLES.findIndex((style) => style.id === styleId);
  return {
    voiceIdx: voiceIndex >= 0 ? voiceIndex : undefined,
    styleIdx: styleIndex >= 0 ? styleIndex : undefined,
    morph: numFromHash(params, "morph", undefined, 0, 1),
    curveStart: numFromHash(params, "curveStart", undefined, -12, 12),
    curvePeak: numFromHash(params, "curvePeak", undefined, -12, 12),
    curveEnd: numFromHash(params, "curveEnd", undefined, -12, 12),
    ps: numFromHash(params, "pitch", undefined, -12, 12),
    dm: numFromHash(params, "duration", undefined, 0.3, 2.5),
    vib: numFromHash(params, "vibrato", undefined, 0, 3),
    vm: numFromHash(params, "volume", undefined, 0.1, 1),
  };
};

export const makeHash = (state: FullHashState) => {
  const params = new URLSearchParams();
  params.set("voice", VOICES[state.voiceIdx].id);
  params.set("style", CRY_STYLES[state.styleIdx].id);
  params.set("morph", state.morph.toFixed(2));
  params.set("curveStart", String(state.curveStart));
  params.set("curvePeak", String(state.curvePeak));
  params.set("curveEnd", String(state.curveEnd));
  params.set("pitch", String(state.ps));
  params.set("duration", state.dm.toFixed(2));
  params.set("vibrato", state.vib.toFixed(2));
  params.set("volume", state.vm.toFixed(2));
  return `#${params.toString()}`;
};
