import type { ReactNode } from "react";

type SectionHeaderProps = {
  children: ReactNode;
  action?: ReactNode;
};

export function SectionHeader({ children, action }: SectionHeaderProps) {
  return (
    <div
      style={{
        display: action ? "flex" : undefined,
        justifyContent: action ? "space-between" : undefined,
        alignItems: action ? "center" : undefined,
        color: "#66708A",
        fontSize: "9px",
        letterSpacing: "3px",
        marginBottom: "8px",
        fontFamily: "'Share Tech Mono',monospace",
      }}
    >
      <span>{children}</span>
      {action}
    </div>
  );
}
