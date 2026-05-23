import React, { useCallback, useEffect, useRef, useState } from "react";
import { composeParams, morphLabel, parseNumberInput, playMeow } from "./audio";
import { CRY_STYLES, KEYS, VOICES } from "./data";
import { makeHash as buildHash, parseHashState } from "./hash";
import {
  midiNoteToKey,
  midiNoteToSemitone,
  midiVelocityScale,
  parseMidiMessage,
  type MidiStatus,
} from "./midi";
import { OptionGrid } from "./components/OptionGrid";
import { SectionHeader } from "./components/SectionHeader";
import { KeyboardControls } from "./components/KeyboardControls";

type AudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

type DraftNums = Record<string, string>;
React.version.toString();

// ─────────────────────────────────────────────
//  ネコーダーUIにゃ🐱
// ─────────────────────────────────────────────
export default function Necoder() {
  const initialHash = useRef(null);
  if (!initialHash.current) initialHash.current = parseHashState();
  const init = initialHash.current;

  const [voiceIdx, setVoiceIdx] = useState(init.voiceIdx ?? 1);
  const [styleIdx, setStyleIdx] = useState(init.styleIdx ?? 0);
  const [morph, setMorph] = useState(init.morph ?? 0.5);
  const [ps, setPs] = useState(init.ps ?? 0); // ピッチシフト (半音)
  const [dm, setDm] = useState(init.dm ?? 1.0); // デュレーション倍率
  const [vib, setVib] = useState(init.vib ?? 1.0); // ビブラート倍率
  const [vm, setVm] = useState(init.vm ?? 0.8); // 音量倍率
  const [activeKey, setAK] = useState(null);
  const [midiStatus, setMidiStatus] = useState<MidiStatus>(
    typeof navigator !== "undefined" && navigator.requestMIDIAccess
      ? "off"
      : "unsupported",
  );
  const [isPlay, setIP] = useState(false);
  const [dispTxt, setDT] = useState("🐱  ネコーダーにゃ～");
  const [draftNums, setDraftNums] = useState<DraftNums>({});

  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const colorRef = useRef(VOICES[1].color);
  const timerRef = useRef(null);
  const midiAccessRef = useRef(null);
  const midiInputsRef = useRef([]);
  const activeMidiNotesRef = useRef(new Set());
  const activeKeyRef = useRef(null);
  const triggerRef = useRef(null);

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
      return buildHash(state);
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
      const next = parseHashState();
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
      const audioWindow = window as AudioWindow;
      const AudioContextCtor =
        audioWindow.AudioContext || audioWindow.webkitAudioContext;
      if (!AudioContextCtor) throw new Error("Web Audio is not supported");
      const ctx = new AudioContextCtor();
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
    (st = 0, velocityScale = 1) => {
      const { ctx, an } = getAudio();
      const v = VOICES[voiceIdx];
      const style = CRY_STYLES[styleIdx];
      const dur = playMeow(ctx, an, composeParams(v, style), st, {
        ps,
        dm,
        vib,
        vm: vm * velocityScale,
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

  useEffect(() => {
    activeKeyRef.current = activeKey;
  }, [activeKey]);

  useEffect(() => {
    triggerRef.current = trigger;
  }, [trigger]);

  const clearMidiInputs = useCallback((resetKey = true) => {
    midiInputsRef.current.forEach((input) => {
      input.onmidimessage = null;
    });
    midiInputsRef.current = [];
    activeMidiNotesRef.current.clear();
    if (resetKey) setAK(null);
  }, []);

  const handleMidiMessage = useCallback(
    (event) => {
      const message = parseMidiMessage(event.data || []);
      if (message.type === "ignore") return;

      const { note } = message;
      const key = midiNoteToKey(note);
      if (message.type === "noteon") {
        activeMidiNotesRef.current.add(note);
        if (key) setAK(key);
        triggerRef.current?.(
          midiNoteToSemitone(note),
          midiVelocityScale(message.velocity),
        );
        return;
      }

      activeMidiNotesRef.current.delete(note);
      if (key && activeKeyRef.current === key) {
        const latestKey =
          [...activeMidiNotesRef.current].reverse().map(midiNoteToKey).find(Boolean) ||
          null;
        setAK(latestKey);
      }
    },
    [],
  );

  const bindMidiInputs = useCallback(
    (access) => {
      clearMidiInputs();
      const inputs = Array.from(access.inputs.values()) as MIDIInput[];
      inputs.forEach((input) => {
        input.onmidimessage = handleMidiMessage;
      });
      midiInputsRef.current = inputs;
    },
    [clearMidiInputs, handleMidiMessage],
  );

  const toggleMidi = useCallback(async () => {
    if (!navigator.requestMIDIAccess) {
      setMidiStatus("unsupported");
      return;
    }

    if (midiStatus === "on") {
      if (midiAccessRef.current) midiAccessRef.current.onstatechange = null;
      clearMidiInputs();
      midiAccessRef.current = null;
      setMidiStatus("off");
      return;
    }

    try {
      const access = await navigator.requestMIDIAccess();
      midiAccessRef.current = access;
      bindMidiInputs(access);
      access.onstatechange = () => bindMidiInputs(access);
      setMidiStatus("on");
    } catch {
      clearMidiInputs();
      midiAccessRef.current = null;
      setMidiStatus("error");
    }
  }, [bindMidiInputs, clearMidiInputs, midiStatus]);

  useEffect(() => {
    return () => {
      if (midiAccessRef.current) midiAccessRef.current.onstatechange = null;
      clearMidiInputs(false);
    };
  }, [clearMidiInputs]);

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

  const clearParamDrafts = useCallback(() => {
    setDraftNums((drafts) => {
      const next = { ...drafts };
      ["ps", "dm", "vib", "vm"].forEach((key) => delete next[key]);
      return next;
    });
  }, []);

  const setParamsAndCommit = useCallback(
    (next) => {
      clearParamDrafts();
      setPs(next.ps);
      setDm(next.dm);
      setVib(next.vib);
      setVm(next.vm);
      commitHash(next);
    },
    [clearParamDrafts, commitHash],
  );

  const randomizeParams = useCallback(() => {
    const stepValue = (min, max, step) => {
      const count = Math.round((max - min) / step);
      return Number((min + Math.floor(Math.random() * (count + 1)) * step).toFixed(2));
    };
    setParamsAndCommit({
      ps: stepValue(-7, 7, 1),
      dm: stepValue(0.4, 1.8, 0.1),
      vib: stepValue(0, 2.5, 0.1),
      vm: stepValue(0.45, 1, 0.05),
    });
  }, [setParamsAndCommit]);

  const resetParams = useCallback(() => {
    setParamsAndCommit({ ps: 0, dm: 1, vib: 1, vm: 0.8 });
  }, [setParamsAndCommit]);

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
          <SectionHeader>VOICE / 音色</SectionHeader>
          <OptionGrid
            items={VOICES}
            selectedIndex={voiceIdx}
            columns={4}
            accentColor={col}
            onSelect={(index) => {
              setVoiceIdx(index);
              commitHash({ voiceIdx: index });
            }}
            renderIcon={(v) => (
              <div style={{ fontSize: "22px", marginBottom: "3px" }}>
                {v.emoji}
              </div>
            )}
          />
        </div>

        {/* ── 鳴き方にゃ ── */}
        <div style={{ padding: "12px 14px 0" }}>
          <SectionHeader>CRY STYLE / 鳴き方</SectionHeader>
          <OptionGrid
            items={CRY_STYLES}
            selectedIndex={styleIdx}
            columns={4}
            accentColor={col}
            onSelect={(index) => {
              setStyleIdx(index);
              commitHash({ styleIdx: index });
            }}
            renderIcon={(style) => (
              <div
                style={{
                  fontFamily: "'Share Tech Mono',monospace",
                  fontSize: "18px",
                  marginBottom: "3px",
                }}
              >
                {style.mark}
              </div>
            )}
          />
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
            style={
              {
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
              } as React.CSSProperties
            }
          >
            {isPlay ? `${cryStyle.mark}  ${voice.name} ${cryStyle.name}` : "🐾  にゃ～ん！"}
          </button>
        </div>

        {/* ── パラメータにゃ ── */}
        <div style={{ padding: "0 14px 14px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              color: "#66708A",
              fontSize: "9px",
              letterSpacing: "3px",
              marginBottom: "8px",
              fontFamily: "'Share Tech Mono',monospace",
            }}
          >
            <span>PARAMETERS / パラメータ</span>
            <span
              style={{
                display: "flex",
                gap: "5px",
                letterSpacing: 0,
              }}
            >
              {[
                { label: "🎲", title: "ランダム", onClick: randomizeParams },
                { label: "↺", title: "リセット", onClick: resetParams },
              ].map((button) => (
                <button
                  key={button.title}
                  type="button"
                  title={button.title}
                  aria-label={button.title}
                  onClick={button.onClick}
                  style={{
                    width: "24px",
                    height: "22px",
                    borderRadius: "7px",
                    border: `1px solid ${col}55`,
                    background: "#FFFFFFAA",
                    color: col,
                    cursor: "pointer",
                    display: "grid",
                    placeItems: "center",
                    fontSize: "12px",
                    lineHeight: 1,
                    padding: 0,
                    transition: "background .12s, border-color .12s, transform .08s",
                  }}
                >
                  {button.label}
                </button>
              ))}
            </span>
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
        <KeyboardControls
          activeKey={activeKey}
          color={col}
          midiStatus={midiStatus}
          onToggleMidi={toggleMidi}
          onPressKey={(key, semitone) => {
            setAK(key);
            trigger(semitone);
          }}
          onReleaseKey={() => setAK(null)}
        />
      </div>
    </div>
  );
}

