/**
 * The approved logo treatment. Values measured from the rendered baseline package
 * (commit 5bc3512): a blue rounded tile carrying an Archivo "K" with a saffron rule
 * across its foot, then "Kam Ki" in Archivo 500 and "Lead" in Archivo 800 blue,
 * underlined in saffron.
 *
 * Saffron appears here as a rule only — never as a surface, never carrying text.
 */
export function Wordmark({
  size = "md",
  onDark = false,
}: {
  /** md = public header (33px tile), sm = footer and compact rails (30px tile). */
  size?: "md" | "sm";
  onDark?: boolean;
}) {
  const tile = size === "md" ? 33 : 30;
  const glyph = size === "md" ? 21 : 19;
  const text = size === "md" ? 20 : 19;

  return (
    <span className="inline-flex flex-none items-center gap-[10px] whitespace-nowrap">
      <span
        aria-hidden="true"
        className="relative flex flex-none items-center justify-center rounded-[6px]"
        style={{ width: tile, height: tile, background: onDark ? "#ffffff" : "#1B3BB3" }}
      >
        <span
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: glyph,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            lineHeight: 1,
            color: onDark ? "#0F2478" : "#ffffff",
          }}
        >
          K
        </span>
        <span
          className="absolute bg-saffron"
          style={{ left: 6, right: 6, bottom: 5, height: 2.5 }}
        />
      </span>

      <span className="flex items-baseline gap-[5px]">
        <span
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: text,
            fontWeight: 500,
            letterSpacing: "-0.03em",
            color: onDark ? "#D7DDF6" : "#12182B",
          }}
        >
          Kam Ki
        </span>
        <span
          className="relative pb-[4px]"
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: text,
            fontWeight: 800,
            letterSpacing: "-0.035em",
            color: onDark ? "#ffffff" : "#1B3BB3",
          }}
        >
          Lead
          <span className="absolute inset-x-0 bottom-0 bg-saffron" style={{ height: 2.5 }} />
        </span>
      </span>
    </span>
  );
}
