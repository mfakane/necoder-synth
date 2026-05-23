import type { ReactNode } from "react";

type OptionGridProps<T extends { id: string; name: string; color?: string }> = {
  items: T[];
  selectedIndex: number;
  columns: number;
  accentColor: string;
  renderIcon: (item: T) => ReactNode;
  onSelect: (index: number) => void;
};

export function OptionGrid<T extends { id: string; name: string; color?: string }>({
  items,
  selectedIndex,
  columns,
  accentColor,
  renderIcon,
  onSelect,
}: OptionGridProps<T>) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns},1fr)`,
        gap: "7px",
      }}
    >
      {items.map((item, index) => {
        const selected = selectedIndex === index;
        const color = item.color || accentColor;
        return (
          <button
            key={item.id}
            onClick={() => onSelect(index)}
            style={{
              background: selected ? color + "22" : "#F4F7FC",
              border: `1px solid ${selected ? color : "#D9E2F0"}`,
              borderRadius: "10px",
              padding: "9px 5px",
              cursor: "pointer",
              transition: "all .13s",
              color: selected ? color : "#46526A",
              fontFamily: "'Nunito',sans-serif",
              fontWeight: 800,
              fontSize: "11px",
              textAlign: "center",
              boxShadow: selected ? `0 0 18px ${color}40` : "none",
            }}
          >
            {renderIcon(item)}
            {item.name}
          </button>
        );
      })}
    </div>
  );
}
