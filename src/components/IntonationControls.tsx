import type { ReactNode } from "react";
import { SectionHeader } from "./SectionHeader";

export type IntonationSlider = {
  label: string;
  jp: string;
  keyName: "curveStart" | "curvePeak" | "curveEnd";
  value: number;
  setValue: (value: number) => void;
};

type IntonationControlsProps = {
  color: string;
  sliders: IntonationSlider[];
  presetSelect?: ReactNode;
  draftNums: Record<string, string>;
  setDraftNum: (keyName: string, value: string) => void;
  clearDraftNum: (keyName: string) => void;
  commitNumericValue: (keyName: string, rawValue: string, slider: IntonationSlider) => void;
  commitHash: (next: Record<string, number>) => void;
};

export function IntonationControls({
  color,
  sliders,
  presetSelect,
  draftNums,
  setDraftNum,
  clearDraftNum,
  commitNumericValue,
  commitHash,
}: IntonationControlsProps) {
  const curvePoints = sliders.map((slider, index) => {
    const x = sliders.length === 1 ? 50 : (index / (sliders.length - 1)) * 100;
    const y = 100 - ((slider.value + 12) / 24) * 100;
    return { x, y };
  });
  const [startPoint, peakPoint, endPoint] = curvePoints;
  const curvePath =
    startPoint && peakPoint && endPoint
      ? [
          `M ${startPoint.x} ${startPoint.y}`,
          `C ${startPoint.x + 18} ${startPoint.y}`,
          `${peakPoint.x - 18} ${peakPoint.y}`,
          `${peakPoint.x} ${peakPoint.y}`,
          `S ${endPoint.x - 18} ${endPoint.y}`,
          `${endPoint.x} ${endPoint.y}`,
        ].join(" ")
      : "";
  const areaPath =
    curvePath && startPoint && endPoint
      ? `${curvePath} L ${endPoint.x} 100 L ${startPoint.x} 100 Z`
      : "";

  return (
    <div style={{ padding: "0 14px" }}>
      <SectionHeader action={presetSelect}>INTONATION / 抑揚</SectionHeader>
      <div
        style={{
          position: "relative",
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: "8px",
        }}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{
            position: "absolute",
            left: "0",
            right: "0",
            top: "45px",
            bottom: "48px",
            width: "100%",
            height: "64px",
            overflow: "visible",
            pointerEvents: "none",
            zIndex: 2,
          }}
        >
          <defs>
            <linearGradient id="intonationArea" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.2" />
              <stop offset="100%" stopColor={color} stopOpacity="0.03" />
            </linearGradient>
          </defs>
          {areaPath && <path d={areaPath} fill="url(#intonationArea)" />}
          {curvePath && (
            <path
              d={curvePath}
              fill="none"
              stroke={color}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity="0.32"
              strokeWidth="3.2"
              vectorEffect="non-scaling-stroke"
            />
          )}
          {curvePoints.map((point, index) => (
            <circle
              key={sliders[index]?.keyName}
              cx={point.x}
              cy={point.y}
              r="2.4"
              fill={color}
              fillOpacity="0.38"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
        {sliders.map((slider) => {
          const fill = ((slider.value + 12) / 24) * 100;
          return (
            <div
              key={slider.keyName}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                background: "#F6F8FC",
                borderRadius: "9px",
                border: "1px solid #DCE5F2",
                padding: "10px 8px 9px",
                minWidth: 0,
                position: "relative",
              }}
            >
              <div style={{ position: "relative", zIndex: 3 }}>
                <div
                  style={{
                    color: "#65718C",
                    fontSize: "8px",
                    letterSpacing: "2px",
                    fontFamily: "'Share Tech Mono',monospace",
                    textAlign: "center",
                  }}
                >
                  {slider.label}
                </div>
                <div
                  style={{
                    color: "#4C5870",
                    fontSize: "9px",
                    marginTop: "1px",
                    textAlign: "center",
                  }}
                >
                  {slider.jp}
                </div>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "12px 36px 12px",
                  alignItems: "center",
                  gap: "3px",
                  marginTop: "7px",
                  height: "64px",
                  position: "relative",
                  zIndex: 3,
                }}
              >
                <div
                  style={{
                    alignSelf: "start",
                    color: "#9AA5BA",
                    fontFamily: "'Share Tech Mono',monospace",
                    fontSize: "8px",
                    textAlign: "right",
                  }}
                >
                  +12
                </div>
                <input
                  type="range"
                  min={-12}
                  max={12}
                  step={1}
                  value={slider.value}
                  onChange={(event) => {
                    clearDraftNum(slider.keyName);
                    slider.setValue(Number(event.target.value));
                  }}
                  onPointerUp={(event) =>
                    commitHash({ [slider.keyName]: Number(event.currentTarget.value) })
                  }
                  onKeyUp={(event) =>
                    commitHash({ [slider.keyName]: Number(event.currentTarget.value) })
                  }
                  onBlur={(event) =>
                    commitHash({ [slider.keyName]: Number(event.currentTarget.value) })
                  }
                  style={{
                    width: "36px",
                    height: "64px",
                    writingMode: "vertical-lr",
                    direction: "rtl",
                    accentColor: color,
                    background: `linear-gradient(to top, ${color} 0%, ${color} ${fill}%, #D6DFEF ${fill}%, #D6DFEF 100%)`,
                  }}
                />
                <div
                  style={{
                    alignSelf: "end",
                    color: "#9AA5BA",
                    fontFamily: "'Share Tech Mono',monospace",
                    fontSize: "8px",
                    textAlign: "left",
                  }}
                >
                  -12
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontFamily: "'Share Tech Mono',monospace",
                  fontSize: "12px",
                  fontWeight: 700,
                  color,
                  marginTop: "7px",
                  position: "relative",
                  zIndex: 3,
                }}
              >
                <input
                  className="necoder-number"
                  type="text"
                  inputMode="decimal"
                  value={draftNums[slider.keyName] ?? String(slider.value)}
                  onChange={(event) => setDraftNum(slider.keyName, event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      commitNumericValue(
                        slider.keyName,
                        event.currentTarget.value,
                        slider,
                      );
                      event.currentTarget.blur();
                    }
                  }}
                  onBlur={(event) =>
                    commitNumericValue(slider.keyName, event.currentTarget.value, slider)
                  }
                  style={{
                    width: "48px",
                    background: "transparent",
                    border: "1px solid transparent",
                    borderRadius: "6px",
                    color,
                    fontFamily: "'Share Tech Mono',monospace",
                    fontSize: "12px",
                    fontWeight: 700,
                    padding: "4px 5px",
                    textAlign: "right",
                    outline: "none",
                  }}
                />
                st
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
