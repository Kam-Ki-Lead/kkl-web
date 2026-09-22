import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

export type StatTile = {
  readonly value: string;
  readonly label: string;
  /**
   * A short qualifier, e.g. "In your areas", or the name of the rule that stops
   * the figure meaning more than it does.
   *
   * Kept to one line of caption text. A chip or a sentence here makes one tile
   * taller than the rest and breaks the row the approved design shows.
   */
  readonly note: ReactNode;
};

/**
 * The dashboard's four figures (S-06).
 *
 * Four across on desktop, two across on mobile, matching the approved layout.
 * Every value is supplied by the caller from a service; nothing is counted here.
 */
export function StatTiles({ tiles }: { tiles: readonly StatTile[] }) {
  return (
    <div className="grid grid-cols-4 gap-[14px] max-[1060px]:grid-cols-2">
      {tiles.map((tile) => (
        <Card key={tile.label} className="p-[18px]">
          <p className="t-figure text-ink">{tile.value}</p>
          <p className="mt-[6px] text-[15px] font-semibold text-ink">{tile.label}</p>
          <p className="t-caption mt-[2px] text-muted">{tile.note}</p>
        </Card>
      ))}
    </div>
  );
}
