# ネコーダー

ねこボイスシンセ、ネコーダー。  
チップチューン寄りの簡易シンセで、ねこっぽい鳴き声を作って遊べる Web アプリです。

## Features

- 音色: 白猫、茶トラ、キジトラ、黒猫
- 鳴き方: にゃーん、にゃっ、みゃう、なーお
- モフ度: ピコ猫から超にゃーんまで連続調整
- ピッチ、長さ、ビブラート、音量の調整
- パラメータのランダム化とリセット
- URL hash による設定共有
- Web MIDI キーボード入力
- ビルド後の `dist/index.html` はローカルで開くだけでも動作

## Usage

画面上のボタンで音色と鳴き方を選び、モフ度や各種パラメータを調整して `にゃーん！` ボタンを押します。

PC キーボードの `A S D F G H J K` でも演奏できます。  
Web MIDI 対応ブラウザでは、`MIDI OFF` ボタンから MIDI キーボード入力を有効化できます。

## Development

```sh
npm ci
npm run dev
```

型チェック:

```sh
npm run typecheck
```

ビルド:

```sh
npm run build
```

`npm run build` は TypeScript の型チェック、Vite build、`dist/index.html` への JS/CSS インライン化を行います。

## Generated Audio

ネコーダーで合成した音声は自由に利用できます。  
商用・非商用、加工、再配布、作品への組み込みなど、用途を問わず利用できます。

## License

CC0 1.0 Universal.  
See [LICENSE](LICENSE).
