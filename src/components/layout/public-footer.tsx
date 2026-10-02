import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";

/** Footer columns as they appear on the approved homepage (P-01). */
const COLUMNS: ReadonlyArray<{ heading: string; links: ReadonlyArray<[string, string]> }> = [
  {
    heading: "Buyers",
    links: [
      ["Search properties", "/search"],
      ["Projects", "/search?type=project"],
      ["Find my match", "/find-my-match"],
      ["My shortlist", "/account/shortlist"],
      ["My enquiries", "/account/enquiries"],
    ],
  },
  {
    heading: "Professionals",
    links: [
      ["For builders", "/builders"],
      ["For brokers", "/brokers"],
      ["Buy Leads", "/brokers"],
      ["Verification & KYC", "/brokers"],
      ["Sign in", "/auth"],
    ],
  },
  {
    // CR02: the individual owner's route is distinct from the professionals'
    // — an owner posting their own property is not a broker buying leads.
    heading: "Owners",
    links: [["Post your property", "/post-property"]],
  },
  {
    heading: "Support & policies",
    links: [
      ["Contact & help", "/support"],
      ["Report a listing", "/support"],
      ["Terms of use", "/legal/terms"],
      ["Privacy policy", "/legal/privacy"],
      ["Refund policy", "/legal/refunds"],
    ],
  },
];

export function PublicFooter() {
  return (
    <footer className="mt-[40px] bg-brand-deep text-on-brand">
      <div className="mx-auto box-content max-w-[1280px] px-[32px] pb-[24px] pt-[38px] max-[1060px]:px-[18px]">
        <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr_0.8fr] gap-[28px] max-[900px]:grid-cols-2 max-[560px]:grid-cols-1">
          <div>
            <Wordmark size="sm" onDark />
            <p className="mt-[12px] max-w-[34ch] text-[15px] leading-[1.6] text-on-brand">
              A property portal for Kolkata, and a lead marketplace for verified brokers and
              builders.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h2 className="text-[15px] font-bold text-white">{col.heading}</h2>
              <ul className="mt-[12px] flex flex-col gap-[8px]">
                {col.links.map(([label, href]) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-[15px] text-on-brand hover:text-white hover:underline"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-[28px] flex flex-wrap items-center justify-between gap-[12px] border-t border-[#23387F] pt-[16px]">
          <p className="text-[14px] text-[#9FACE4]">© 2026 Kam Ki Lead</p>
          <p className="text-[14px] text-[#9FACE4]">Kolkata · New Town · Rajarhat · Salt Lake</p>
        </div>
      </div>
    </footer>
  );
}
