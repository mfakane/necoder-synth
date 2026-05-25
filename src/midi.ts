import { KEYS } from "./data";

export type MidiStatus = "off" | "on" | "unsupported" | "error";

export type MidiNoteMessage =
  | { type: "noteon"; note: number; velocity: number }
  | { type: "noteoff"; note: number; velocity: number }
  | { type: "allsoundoff" }
  | { type: "ignore" };

export type WebMidiLinkMessage =
  | { type: "midi"; data: number[]; message: MidiNoteMessage }
  | { type: "link"; command: "ready" | "reqpatch" | "patch" | "setpatch"; data?: string }
  | { type: "ignore" };

export const MIDI_NOTE_BASE = 60;

export const midiNoteToSemitone = (note: number) => note - MIDI_NOTE_BASE;

export const midiNoteToKey = (note: number) => {
  const semitone = midiNoteToSemitone(note);
  return KEYS.find((key) => key.st === semitone)?.key || null;
};

export const midiBytesToNoteMessage = (
  data: ArrayLike<number>,
): MidiNoteMessage => {
  const status = data[0] || 0;
  const note = data[1] || 0;
  const velocity = data[2] || 0;
  const command = status & 0xf0;
  if (command === 0x90 && velocity > 0) {
    return { type: "noteon", note, velocity };
  }
  if (command === 0x80 || (command === 0x90 && velocity === 0)) {
    return { type: "noteoff", note, velocity };
  }
  if (command === 0xb0 && note === 0x78 && velocity === 0) {
    return { type: "allsoundoff" };
  }
  return { type: "ignore" };
};

export const parseMidiMessage = midiBytesToNoteMessage;

export const midiVelocityScale = (velocity: number) =>
  0.35 + (velocity / 127) * 0.65;

const parseMidiByte = (raw: string) => {
  if (!/^[\da-f]{1,2}$/i.test(raw)) return null;
  const value = Number.parseInt(raw, 16);
  if (!Number.isFinite(value) || value < 0 || value > 0xff) return null;
  return value;
};

export const parseWebMidiLinkMessage = (
  data: unknown,
): WebMidiLinkMessage => {
  if (typeof data !== "string") return { type: "ignore" };

  const parts = data.split(",");
  if (parts[0] === "midi") {
    if (parts.length < 2) return { type: "ignore" };
    const bytes = parts.slice(1).map(parseMidiByte);
    if (bytes.some((byte) => byte === null)) return { type: "ignore" };
    const midiData = bytes as number[];
    return {
      type: "midi",
      data: midiData,
      message: midiBytesToNoteMessage(midiData),
    };
  }

  if (parts[0] === "link") {
    const command = parts[1];
    if (
      command === "ready" ||
      command === "reqpatch" ||
      command === "patch" ||
      command === "setpatch"
    ) {
      if ((command === "patch" || command === "setpatch") && parts.length !== 3) {
        return { type: "ignore" };
      }
      if ((command === "ready" || command === "reqpatch") && parts.length !== 2) {
        return { type: "ignore" };
      }
      return {
        type: "link",
        command,
        data: parts[2],
      };
    }
  }

  return { type: "ignore" };
};
