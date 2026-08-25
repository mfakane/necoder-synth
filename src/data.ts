export type WaveType = OscillatorType;

export type Voice = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  s: number;
  pk: number;
  e: number;
  fFreq: number;
  fQ: number;
  vol: number;
  wave: WaveType;
  durMul: number;
  atkMul: number;
  relMul: number;
  vDAdd: number;
  /** 自動ピッチ移動の量にゃ。1=標準、0=完全フラット。省略時は1 */
  pitchMove?: number;
  /** 子音ノイズ・チャープ・ザラつきの量にゃ。1=標準、0=無し。省略時は1 */
  breath?: number;
};

export type CryStyle = {
  id: string;
  name: string;
  mark: string;
  sMul: number;
  pkMul: number;
  eMul: number;
  dur: number;
  atk: number;
  rel: number;
  vR: number;
  vD: number;
  volMul: number;
  fMul: number;
  fQAdd: number;
  wave?: WaveType;
};

export type KeyDef = {
  note: string;
  key: string;
  st: number;
};

export const VOICES: Voice[] = [
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
  {
    id: "gray",
    name: "サバトラ",
    emoji: "🩶",
    color: "#7C8FA6",
    // ピッチはフラット。ド=C4 基準にして半音指定を素直にするにゃ
    s: 261.63,
    pk: 261.63,
    e: 261.63,
    // 音程によらず 700Hz 付近に居座る固定フォルマントにゃ
    // (掃引で 1.5 倍まで開くので、中心はその手前に置く)
    fFreq: 540,
    fQ: 4,
    vol: 0.5,
    wave: "sawtooth",
    durMul: 1,
    atkMul: 1,
    relMul: 1,
    vDAdd: 0,
    pitchMove: 0.06,
    breath: 0.12,
  },
];

export const CRY_STYLES: CryStyle[] = [
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
  {
    id: "mya",
    name: "みゃ",
    mark: "😽",
    sMul: 1,
    pkMul: 1,
    eMul: 1,
    dur: 0.3,
    atk: 0.05,
    rel: 0.1,
    vR: 5,
    vD: 0,
    volMul: 1,
    fMul: 1,
    fQAdd: 0,
  },
];

export const KEYS: KeyDef[] = [
  { note: "ド", key: "a", st: 0 },
  { note: "レ", key: "s", st: 2 },
  { note: "ミ", key: "d", st: 4 },
  { note: "ファ", key: "f", st: 5 },
  { note: "ソ", key: "g", st: 7 },
  { note: "ラ", key: "h", st: 9 },
  { note: "シ", key: "j", st: 11 },
  { note: "ド↑", key: "k", st: 12 },
];
