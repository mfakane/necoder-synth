import { KEYS } from "../data";
import type { MidiStatus } from "../midi";
import { SectionHeader } from "./SectionHeader";

type KeyboardControlsProps = {
  activeKey: string | null;
  color: string;
  midiStatus: MidiStatus;
  webMidiLinkReady: boolean;
  onToggleMidi: () => void;
  onPressKey: (key: string, semitone: number) => void;
  onReleaseKey: () => void;
};

export function KeyboardControls({
  activeKey,
  color,
  midiStatus,
  webMidiLinkReady,
  onToggleMidi,
  onPressKey,
  onReleaseKey,
}: KeyboardControlsProps) {
  const isReady = midiStatus === "on" || webMidiLinkReady;
  const isDisabled = midiStatus === "unsupported" && !webMidiLinkReady;
  const buttonLabel = webMidiLinkReady
    ? "WebMidiLink READY"
    : midiStatus === "on"
      ? "MIDI ON"
      : midiStatus === "unsupported"
        ? "NO MIDI"
        : midiStatus === "error"
          ? "MIDI ERR"
          : "MIDI OFF";

  return (
    <div style={{ padding: "0 14px 14px" }}>
      <SectionHeader
        action={
          <button
            type="button"
            disabled={isDisabled}
            onClick={onToggleMidi}
            title={webMidiLinkReady ? "WebMidiLink接続READY" : "MIDIキーボード接続"}
            aria-label={webMidiLinkReady ? "WebMidiLink接続READY" : "MIDIキーボード接続"}
            style={{
              minWidth: webMidiLinkReady ? "126px" : "72px",
              height: "22px",
              borderRadius: "7px",
              border: `1px solid ${
                isReady
                  ? color
                  : midiStatus === "error"
                    ? "#F06A6A"
                    : "#CBD6E8"
              }`,
              background:
                isReady
                  ? color
                  : midiStatus === "unsupported"
                    ? "#EEF2F8"
                    : "#FFFFFFAA",
              color:
                isReady
                  ? "#FFFFFF"
                  : midiStatus === "error"
                    ? "#C64545"
                    : midiStatus === "unsupported"
                      ? "#9AA5BA"
                      : color,
              cursor: isDisabled ? "not-allowed" : "pointer",
              fontFamily: "'Share Tech Mono',monospace",
              fontSize: webMidiLinkReady ? "8px" : "9px",
              fontWeight: 700,
              letterSpacing: 0,
              padding: "0 7px",
              transition: "background .12s, color .12s, border-color .12s",
              whiteSpace: "nowrap",
            }}
          >
            {buttonLabel}
          </button>
        }
      >
        KEYBOARD / キーボード
      </SectionHeader>
      <div style={{ display: "flex", gap: "4px" }}>
        {KEYS.map((keyDef) => {
          const active = activeKey === keyDef.key;
          return (
            <button
              key={keyDef.key}
              onMouseDown={() => onPressKey(keyDef.key, keyDef.st)}
              onMouseUp={onReleaseKey}
              onMouseLeave={onReleaseKey}
              onTouchStart={(event) => {
                event.preventDefault();
                onPressKey(keyDef.key, keyDef.st);
              }}
              onTouchEnd={onReleaseKey}
              style={{
                flex: 1,
                background: active ? color : "#F9FBFF",
                border: `1px solid ${active ? color : "#CBD6E8"}`,
                borderRadius: "0 0 9px 9px",
                padding: "26px 0 7px",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: "3px",
                transition: "all .07s",
                boxShadow: active ? `0 0 22px ${color}77` : "none",
              }}
            >
              <div
                style={{
                  color: active ? "#FFFFFF" : "#2E3A52",
                  fontSize: "9px",
                  fontWeight: 800,
                  transition: "color .07s",
                }}
              >
                {keyDef.note}
              </div>
              <div
                style={{
                  color: active ? "#FFFFFFCC" : "#68748D",
                  fontSize: "8px",
                  fontFamily: "'Share Tech Mono',monospace",
                  transition: "color .07s",
                }}
              >
                {keyDef.key.toUpperCase()}
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
  );
}
