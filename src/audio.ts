import type { CryStyle, Voice } from "./data";

export type SynthParams = {
  s: number;
  pk: number;
  e: number;
  dur: number;
  fFreq: number;
  fQ: number;
  vR: number;
  vD: number;
  vol: number;
  wave: OscillatorType;
  atk: number;
  rel: number;
  pitchMove: number;
  breath: number;
};

export type MorphTone = {
  voice: number;
  consonant: number;
  mouth: number;
  wobble: number;
  rough: number;
};

export type PlayMeowOptions = {
  ps?: number;
  dm?: number;
  vib?: number;
  vm?: number;
  morph?: number;
  curveStart?: number;
  curvePeak?: number;
  curveEnd?: number;
};

export const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

export const parseNumberInput = (
  value: string,
  fallback: number,
  min: number,
  max: number,
) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return clamp(parsed, min, max);
};

export const composeParams = (voice: Voice, style: CryStyle): SynthParams => ({
  s: voice.s * style.sMul,
  pk: voice.pk * style.pkMul,
  e: voice.e * style.eMul,
  dur: style.dur * voice.durMul,
  fFreq: voice.fFreq * style.fMul,
  fQ: Math.max(1, voice.fQ + style.fQAdd),
  vR: style.vR,
  vD: style.vD + voice.vDAdd,
  vol: voice.vol * style.volMul,
  wave: style.wave || voice.wave,
  atk: style.atk * voice.atkMul,
  rel: style.rel * voice.relMul,
  pitchMove: voice.pitchMove ?? 1,
  breath: voice.breath ?? 1,
});

export const morphTone = (morph: number): MorphTone => {
  const m = clamp(morph, 0, 1);
  const emphasis = Math.max(0, (m - 0.5) * 2);
  return {
    voice: m,
    consonant: m * (0.75 + emphasis * 0.25),
    mouth: m * (0.7 + emphasis * 0.3),
    wobble: m * (0.55 + emphasis * 0.3),
    rough: m * (0.28 + emphasis * 0.17),
  };
};

export const morphLabel = (morph: number) => {
  if (morph < 0.25) return "ピコ猫";
  if (morph < 0.75) return "にゃーん";
  return "超にゃーん";
};

const semitoneRatio = (semitone: number) => Math.pow(2, semitone / 12);

export function playMeow(
  ctx: AudioContext,
  dest: AudioNode,
  params: SynthParams,
  semitone = 0,
  opts: PlayMeowOptions = {},
) {
  const {
    s,
    pk,
    e,
    dur,
    fFreq,
    fQ,
    vR,
    vD,
    vol,
    wave,
    atk,
    rel,
    pitchMove,
    breath,
  } = params;
  const pm = clamp(pitchMove ?? 1, 0, 1);
  const br = clamp(breath ?? 1, 0, 1);
  // pf を基準に、自動ピッチ移動の振れ幅を pm で縮めるにゃ (pm=1 で従来どおり)
  const toward = (target: number, base: number) =>
    pm >= 1 ? target : base + (target - base) * pm;
  const hasBreath = br > 0.001;
  const tone = morphTone(opts.morph || 0);
  const isVoice = tone.voice > 0.001;
  const tr = Math.pow(2, (semitone + (opts.ps || 0)) / 12);
  const aDur = dur * (opts.dm || 1);
  const v = vol * (opts.vm || 0.8);
  const vibD = vD * (opts.vib || 1) * tr;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const osc3 = ctx.createOscillator();
  const g2 = ctx.createGain();
  const g3 = ctx.createGain();
  const filt = ctx.createBiquadFilter();
  const filt2 = ctx.createBiquadFilter();
  const formMix = ctx.createGain();
  const lfo = ctx.createOscillator();
  const lfoG = ctx.createGain();
  const env = ctx.createGain();

  osc.type = wave;
  osc2.type = wave;
  osc3.type = "sawtooth";
  osc2.detune.value = 7;
  osc3.detune.value = -13;
  g2.gain.value = 0.3;
  g3.gain.value = isVoice ? tone.rough * 0.18 * br : 0;

  filt.type = "bandpass";
  filt.frequency.value = fFreq;
  filt.Q.value = fQ * (1 - tone.mouth * 0.25);

  filt2.type = "bandpass";
  filt2.frequency.value = fFreq * 2.15;
  filt2.Q.value = 1 + tone.mouth * 8;
  formMix.gain.value = tone.mouth * 0.34;

  lfo.type = "sine";
  lfo.frequency.value = vR + tone.wobble * 3;
  lfoG.gain.setValueAtTime(isVoice ? vibD * 0.25 : vibD, now);
  if (isVoice) {
    lfoG.gain.linearRampToValueAtTime(
      vibD + (4 + tone.wobble * 12) * tr * pm,
      now + aDur * 0.68,
    );
  }

  lfo.connect(lfoG);
  lfoG.connect(osc.frequency);
  lfoG.connect(osc2.frequency);
  lfoG.connect(osc3.frequency);
  osc.connect(filt);
  osc2.connect(g2);
  osc3.connect(g3);
  g2.connect(filt);
  g3.connect(filt);
  if (isVoice) {
    osc.connect(filt2);
    g2.connect(filt2);
    g3.connect(filt2);
    filt2.connect(formMix);
    formMix.connect(env);
  }
  filt.connect(env);
  env.connect(dest);

  const pf = pk * tr * semitoneRatio(opts.curvePeak || 0);
  const sf = toward(s * tr * semitoneRatio(opts.curveStart || 0), pf);
  const ef = Math.max(
    toward(e * tr * semitoneRatio(opts.curveEnd || 0), pf),
    20,
  );
  const hasStartCurve = Math.abs(opts.curveStart || 0) > 0.001;
  const startHold = aDur * (isVoice ? 0.14 : 0.1);
  const peakTime = aDur * (isVoice ? (hasStartCurve ? 0.3 : 0.12) : 0.3);
  [osc, osc2, osc3].forEach((o) => {
    o.frequency.setValueAtTime(sf, now);
    if (hasStartCurve) {
      o.frequency.linearRampToValueAtTime(sf, now + startHold);
    }
    o.frequency.linearRampToValueAtTime(pf, now + peakTime);
    if (isVoice) {
      const flutter = 1 + (Math.random() * 0.035 - 0.0175) * tone.wobble * pm;
      o.frequency.linearRampToValueAtTime(
        toward(pf * (0.74 + tone.wobble * 0.08), pf) * flutter,
        now + aDur * 0.24,
      );
      o.frequency.linearRampToValueAtTime(
        toward(pf * (1.0 + tone.wobble * 0.08), pf),
        now + aDur * 0.34,
      );
    }
    o.frequency.linearRampToValueAtTime(ef, now + aDur);
  });

  if (isVoice) {
    filt.frequency.setValueAtTime(
      Math.max(fFreq * (0.95 + tone.mouth * 0.2), 420),
      now,
    );
    filt.frequency.linearRampToValueAtTime(
      fFreq * (1.1 + tone.mouth * 0.9),
      now + aDur * 0.18,
    );
    filt.frequency.linearRampToValueAtTime(
      fFreq * (1.0 + tone.mouth * 0.22),
      now + aDur,
    );
    filt2.frequency.setValueAtTime(fFreq * (1.75 + tone.mouth * 0.55), now);
    filt2.frequency.linearRampToValueAtTime(
      fFreq * (2.1 + tone.mouth * 1.25),
      now + aDur * 0.22,
    );
    filt2.frequency.linearRampToValueAtTime(
      fFreq * (1.8 + tone.mouth * 0.75),
      now + aDur,
    );

    if (hasBreath) {
      const noiseLen = Math.max(
        1,
        Math.floor(
          ctx.sampleRate * Math.min(0.03 + tone.consonant * 0.08, aDur * 0.24),
        ),
      );
      const noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < noiseLen; i += 1) {
        const decay = 1 - i / noiseLen;
        data[i] = (Math.random() * 2 - 1) * decay * decay;
      }
      const noise = ctx.createBufferSource();
      const noiseFilt = ctx.createBiquadFilter();
      const noiseEnv = ctx.createGain();
      const chirp = ctx.createOscillator();
      const chirpGain = ctx.createGain();
      noise.buffer = noiseBuf;
      noiseFilt.type = "highpass";
      noiseFilt.frequency.value = (950 + tone.consonant * 1800) * tr;
      noiseFilt.Q.value = 0.7 + tone.consonant * 2.5;
      noiseEnv.gain.setValueAtTime(v * tone.consonant * 0.38 * br, now);
      noiseEnv.gain.exponentialRampToValueAtTime(
        0.001,
        now + noiseLen / ctx.sampleRate,
      );
      noise.connect(noiseFilt);
      noiseFilt.connect(noiseEnv);
      noiseEnv.connect(dest);

      chirp.type = "triangle";
      chirp.frequency.setValueAtTime(
        pk * (1.0 + tone.consonant * 0.9) * tr,
        now,
      );
      chirp.frequency.exponentialRampToValueAtTime(
        Math.max(e * (0.95 + tone.consonant * 0.35) * tr, 60),
        now + Math.min(aDur * 0.25, 0.18),
      );
      chirpGain.gain.setValueAtTime(v * tone.consonant * 0.13 * br, now);
      chirpGain.gain.exponentialRampToValueAtTime(
        0.001,
        now + Math.min(aDur * 0.3, 0.22),
      );
      chirp.connect(chirpGain);
      chirpGain.connect(dest);

      noise.start(now);
      noise.stop(now + noiseLen / ctx.sampleRate + 0.02);
      chirp.start(now);
      chirp.stop(now + Math.min(aDur * 0.4, 0.24));
    }
  }

  env.gain.setValueAtTime(0.001, now);
  env.gain.linearRampToValueAtTime(v, now + atk);
  env.gain.setValueAtTime(v, now + aDur - rel);
  env.gain.linearRampToValueAtTime(0.001, now + aDur);

  [osc, osc2, osc3, lfo].forEach((o) => {
    o.start(now);
    o.stop(now + aDur + 0.1);
  });
  return aDur;
}
