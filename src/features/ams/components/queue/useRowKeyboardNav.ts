import { useCallback, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

import type { QueueRow } from "../../types";

/**
 * Roving-focus keyboard navigation for the queue (table rows or cards).
 * Arrows move, Space toggles selection, Enter opens the application file.
 */
export function useRowKeyboardNav({
  rows,
  selected,
  onToggle,
  columns = 1,
}: {
  rows: QueueRow[];
  selected: string[];
  onToggle: (id: string, checked: boolean) => void;
  columns?: number;
}) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLElement | null>(null);
  const [active, setActive] = useState(0);

  const focusIndex = useCallback((index: number) => {
    const clamped = Math.max(0, index);
    setActive(clamped);
    const node = containerRef.current?.querySelector<HTMLElement>(`[data-row-index="${clamped}"]`);
    node?.focus();
    node?.scrollIntoView({ block: "nearest" });
  }, []);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent, index: number) => {
      const last = rows.length - 1;
      const row = rows[index];
      if (!row) return;
      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          focusIndex(Math.min(last, index + columns));
          break;
        case "ArrowUp":
          event.preventDefault();
          focusIndex(Math.max(0, index - columns));
          break;
        case "ArrowLeft":
          if (columns === 1) return;
          event.preventDefault();
          focusIndex(Math.min(last, index + 1));
          break;
        case "ArrowRight":
          if (columns === 1) return;
          event.preventDefault();
          focusIndex(Math.max(0, index - 1));
          break;
        case "Home":
          event.preventDefault();
          focusIndex(0);
          break;
        case "End":
          event.preventDefault();
          focusIndex(last);
          break;
        case " ":
        case "Spacebar":
          event.preventDefault();
          onToggle(row.id, !selected.includes(row.id));
          break;
        case "Enter":
          event.preventDefault();
          navigate({ to: "/ams/applications/$applicationId", params: { applicationId: row.id } });
          break;
        default:
          break;
      }
    },
    [columns, focusIndex, navigate, onToggle, rows, selected],
  );

  const rowProps = (index: number) => ({
    "data-row-index": index,
    tabIndex: index === Math.min(active, Math.max(0, rows.length - 1)) ? 0 : -1,
    onKeyDown: (event: React.KeyboardEvent) => onKeyDown(event, index),
    onFocus: () => setActive(index),
    "aria-selected": selected.includes(rows[index]?.id ?? ""),
  });

  return { containerRef, active, rowProps };
}