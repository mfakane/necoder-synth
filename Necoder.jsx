import React, { useCallback, useEffect, useRef, useState } from "react";

React.version.toString();

// ─────────────────────────────────────────────
//  音色と鳴き方定義にゃ🐾
//  s=startFreq, pk=peakFreq, e=endFreq (Hz)
//  dur=秒, fFreq=フォルマントフィルタ, fQ=Q値
//  vR=ビブラートレート, vD=ビブラート深さ
//  vol=音量, wave=波形タイプ, atk=アタック, rel=リリース
// ─────────────────────────────────────────────
const VOICES = [
  {
    id: "white",
    name: "白猫",
    emoji: "🤍",
    color: "#5CC8FF",
    s: 500,
    pk: 980,
    e: 610,
    fFreq: 1650,
    fQ: 7,
    vol: 0.48,
    wave: "sawtooth",
    durMul: 0.9,
    atkMul: 0.85,
    relMul: 0.8,
    vDAdd: 2,
  },
  {
    id: "orange",
    name: "茶トラ",
    emoji: "🧡",
    color: "#FF9F43",
    s: 380,
    pk: 760,
    e: 460,
    fFreq: 1200,
    fQ: 6,
    vol: 0.55,
    wave: "sawtooth",
    durMul: 1,
    atkMul: 1,
    relMul: 1,
    vDAdd: 0,
  },
  {
    id: "brown",
    name: "キジトラ",
    emoji: "🤎",
    color: "#00B894",
    s: 440,
    pk: 860,
    e: 420,
    fFreq: 1420,
    fQ: 9,
    vol: 0.6,
    wave: "square",
    durMul: 0.95,
    atkMul: 0.75,
    relMul: 0.85,
    vDAdd: 4,
  },
  {
    id: "black",
    name: "黒猫",
    emoji: "🖤",
    color: "#9B8EC4",
    s: 290,
    pk: 560,
    e: 290,
    fFreq: 900,
    fQ: 5,
    vol: 0.5,
    wave: "sawtooth",
    durMul: 1.18,
    atkMul: 1.25,
    relMul: 1.45,
    vDAdd: 7,
  },
];

const CRY_STYLES = [
  {
    id: "nyaan",
    name: "にゃーん",
    mark: "😸",
    sMul: 1,
    pkMul: 1,
    eMul: 1,
    dur: 0.65,
    atk: 0.06,
    rel: 0.15,
    vR: 4,
    vD: 0,
    volMul: 1,
    fMul: 1,
    fQAdd: 0,
  },
  {
    id: "nyat",
    name: "にゃっ",
    mark: "🐱",
    sMul: 1.42,
    pkMul: 1.26,
    eMul: 0.94,
    dur: 0.16,
    atk: 0.012,
    rel: 0.04,
    vR: 5,
    vD: 0,
    volMul: 1.18,
    fMul: 1.15,
    fQAdd: 2,
    wave: "square",
  },
  {
    id: "myau",
    name: "みゃう",
    mark: "😺",
    sMul: 1.22,
    pkMul: 1.55,
    eMul: 1.14,
    dur: 0.42,
    atk: 0.028,
    rel: 0.09,
    vR: 5.8,
    vD: 8,
    volMul: 1.06,
    fMul: 1.28,
    fQAdd: 1,
  },
  {
    id: "naao",
    name: "なーお",
    mark: "🙀",
    sMul: 0.92,
    pkMul: 0.9,
    eMul: 0.58,
    dur: 1.35,
    atk: 0.09,
    rel: 0.34,
    vR: 3.5,
    vD: 18,
    volMul: 0.95,
    fMul: 0.9,
    fQAdd: -1,
  },
];

const KEYS = [
  { note: "ド", key: "a", st: 0 },
  { note: "レ", key: "s", st: 2 },
  { note: "ミ", key: "d", st: 4 },
  { note: "ファ", key: "f", st: 5 },
  { note: "ソ", key: "g", st: 7 },
  { note: "ラ", key: "h", st: 9 },
  { note: "シ", key: "j", st: 11 },
  { note: "ド↑", key: "k", st: 12 },
];

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

const numFromHash = (params, key, fallback, min, max) => {
  if (!params.has(key)) return fallback;
  const raw = Number(params.get(key));
  if (!Number.isFinite(raw)) return fallback;
  return clamp(raw, min, max);
};

const parseNumberInput = (value, fallback, min, max) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return clamp(parsed, min, max);
};

const composeParams = (voice, style) => ({
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
});

const getHashState = () => {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const voiceId = params.get("voice");
  const styleId = params.get("style");
  const voiceIndex = VOICES.findIndex((v) => v.id === voiceId);
  const styleIndex = CRY_STYLES.findIndex((s) => s.id === styleId);
  return {
    voiceIdx: voiceIndex >= 0 ? voiceIndex : undefined,
    styleIdx: styleIndex >= 0 ? styleIndex : undefined,
    morph: numFromHash(params, "morph", undefined, 0, 1),
    ps: numFromHash(params, "pitch", undefined, -12, 12),
    dm: numFromHash(params, "duration", undefined, 0.3, 2.5),
    vib: numFromHash(params, "vibrato", undefined, 0, 3),
    vm: numFromHash(params, "volume", undefined, 0.1, 1),
  };
};

const morphTone = (morph) => {
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

const morphLabel = (morph) => {
  if (morph < 0.25) return "ピコ猫";
  if (morph < 0.75) return "にゃーん";
  return "超にゃーん";
};

// ─────────────────────────────────────────────
//  猫声合成エンジンにゃ🎛️
// ─────────────────────────────────────────────
function playMeow(ctx, dest, params, semitone = 0, opts = {}) {
  const { s, pk, e, dur, fFreq, fQ, vR, vD, vol, wave, atk, rel } = params;
  const tone = morphTone(opts.morph || 0);
  const isVoice = tone.voice > 0.001;
  const tr = Math.pow(2, (semitone + (opts.ps || 0)) / 12);
  const aDur = dur * (opts.dm || 1);
  const v = vol * (opts.vm || 0.8);
  const vibD = vD * (opts.vib || 1) * tr;
  const now = ctx.currentTime;

  // ノード生成にゃ
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
  osc2.detune.value = 7; // コーラス感
  osc3.detune.value = -13;
  g2.gain.value = 0.3;
  g3.gain.value = isVoice ? tone.rough * 0.18 : 0;

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
    lfoG.gain.linearRampToValueAtTime(vibD + (4 + tone.wobble * 12) * tr, now + aDur * 0.68);
  }

  // 接続にゃ
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

  // 周波数スイープにゃ～ (猫っぽい抑揚)
  const sf = s * tr;
  const pf = pk * tr;
  const ef = Math.max(e * tr, 20);
  [osc, osc2, osc3].forEach((o) => {
    o.frequency.setValueAtTime(sf, now);
    o.frequency.linearRampToValueAtTime(pf, now + aDur * (isVoice ? 0.12 : 0.3));
    if (isVoice) {
      const flutter = 1 + (Math.random() * 0.035 - 0.0175) * tone.wobble;
      o.frequency.linearRampToValueAtTime(pf * (0.74 + tone.wobble * 0.08) * flutter, now + aDur * 0.24);
      o.frequency.linearRampToValueAtTime(pf * (1.0 + tone.wobble * 0.08), now + aDur * 0.34);
    }
    o.frequency.linearRampToValueAtTime(ef, now + aDur);
  });

  if (isVoice) {
    filt.frequency.setValueAtTime(Math.max(fFreq * (0.95 + tone.mouth * 0.2), 420), now);
    filt.frequency.linearRampToValueAtTime(fFreq * (1.1 + tone.mouth * 0.9), now + aDur * 0.18);
    filt.frequency.linearRampToValueAtTime(fFreq * (1.0 + tone.mouth * 0.22), now + aDur);
    filt2.frequency.setValueAtTime(fFreq * (1.75 + tone.mouth * 0.55), now);
    filt2.frequency.linearRampToValueAtTime(fFreq * (2.1 + tone.mouth * 1.25), now + aDur * 0.22);
    filt2.frequency.linearRampToValueAtTime(fFreq * (1.8 + tone.mouth * 0.75), now + aDur);

    const noiseLen = Math.max(
      1,
      Math.floor(ctx.sampleRate * Math.min(0.03 + tone.consonant * 0.08, aDur * 0.24)),
    );
    const noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < noiseLen; i++) {
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
    noiseEnv.gain.setValueAtTime(v * tone.consonant * 0.38, now);
    noiseEnv.gain.exponentialRampToValueAtTime(0.001, now + noiseLen / ctx.sampleRate);
    noise.connect(noiseFilt);
    noiseFilt.connect(noiseEnv);
    noiseEnv.connect(dest);

    chirp.type = "triangle";
    chirp.frequency.setValueAtTime(pk * (1.0 + tone.consonant * 0.9) * tr, now);
    chirp.frequency.exponentialRampToValueAtTime(
      Math.max(e * (0.95 + tone.consonant * 0.35) * tr, 60),
      now + Math.min(aDur * 0.25, 0.18),
    );
    chirpGain.gain.setValueAtTime(v * tone.consonant * 0.13, now);
    chirpGain.gain.exponentialRampToValueAtTime(0.001, now + Math.min(aDur * 0.3, 0.22));
    chirp.connect(chirpGain);
    chirpGain.connect(dest);

    noise.start(now);
    noise.stop(now + noiseLen / ctx.sampleRate + 0.02);
    chirp.start(now);
    chirp.stop(now + Math.min(aDur * 0.4, 0.24));
  }

  // エンベロープにゃ
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

// ─────────────────────────────────────────────
//  ネコーダーUIにゃ🐱
// ─────────────────────────────────────────────
export default function Necoder() {
  const initialHash = useRef(null);
  if (!initialHash.current) initialHash.current = getHashState();
  const init = initialHash.current;

  const [voiceIdx, setVoiceIdx] = useState(init.voiceIdx ?? 1);
  const [styleIdx, setStyleIdx] = useState(init.styleIdx ?? 0);
  const [morph, setMorph] = useState(init.morph ?? 0.5);
  const [ps, setPs] = useState(init.ps ?? 0); // ピッチシフト (半音)
  const [dm, setDm] = useState(init.dm ?? 1.0); // デュレーション倍率
  const [vib, setVib] = useState(init.vib ?? 1.0); // ビブラート倍率
  const [vm, setVm] = useState(init.vm ?? 0.8); // 音量倍率
  const [activeKey, setAK] = useState(null);
  const [isPlay, setIP] = useState(false);
  const [dispTxt, setDT] = useState("🐱  ネコーダーにゃ～");
  const [draftNums, setDraftNums] = useState({});

  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const colorRef = useRef(VOICES[1].color);
  const timerRef = useRef(null);

  const voice = VOICES[voiceIdx];
  const cryStyle = CRY_STYLES[styleIdx];

  const makeHash = useCallback(
    (next = {}) => {
      const state = {
        voiceIdx,
        styleIdx,
        morph,
        ps,
        dm,
        vib,
        vm,
        ...next,
      };
      const params = new URLSearchParams();
      params.set("voice", VOICES[state.voiceIdx].id);
      params.set("style", CRY_STYLES[state.styleIdx].id);
      params.set("morph", state.morph.toFixed(2));
      params.set("pitch", String(state.ps));
      params.set("duration", state.dm.toFixed(2));
      params.set("vibrato", state.vib.toFixed(2));
      params.set("volume", state.vm.toFixed(2));
      return `#${params.toString()}`;
    },
    [voiceIdx, styleIdx, morph, ps, dm, vib, vm],
  );

  const commitHash = useCallback(
    (next = {}) => {
      const nextHash = makeHash(next);
      if (window.location.hash !== nextHash) {
        window.history.replaceState(
          null,
          "",
          `${window.location.pathname}${window.location.search}${nextHash}`,
        );
      }
    },
    [makeHash],
  );

  const setDraftNum = useCallback((keyName, value) => {
    setDraftNums((drafts) => ({ ...drafts, [keyName]: value }));
  }, []);

  const clearDraftNum = useCallback((keyName) => {
    setDraftNums((drafts) => {
      if (!(keyName in drafts)) return drafts;
      const next = { ...drafts };
      delete next[keyName];
      return next;
    });
  }, []);

  const commitNumericValue = useCallback(
    (keyName, rawValue, config) => {
      const inputValue = parseNumberInput(
        rawValue,
        config.toInput(config.val),
        config.inputMin,
        config.inputMax,
      );
      const value = config.fromInput(inputValue);
      config.set(value);
      commitHash({ [keyName]: value });
      clearDraftNum(keyName);
    },
    [clearDraftNum, commitHash],
  );

  const commitMorphInput = useCallback(
    (rawValue) => {
      const input = parseNumberInput(rawValue, Math.round(morph * 100), 0, 100);
      const value = Number((input / 100).toFixed(2));
      setMorph(value);
      commitHash({ morph: value });
      clearDraftNum("morph");
    },
    [clearDraftNum, commitHash, morph],
  );

  // hashを手で貼り替えたときも復元するにゃ
  useEffect(() => {
    const applyHash = () => {
      const next = getHashState();
      if (next.voiceIdx !== undefined) setVoiceIdx(next.voiceIdx);
      if (next.styleIdx !== undefined) setStyleIdx(next.styleIdx);
      if (next.morph !== undefined) setMorph(next.morph);
      if (next.ps !== undefined) setPs(next.ps);
      if (next.dm !== undefined) setDm(next.dm);
      if (next.vib !== undefined) setVib(next.vib);
      if (next.vm !== undefined) setVm(next.vm);
    };
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  // 音色変更でカラー更新にゃ
  useEffect(() => {
    colorRef.current = VOICES[voiceIdx].color;
  }, [voiceIdx]);

  // AudioContext 遅延初期化にゃ (Autoplay Policy対策)
  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const an = ctx.createAnalyser();
      an.fftSize = 512;
      an.smoothingTimeConstant = 0.8;
      an.connect(ctx.destination);
      audioRef.current = { ctx, an };
    }
    if (audioRef.current.ctx.state === "suspended")
      audioRef.current.ctx.resume();
    return audioRef.current;
  }, []);

  // 鳴らすにゃ！
  const trigger = useCallback(
    (st = 0) => {
      const { ctx, an } = getAudio();
      const v = VOICES[voiceIdx];
      const style = CRY_STYLES[styleIdx];
      const dur = playMeow(ctx, an, composeParams(v, style), st, {
        ps,
        dm,
        vib,
        vm,
        morph,
      });
      if (timerRef.current) clearTimeout(timerRef.current);
      setIP(true);
      setDT(`${style.mark}  ${v.name} ${style.name}`);
      timerRef.current = setTimeout(() => {
        setIP(false);
        setDT(`🐱  ネコーダー ${morphLabel(morph)}`);
      }, dur * 1000);
    },
    [voiceIdx, styleIdx, ps, dm, vib, vm, morph, getAudio],
  );

  // オシロスコープ描画にゃ🎨
  useEffect(() => {
    const draw = () => {
      animRef.current = requestAnimationFrame(draw);
      const cv = canvasRef.current;
      if (!cv) return;
      const c = cv.getContext("2d");
      const W = cv.width,
        H = cv.height;

      c.fillStyle = "#10162A";
      c.fillRect(0, 0, W, H);

      // グリッド線にゃ
      c.strokeStyle = "#273151";
      c.lineWidth = 1;
      for (let i = 1; i < 4; i++) {
        c.beginPath();
        c.moveTo(0, (H / 4) * i);
        c.lineTo(W, (H / 4) * i);
        c.stroke();
      }
      for (let i = 1; i < 8; i++) {
        c.beginPath();
        c.moveTo((W / 8) * i, 0);
        c.lineTo((W / 8) * i, H);
        c.stroke();
      }

      if (!audioRef.current) {
        // サイレント時は中心線にゃ
        c.strokeStyle = "#53607F";
        c.lineWidth = 1.5;
        c.beginPath();
        c.moveTo(0, H / 2);
        c.lineTo(W, H / 2);
        c.stroke();
        return;
      }

      const { an } = audioRef.current;
      const buf = new Uint8Array(an.frequencyBinCount);
      an.getByteTimeDomainData(buf);
      const col = colorRef.current;

      // グロー波形にゃ✨
      c.strokeStyle = col + "44";
      c.lineWidth = 6;
      c.shadowBlur = 0;
      c.beginPath();
      buf.forEach((v, i) => {
        const x = (i / buf.length) * W;
        const y = (v / 255) * H;
        i === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
      });
      c.stroke();

      c.strokeStyle = col;
      c.lineWidth = 2;
      c.shadowBlur = 10;
      c.shadowColor = col;
      c.beginPath();
      buf.forEach((v, i) => {
        const x = (i / buf.length) * W;
        const y = (v / 255) * H;
        i === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
      });
      c.stroke();
      c.shadowBlur = 0;
    };

    draw();
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  // キーボードイベントにゃ
  useEffect(() => {
    const dn = (e) => {
      if (e.repeat) return;
      const k = KEYS.find((k) => k.key === e.key.toLowerCase());
      if (k) {
        setAK(k.key);
        trigger(k.st);
      }
    };
    const up = (e) => {
      const k = KEYS.find((k) => k.key === e.key.toLowerCase());
      if (k) setAK(null);
    };
    window.addEventListener("keydown", dn);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", dn);
      window.removeEventListener("keyup", up);
    };
  }, [trigger]);

  // フォント読み込みにゃ
  useEffect(() => {
    if (!document.getElementById("necoder-fonts")) {
      const lk = document.createElement("link");
      lk.id = "necoder-fonts";
      lk.rel = "stylesheet";
      lk.href =
        "https://fonts.googleapis.com/css2?family=Nunito:wght@700;800;900&family=Share+Tech+Mono&display=swap";
      document.head.appendChild(lk);
    }
    // パルスアニメーションにゃ
    if (!document.getElementById("necoder-css")) {
      const st = document.createElement("style");
      st.id = "necoder-css";
      st.textContent = `
        @keyframes nekoPulse {
          0%,100% { box-shadow: 0 0 18px var(--nc,#FF6B9D)33; }
          50%      { box-shadow: 0 0 32px var(--nc,#FF6B9D)66; }
        }
        @keyframes nekoShake {
          0%,100% { transform: translateX(0); }
          25%     { transform: translateX(-2px) rotate(-1deg); }
          75%     { transform: translateX(2px) rotate(1deg); }
        }
        .neko-pulse { animation: nekoPulse 2s ease-in-out infinite; }
        .neko-shake { animation: nekoShake 0.12s ease-in-out 3; }
        input[type=range] { -webkit-appearance:none; appearance:none; height:3px; border-radius:2px; outline:none; cursor:pointer; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:14px; height:14px; border-radius:50%; cursor:pointer; }
        .necoder-number {
          background: transparent;
          border-color: transparent;
          transition: background .12s, border-color .12s;
        }
        .necoder-number:hover,
        .necoder-number:focus {
          background: #FFFFFF;
          border-color: #CBD6E8;
        }
      `;
      document.head.appendChild(st);
    }
  }, []);

  const sliders = [
    {
      label: "PITCH",
      jp: "ピッチ",
      keyName: "ps",
      val: ps,
      min: -12,
      max: 12,
      step: 1,
      set: setPs,
      fmt: (v) => (v > 0 ? "+" : "") + v,
      toInput: (v) => v,
      fromInput: (v) => Math.round(v),
      inputMin: -12,
      inputMax: 12,
      inputStep: 1,
      unit: "st",
    },
    {
      label: "DURATION",
      jp: "デュレーション",
      keyName: "dm",
      val: dm,
      min: 0.3,
      max: 2.5,
      step: 0.1,
      set: setDm,
      fmt: (v) => v.toFixed(1),
      toInput: (v) => Number(v.toFixed(1)),
      fromInput: (v) => Number(v.toFixed(1)),
      inputMin: 0.3,
      inputMax: 2.5,
      inputStep: 0.1,
      unit: "x",
    },
    {
      label: "VIBRATO",
      jp: "ビブラート",
      keyName: "vib",
      val: vib,
      min: 0,
      max: 3,
      step: 0.1,
      set: setVib,
      fmt: (v) => v.toFixed(1),
      toInput: (v) => Number(v.toFixed(1)),
      fromInput: (v) => Number(v.toFixed(1)),
      inputMin: 0,
      inputMax: 3,
      inputStep: 0.1,
      unit: "x",
    },
    {
      label: "VOLUME",
      jp: "ボリューム",
      keyName: "vm",
      val: vm,
      min: 0.1,
      max: 1,
      step: 0.05,
      set: setVm,
      fmt: (v) => Math.round(v * 100),
      toInput: (v) => Math.round(v * 100),
      fromInput: (v) => Number((v / 100).toFixed(2)),
      inputMin: 10,
      inputMax: 100,
      inputStep: 5,
      unit: "%",
    },
  ];

  const col = voice.color;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg,#F7FAFF,#E8EEF8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "12px",
        fontFamily: "'Nunito', sans-serif",
      }}
    >
      {/* ───── シンセ本体にゃ ───── */}
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          background: "#FFFFFF",
          borderRadius: "22px",
          border: "1px solid #CFD8EA",
          boxShadow:
            "0 28px 80px rgba(54,68,105,.22), inset 0 1px 0 rgba(255,255,255,.9)",
          overflow: "hidden",
        }}
      >
        {/* ── ヘッダーにゃ ── */}
        <div
          style={{
            background: "linear-gradient(135deg,#FFFFFF,#EEF4FF)",
            padding: "14px 18px",
            borderBottom: "1px solid #D8E1F0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                color: col,
                fontSize: "13px",
                fontWeight: 900,
                letterSpacing: "5px",
                fontFamily: "'Share Tech Mono',monospace",
                transition: "color .2s",
              }}
            >
              NECODER
            </div>
            <div
              style={{
                color: "#66708A",
                fontSize: "9px",
                letterSpacing: "3px",
                fontFamily: "'Share Tech Mono',monospace",
                marginTop: "2px",
              }}
            >
              🐾 ネコーダー Chiptune Cat Synth v1.0
            </div>
          </div>
          <div
            style={{
              fontSize: "32px",
              lineHeight: 1,
              transition: "filter .1s, transform .1s",
              filter: isPlay ? `drop-shadow(0 0 12px ${col})` : "none",
              transform: isPlay ? "scale(1.15)" : "scale(1)",
            }}
          >
            {isPlay ? cryStyle.mark : "🎹"}
          </div>
        </div>

        {/* ── オシロスコープにゃ ── */}
        <div
          style={{
            margin: "14px 14px 0",
            background: "#10162A",
            borderRadius: "10px",
            border: "1px solid #2C3658",
            padding: "10px 12px 8px",
          }}
        >
          <div
            style={{
              fontFamily: "'Share Tech Mono',monospace",
              color: isPlay ? col : "#6f778a",
              fontSize: "12px",
              marginBottom: "6px",
              transition: "color .15s",
              letterSpacing: "1px",
            }}
          >
            {dispTxt}
          </div>
          <canvas
            ref={canvasRef}
            width={420}
            height={64}
            style={{
              width: "100%",
              height: "64px",
              borderRadius: "6px",
              display: "block",
            }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "4px",
            }}
          >
            {["1", "2", "3", "4", "5", "6", "7", "8"].map((n) => (
              <div
                key={n}
                style={{
                  color: "#6f778a",
                  fontSize: "8px",
                  fontFamily: "'Share Tech Mono',monospace",
                }}
              >
                {n}
              </div>
            ))}
          </div>
        </div>

        {/* ── 音色にゃ ── */}
        <div style={{ padding: "14px 14px 0" }}>
          <div
            style={{
              color: "#66708A",
              fontSize: "9px",
              letterSpacing: "3px",
              marginBottom: "8px",
              fontFamily: "'Share Tech Mono',monospace",
            }}
          >
            VOICE / 音色
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              gap: "7px",
            }}
          >
            {VOICES.map((v, i) => {
              const sel = voiceIdx === i;
              return (
                <button
                  key={v.id}
                  onClick={() => {
                    setVoiceIdx(i);
                    commitHash({ voiceIdx: i });
                  }}
                  style={{
                    background: sel ? v.color + "22" : "#F4F7FC",
                    border: `1px solid ${sel ? v.color : "#D9E2F0"}`,
                    borderRadius: "10px",
                    padding: "9px 5px",
                    cursor: "pointer",
                    transition: "all .13s",
                    color: sel ? v.color : "#46526A",
                    fontFamily: "'Nunito',sans-serif",
                    fontWeight: 800,
                    fontSize: "11px",
                    textAlign: "center",
                    boxShadow: sel ? `0 0 18px ${v.color}40` : "none",
                  }}
                >
                  <div style={{ fontSize: "22px", marginBottom: "3px" }}>
                    {v.emoji}
                  </div>
                  {v.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── 鳴き方にゃ ── */}
        <div style={{ padding: "12px 14px 0" }}>
          <div
            style={{
              color: "#66708A",
              fontSize: "9px",
              letterSpacing: "3px",
              marginBottom: "8px",
              fontFamily: "'Share Tech Mono',monospace",
            }}
          >
            CRY STYLE / 鳴き方
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              gap: "7px",
            }}
          >
            {CRY_STYLES.map((style, i) => {
              const sel = styleIdx === i;
              return (
                <button
                  key={style.id}
                  onClick={() => {
                    setStyleIdx(i);
                    commitHash({ styleIdx: i });
                  }}
                  style={{
                    background: sel ? col + "22" : "#F4F7FC",
                    border: `1px solid ${sel ? col : "#D9E2F0"}`,
                    borderRadius: "10px",
                    padding: "9px 5px",
                    cursor: "pointer",
                    transition: "all .13s",
                    color: sel ? col : "#46526A",
                    fontFamily: "'Nunito',sans-serif",
                    fontWeight: 800,
                    fontSize: "11px",
                    textAlign: "center",
                    boxShadow: sel ? `0 0 18px ${col}40` : "none",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'Share Tech Mono',monospace",
                      fontSize: "18px",
                      marginBottom: "3px",
                    }}
                  >
                    {style.mark}
                  </div>
                  {style.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── にゃーん度にゃ ── */}
        <div style={{ padding: "12px 14px 0" }}>
          <div
            style={{
              color: "#66708A",
              fontSize: "9px",
              letterSpacing: "3px",
              marginBottom: "8px",
              fontFamily: "'Share Tech Mono',monospace",
            }}
          >
            MEOW MORPH / モフ度
          </div>
          <div
            style={{
              background: "#EEF3FA",
              border: "1px solid #D6DFEF",
              borderRadius: "10px",
              padding: "11px 12px 9px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "8px",
              }}
            >
              <div
                style={{
                  color: "#46526A",
                  fontSize: "12px",
                  fontWeight: 900,
                }}
              >
                {morphLabel(morph)}
              </div>
              <div
                style={{
                  color: col,
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontFamily: "'Share Tech Mono',monospace",
                  fontSize: "12px",
                  fontWeight: 700,
                }}
              >
                <input
                  className="necoder-number"
                  type="text"
                  inputMode="decimal"
                  value={draftNums.morph ?? String(Math.round(morph * 100))}
                  onChange={(e) => setDraftNum("morph", e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      commitMorphInput(e.currentTarget.value);
                      e.currentTarget.blur();
                    }
                  }}
                  onBlur={(e) => commitMorphInput(e.currentTarget.value)}
                  style={{
                    width: "58px",
                    background: "transparent",
                    border: "1px solid transparent",
                    borderRadius: "6px",
                    color: col,
                    fontFamily: "'Share Tech Mono',monospace",
                    fontSize: "12px",
                    fontWeight: 700,
                    padding: "4px 5px",
                    textAlign: "right",
                    outline: "none",
                  }}
                />
                %
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={morph}
              onChange={(e) => {
                clearDraftNum("morph");
                setMorph(Number(e.target.value));
              }}
              onPointerUp={(e) =>
                commitHash({ morph: Number(e.currentTarget.value) })
              }
              onKeyUp={(e) =>
                commitHash({ morph: Number(e.currentTarget.value) })
              }
              onBlur={(e) =>
                commitHash({ morph: Number(e.currentTarget.value) })
              }
              style={{
                width: "100%",
                accentColor: col,
                background: `linear-gradient(to right, ${col} 0%, ${col} ${morph * 100}%, #D6DFEF ${morph * 100}%, #D6DFEF 100%)`,
              }}
            />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3,1fr)",
                gap: "6px",
                marginTop: "8px",
              }}
            >
              {[
                { label: "ピコ猫", value: 0 },
                { label: "にゃーん", value: 0.5 },
                { label: "超にゃーん", value: 1 },
              ].map((m) => {
                const sel = Math.abs(morph - m.value) < 0.005;
                return (
                  <button
                    key={m.label}
                    onClick={() => {
                      clearDraftNum("morph");
                      setMorph(m.value);
                      commitHash({ morph: m.value });
                      setDT(`🐱  ネコーダー ${m.label}`);
                    }}
                    style={{
                      background: sel ? col : "#FFFFFFAA",
                      border: `1px solid ${sel ? col : "#D6DFEF"}`,
                      borderRadius: "7px",
                      color: sel ? "#FFFFFF" : "#46526A",
                      cursor: "pointer",
                      padding: "7px 4px",
                      fontFamily: "'Nunito',sans-serif",
                      fontSize: "11px",
                      fontWeight: 900,
                      transition: "background .12s, color .12s",
                    }}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── デカいにゃ～んボタン ── */}
        <div style={{ padding: "12px 14px" }}>
          <button
            className={isPlay ? "neko-shake" : "neko-pulse"}
            onClick={() => trigger(0)}
            style={{
              "--nc": col,
              width: "100%",
              padding: "16px",
              borderRadius: "14px",
              cursor: "pointer",
              background: isPlay ? col : col + "18",
              border: `2px solid ${col}`,
              color: isPlay ? "#FFFFFF" : "#1D2638",
              fontFamily: "'Nunito',sans-serif",
              fontWeight: 900,
              fontSize: "20px",
              letterSpacing: "4px",
              transition: "background .08s, color .08s",
              boxShadow: isPlay ? `0 0 40px ${col}88` : undefined,
            }}
          >
            {isPlay ? `${cryStyle.mark}  ${voice.name} ${cryStyle.name}` : "🐾  にゃ～ん！"}
          </button>
        </div>

        {/* ── パラメータにゃ ── */}
        <div style={{ padding: "0 14px 14px" }}>
          <div
            style={{
              color: "#66708A",
              fontSize: "9px",
              letterSpacing: "3px",
              marginBottom: "8px",
              fontFamily: "'Share Tech Mono',monospace",
            }}
          >
            PARAMETERS / パラメータ
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
              gap: "8px",
            }}
          >
            {sliders.map(
              (slider) => (
                <div
                  key={slider.label}
                  style={{
                    background: "#F6F8FC",
                    borderRadius: "9px",
                    border: "1px solid #DCE5F2",
                    padding: "9px 11px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "6px",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          color: "#65718C",
                          fontSize: "8px",
                          letterSpacing: "2px",
                          fontFamily: "'Share Tech Mono',monospace",
                        }}
                      >
                        {slider.label}
                      </div>
                      <div
                        style={{
                          color: "#4C5870",
                          fontSize: "9px",
                          marginTop: "1px",
                        }}
                      >
                        {slider.jp}
                      </div>
                    </div>
                    <div
                      style={{
                        color: col,
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        fontFamily: "'Share Tech Mono',monospace",
                        fontSize: "12px",
                        fontWeight: 700,
                        transition: "color .2s",
                      }}
                    >
                      <input
                        className="necoder-number"
                        type="text"
                        inputMode="decimal"
                        value={
                          draftNums[slider.keyName] ??
                          String(slider.toInput(slider.val))
                        }
                        onChange={(e) =>
                          setDraftNum(slider.keyName, e.target.value)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            commitNumericValue(
                              slider.keyName,
                              e.currentTarget.value,
                              slider,
                            );
                            e.currentTarget.blur();
                          }
                        }}
                        onBlur={(e) =>
                          commitNumericValue(
                            slider.keyName,
                            e.currentTarget.value,
                            slider,
                          )
                        }
                        style={{
                          width: "58px",
                          background: "transparent",
                          border: "1px solid transparent",
                          borderRadius: "6px",
                          color: col,
                          fontFamily: "'Share Tech Mono',monospace",
                          fontSize: "12px",
                          fontWeight: 700,
                          padding: "4px 5px",
                          textAlign: "right",
                          outline: "none",
                        }}
                      />
                      {slider.unit}
                    </div>
                  </div>
                  <input
                    type="range"
                    min={slider.min}
                    max={slider.max}
                    step={slider.step}
                    value={slider.val}
                    onChange={(e) => {
                      clearDraftNum(slider.keyName);
                      slider.set(Number(e.target.value));
                    }}
                    onPointerUp={(e) =>
                      commitHash({ [slider.keyName]: Number(e.currentTarget.value) })
                    }
                    onKeyUp={(e) =>
                      commitHash({ [slider.keyName]: Number(e.currentTarget.value) })
                    }
                    onBlur={(e) =>
                      commitHash({ [slider.keyName]: Number(e.currentTarget.value) })
                    }
                    style={{
                      width: "100%",
                      accentColor: col,
                      background: `linear-gradient(to right, ${col} 0%, ${col} ${((slider.val - slider.min) / (slider.max - slider.min)) * 100}%, #D6DFEF ${((slider.val - slider.min) / (slider.max - slider.min)) * 100}%, #D6DFEF 100%)`,
                    }}
                  />
                </div>
              ),
            )}
          </div>
        </div>

        {/* ── 鍵盤にゃ🎹 ── */}
        <div style={{ padding: "0 14px 18px" }}>
          <div
            style={{
              color: "#66708A",
              fontSize: "9px",
              letterSpacing: "3px",
              marginBottom: "8px",
              fontFamily: "'Share Tech Mono',monospace",
            }}
          >
            KEYBOARD / キーボード
          </div>
          <div style={{ display: "flex", gap: "4px" }}>
            {KEYS.map((k) => {
              const act = activeKey === k.key;
              return (
                <button
                  key={k.key}
                  onMouseDown={() => {
                    setAK(k.key);
                    trigger(k.st);
                  }}
                  onMouseUp={() => setAK(null)}
                  onMouseLeave={() => setAK(null)}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    setAK(k.key);
                    trigger(k.st);
                  }}
                  onTouchEnd={() => setAK(null)}
                  style={{
                    flex: 1,
                    background: act ? col : "#F9FBFF",
                    border: `1px solid ${act ? col : "#CBD6E8"}`,
                    borderRadius: "0 0 9px 9px",
                    padding: "26px 0 7px",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: "3px",
                    transition: "all .07s",
                    boxShadow: act ? `0 0 22px ${col}77` : "none",
                  }}
                >
                  <div
                    style={{
                      color: act ? "#FFFFFF" : "#2E3A52",
                      fontSize: "9px",
                      fontWeight: 800,
                      transition: "color .07s",
                    }}
                  >
                    {k.note}
                  </div>
                  <div
                    style={{
                      color: act ? "#FFFFFFCC" : "#68748D",
                      fontSize: "8px",
                      fontFamily: "'Share Tech Mono',monospace",
                      transition: "color .07s",
                    }}
                  >
                    {k.key.toUpperCase()}
                  </div>
                </button>
              );
            })}
          </div>
          <div
            style={{
              color: "#68748D",
              fontSize: "9px",
              textAlign: "center",
              marginTop: "7px",
              fontFamily: "'Share Tech Mono',monospace",
              letterSpacing: "1px",
            }}
          >
            A S D F G H J K キーでもにゃ～ん演奏できるにゃ 🐾
          </div>
        </div>
      </div>
    </div>
  );
}
