import { DEMO_ACCOUNTS } from "@/lib/auth/demo-access";
import { demoAccountSignIn } from "@/app/actions/auth";
import { Card } from "@/components/ui/card";

/**
 * The four review accounts, one click each.
 *
 * A demo does not want to type a ten-digit number four times, and the point of
 * the shortcut is to get into a console. Each button posts its own number to
 * the same server action the form posts to, so there is one code path, not two
 * — the button is a faster way to type the number, not a second way in.
 *
 * Shown only where `demoSignInWorks()` holds, which the page decides: allowed
 * on this server, and able to open the console it signs in to. So every button
 * here opens a console, and there is no "this might not work" state to warn
 * about.
 */
export function DemoAccounts() {
  return (
    <Card className="mt-[18px] p-[20px]">
      <h2 className="t-card-title text-ink">Review accounts</h2>
      <p className="t-caption mt-[4px] text-muted">
        Synthetic accounts from the sample fixtures. One click signs in with no code; the
        number also works typed into the form above.
      </p>

      <ul className="mt-[12px] flex flex-col gap-[8px]">
        {DEMO_ACCOUNTS.map((account) => (
          <li key={account.role}>
            <form action={demoAccountSignIn}>
              <input type="hidden" name="role" value={account.role} />
              <button
                type="submit"
                className={[
                  "flex w-full items-center justify-between gap-[12px] rounded-[10px] border border-line",
                  "bg-white px-[14px] py-[12px] text-left hover:border-brand",
                  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-saffron",
                ].join(" ")}
              >
                <span className="min-w-0">
                  <span className="block text-[15px] font-bold text-ink">{account.label}</span>
                  <span className="block truncate text-[13px] text-muted">{account.name}</span>
                </span>
                <span className="flex-none text-[13px] font-semibold text-brand">
                  {account.mobile} <span aria-hidden="true">→</span>
                </span>
              </button>
            </form>
          </li>
        ))}
      </ul>
    </Card>
  );
}
