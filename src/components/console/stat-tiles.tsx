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
          {/* The approved S-06 tile: 26px/800 value, 14px/600 label, 13px note.
              The baseline declares no colour on the value, so it inherits the
              prototype page's default black; C-01's darkest text token is ink,
              and ink is what stays here — recorded in visual-differences.md. */}
          <p className="font-[family-name:var(--font-heading)] text-[26px] font-extrabold leading-[1.15] tracking-[-0.03em] text-ink">
            {tile.value}
          </p>
          <p className="mt-[6px] text-[14px] font-semibold text-ink">{tile.label}</p>
          <p className="t-caption mt-[2px] text-muted">{tile.note}</p>
        </Card>
      ))}
    </div>
  );
}
