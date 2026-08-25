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
  flat?: number;
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

export const parseHashPatch = (patch: string): HashState => {
  const params = new URLSearchParams(patch.replace(/^#/, ""));
  const voiceId = params.get("voice");
  const styleId = params.get("style");
  const voiceIndex = VOICES.findIndex((voice) => voice.id === voiceId);
  const styleIndex = CRY_STYLES.findIndex((style) => style.id === styleId);
  const state: HashState = {};
  const setNumber = (key: keyof HashState, value: number | undefined) => {
    if (value !== undefined) state[key] = value;
  };

  if (voiceIndex >= 0) state.voiceIdx = voiceIndex;
  if (styleIndex >= 0) state.styleIdx = styleIndex;
  setNumber("morph", numFromHash(params, "morph", undefined, 0, 1));
  setNumber("curveStart", numFromHash(params, "curveStart", undefined, -12, 12));
  setNumber("curvePeak", numFromHash(params, "curvePeak", undefined, -12, 12));
  setNumber("curveEnd", numFromHash(params, "curveEnd", undefined, -12, 12));
  setNumber("ps", numFromHash(params, "pitch", undefined, -12, 12));
  setNumber("dm", numFromHash(params, "duration", undefined, 0.3, 2.5));
  setNumber("vib", numFromHash(params, "vibrato", undefined, 0, 3));
  setNumber("vm", numFromHash(params, "volume", undefined, 0.1, 1));
  setNumber("flat", numFromHash(params, "flat", undefined, 0, 1));
  return state;
};

export const parseHashState = (): HashState => {
  if (typeof window === "undefined") return {};
  return parseHashPatch(window.location.hash);
};

export const makeHashQuery = (state: FullHashState) => {
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
  params.set("flat", state.flat.toFixed(2));
  return params.toString();
};

export const makeHash = (state: FullHashState) => `#${makeHashQuery(state)}`;
