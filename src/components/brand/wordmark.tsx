/**
 * The logo supplied on 2 October 2026, shown beside the name.
 *
 * The file is a JPEG with a white background. It is not a vector and it is
 * not transparent, so on a dark rail the white rectangle is the file's own
 * background. The image is not cropped or redrawn. Its box uses the file's
 * own 2440×2373 proportion.
 */
export function Wordmark({
  size = "md",
  onDark = false,
}: {
  /**
   * md = public header, sm = public footer, rail = the console rails.
   * The heights differ by role. The width follows the file, so the mark is
   * not stretched.
   */
  size?: "md" | "sm" | "rail";
  onDark?: boolean;
}) {
  const height = size === "md" ? 44 : size === "sm" ? 36 : 32;
  const width = Math.round((height * 2440) / 2373);
  const text = size === "md" ? 20 : size === "sm" ? 19 : 17;

  return (
    <span className="inline-flex flex-none items-center gap-[10px] whitespace-nowrap">
      {/*
        A plain <img>, not next/image. The mark is a single small static file
        served from /public at a fixed size on every page; the optimiser would
        add a per-request image route and, on a provider that bills for it, a
        cost, for no change to what renders. Width and height are the file's
        own, so the box is reserved and nothing shifts as it loads.
      */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/kkl-logo.jpg"
        alt=""
        width={2440}
        height={2373}
        draggable={false}
        className="flex-none bg-white object-contain"
        style={{ width, height }}
      />
      <span className="flex items-baseline gap-[5px]">
        <span
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: text,
            fontWeight: 500,
            letterSpacing: "-0.03em",
            color: onDark ? "var(--color-on-brand)" : "var(--color-ink)",
          }}
        >
          {/* Two spans, so "Lead" can carry the heavier weight. The name is
              split here, which is why a search for the whole string "Kam Ki
              Lead" did not find the wordmark when the spelling was
              corrected everywhere else. */}
          Kaam Ki
        </span>
        <span
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: text,
            fontWeight: 800,
            letterSpacing: "-0.035em",
            color: onDark ? "#ffffff" : "var(--color-brand)",
          }}
        >
          Lead
        </span>
      </span>
    </span>
  );
}
