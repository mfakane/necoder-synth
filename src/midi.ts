import { KEYS } from "./data";

export type MidiStatus = "off" | "on" | "unsupported" | "error";

export type MidiNoteMessage =
  | { type: "noteon"; note: number; velocity: number }
  | { type: "noteoff"; note: number; velocity: number }
  | { type: "ignore" };

export const MIDI_NOTE_BASE = 60;

export const midiNoteToSemitone = (note: number) => note - MIDI_NOTE_BASE;

export const midiNoteToKey = (note: number) => {
  const semitone = midiNoteToSemitone(note);
  return KEYS.find((key) => key.st === semitone)?.key || null;
};

export const parseMidiMessage = (data: ArrayLike<number>): MidiNoteMessage => {
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
  return { type: "ignore" };
};

export const midiVelocityScale = (velocity: number) =>
  0.35 + (velocity / 127) * 0.65;
