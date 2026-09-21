import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { AccessPanel } from "@/components/ui/states";

const POLICIES: Record<string, string> = {
  terms: "Terms of use",
  privacy: "Privacy policy",
  refunds: "Refund policy",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return { title: POLICIES[slug] ?? "Policy" };
}

export function generateStaticParams() {
  return Object.keys(POLICIES).map((slug) => ({ slug }));
}

/**
 * P-20 — policy page template.
 *
 * The approved design ships this as a template with a copy-pending placeholder.
 * Policy text is legal content the client supplies; inventing it would be worse
 * than showing that it is outstanding — particularly the refund policy, whose
 * terms are an open decision (D-06).
 */
export default async function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const title = POLICIES[slug];
  if (!title) notFound();

  return (
    <div className="mx-auto max-w-[760px] px-[32px] pb-[60px] pt-[30px] max-[1060px]:px-[18px]">
      <h1 className="t-title text-ink">{title}</h1>

      <div className="mt-[18px]">
        <AccessPanel
          tone="restricted"
          chipLabel="Copy pending"
          title="This policy has not been supplied yet"
          footnote="P-20 policy template · awaiting client copy"
        >
          The wording for this page comes from the client and has not been provided. We do not
          draft or approximate legal text, so the page stays empty rather than carrying something
          nobody has agreed to.
        </AccessPanel>
      </div>

      <Card className="mt-[14px] p-[20px]">
        <h2 className="t-card-title text-ink">What will appear here</h2>
        <p className="t-caption mt-[6px] text-body">
          The approved template renders supplied copy as headed sections with a last-updated date.
          The layout is ready; only the text is outstanding.
        </p>
      </Card>
    </div>
  );
}
