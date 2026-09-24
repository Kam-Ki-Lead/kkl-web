import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { BuilderRegisterForm } from "@/components/builder/register-form";
import { runtimeConfig } from "@/lib/config/runtime";

export const metadata: Metadata = { title: "Register as a builder" };

/**
 * B-01 — builder registration.
 *
 * Its own centred shell rather than the console rail, for the same reason the
 * Seller's onboarding has one: there is nothing to navigate to yet, and a rail
 * full of items that go nowhere invites the person away from the one task in
 * front of them.
 */
export default function BuilderRegisterPage() {
  return (
    <div className="min-h-screen bg-surface">
      <header className="flex items-center justify-between gap-[14px] border-b border-line bg-white px-[32px] py-[16px] max-[1060px]:px-[16px]">
        <Link href="/" aria-label="Kam Ki Lead — home">
          <Wordmark />
        </Link>
        {/* 15px, as the approved B-01 header sets it — not the 13px caption. */}
        <p className="text-[15px] text-muted">Builder registration</p>
      </header>

      <main className="mx-auto max-w-[620px] px-[32px] py-[32px] max-[1060px]:px-[16px]">
        <h1 className="t-flow-title text-ink">Register as a builder</h1>
        <p className="t-body mt-[8px] text-body">
          Your mobile number is your login. After registration you submit company documents for
          verification; an administrator approves the account before you can publish a listing.
        </p>
        <div className="mt-[20px]">
          <BuilderRegisterForm isSample={runtimeConfig.isSampleMode} />
        </div>
      </main>
    </div>
  );
}
