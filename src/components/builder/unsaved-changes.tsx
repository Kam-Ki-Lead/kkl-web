"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

/**
 * B-15 — unsaved changes in the listing editor.
 *
 * The approved prototype does three things: it shows an "Unsaved changes" mark
 * in the editor header once a field is touched, it changes the save button's
 * label to "Draft saved" once there is nothing pending, and it puts a dialog in
 * the way of leaving with three ways out — save and close, discard, keep
 * editing. All three are here.
 *
 * Two things about how it is built are worth stating, because both are the
 * difference between a guard that works and one that looks like it does.
 *
 * **Dirtiness is read from the DOM, never from a snapshot.** A control is dirty
 * when its value differs from its own `defaultValue` (or `defaultChecked`, or
 * `defaultSelected`). That is exactly the state `form.reset()` restores, so
 * "discard" and "is it dirty" can never disagree — a stored baseline would
 * drift the moment a re-render changed a default under it.
 *
 * **Interception is a capture-phase click listener on the document.** Every way
 * out of the editor is an anchor: the section rail, "Close editor", the console
 * rail, the logo. One listener covers all of them, and covers ones added later
 * without anybody remembering this file exists.
 *
 * None of this works without JavaScript, and it is not pretending otherwise.
 * See `NoScriptSaveNotice` at the bottom.
 */

type DirtyContextValue = {
  readonly dirty: boolean;
  readonly saved: boolean;
  readonly restored: boolean;
  readonly formId: string;
};

const DirtyContext = createContext<DirtyContextValue | null>(null);

/** Only reached if the button is rendered outside a provider, which is a bug. */
const SECTION_FORM_FALLBACK_ID = "listing-section-form";

/**
 * Whether any control in this form differs from what the server rendered.
 *
 * File inputs are deliberately excluded. In sample mode nothing is uploaded —
 * the bytes are dropped and `photoCount` is what the editor actually saves — so
 * a chosen file can never become "saved". Counting it would leave the editor
 * permanently dirty with no way for a Builder to clear it, which is worse than
 * not counting it. Recorded in `verification.md` rather than left as a quirk.
 */
function isFormDirty(form: HTMLFormElement): boolean {
  for (const element of Array.from(form.elements)) {
    if (element instanceof HTMLInputElement) {
      if (element.type === "file" || element.type === "submit" || element.type === "button") {
        continue;
      }
      if (element.type === "checkbox" || element.type === "radio") {
        if (element.checked !== element.defaultChecked) return true;
      } else if (element.value !== element.defaultValue) {
        return true;
      }
    } else if (element instanceof HTMLTextAreaElement) {
      if (element.value !== element.defaultValue) return true;
    } else if (element instanceof HTMLSelectElement) {
      for (const option of Array.from(element.options)) {
        if (option.selected !== option.defaultSelected) return true;
      }
    }
  }
  return false;
}

/** Dispatched by the section form once a save has come back successfully. */
export const SAVED_EVENT = "kkl:section-saved";

/** Dispatched once a per-tab draft has been put back into the form. */
const RESTORED_EVENT = "kkl:draft-restored";

/**
 * Per-tab persistence for an unsaved section, so browser Back loses nothing.
 *
 * WHY THIS EXISTS RATHER THAN A HISTORY TRAP
 * ------------------------------------------
 * The dialog intercepts links, because a click is cancellable. **Browser Back
 * is not.** By the time `popstate` fires the navigation has happened, and the
 * usual workaround — pushing a duplicate history entry and re-pushing it on
 * every `popstate` — breaks Forward, grows the stack, escapes on a fast double
 * press, and fights the router for the same events. It reports a pass and
 * behaves badly.
 *
 * So this does not try to stop Back. It removes the reason to: the draft is
 * written as it is typed and put back when the section is opened again, so
 * Back-then-Forward returns to the work rather than to the last save.
 *
 * WHAT IT IS NOT
 * --------------
 * It is **not storage of record** and nothing reads it but this form. It holds
 * one listing's unsaved text in one tab, is cleared the moment a save lands,
 * and dies with the tab. `sessionStorage` rather than `localStorage`
 * deliberately: a draft that outlived the tab would be a surprise, and one
 * shared between tabs would fight itself.
 *
 * Every access is wrapped. Private windows, blocked site data and storage
 * quotas all make these calls throw, and a failure here must cost nothing more
 * than the restoration.
 */
const draftStore = {
  key(formId: string): string {
    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement)) return "";
    const listing = form.querySelector<HTMLInputElement>('input[name="listingId"]')?.value ?? "";
    const section = form.querySelector<HTMLInputElement>('input[name="section"]')?.value ?? "";
    return listing && section ? `kkl:listing-draft:${listing}:${section}` : "";
  },

  save(formId: string): void {
    const key = draftStore.key(formId);
    const form = document.getElementById(formId);
    if (!key || !(form instanceof HTMLFormElement)) return;

    const values: Record<string, string | string[] | boolean> = {};
    for (const element of Array.from(form.elements)) {
      if (!("name" in element) || !element.name) continue;
      if (element instanceof HTMLInputElement) {
        // Files cannot be serialised and are not saved by this editor anyway.
        if (element.type === "file" || element.type === "submit" || element.type === "button") continue;
        if (element.type === "checkbox" || element.type === "radio") {
          if (element.checked !== element.defaultChecked) {
            values[`${element.name}::${element.value}`] = element.checked;
          }
        } else if (element.value !== element.defaultValue) {
          values[element.name] = element.value;
        }
      } else if (element instanceof HTMLTextAreaElement) {
        if (element.value !== element.defaultValue) values[element.name] = element.value;
      } else if (element instanceof HTMLSelectElement) {
        if (Array.from(element.options).some((o) => o.selected !== o.defaultSelected)) {
          values[element.name] = element.value;
        }
      }
    }

    try {
      if (Object.keys(values).length === 0) window.sessionStorage.removeItem(key);
      else window.sessionStorage.setItem(key, JSON.stringify(values));
    } catch {
      // Storage unavailable. The editor still works; only the restore is lost.
    }
  },

  /** Puts a stored draft back. Returns true if anything actually changed. */
  restore(formId: string): boolean {
    const key = draftStore.key(formId);
    const form = document.getElementById(formId);
    if (!key || !(form instanceof HTMLFormElement)) return false;

    let raw: string | null = null;
    try {
      raw = window.sessionStorage.getItem(key);
    } catch {
      return false;
    }
    if (!raw) return false;

    let values: Record<string, string | string[] | boolean>;
    try {
      values = JSON.parse(raw) as Record<string, string | string[] | boolean>;
    } catch {
      return false;
    }

    let changed = false;
    for (const element of Array.from(form.elements)) {
      if (!("name" in element) || !element.name) continue;
      if (element instanceof HTMLInputElement) {
        if (element.type === "checkbox" || element.type === "radio") {
          const stored = values[`${element.name}::${element.value}`];
          if (typeof stored === "boolean" && element.checked !== stored) {
            element.checked = stored;
            changed = true;
          }
        } else if (element.type !== "file" && typeof values[element.name] === "string") {
          const stored = values[element.name] as string;
          if (element.value !== stored) {
            element.value = stored;
            changed = true;
          }
        }
      } else if (
        (element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) &&
        typeof values[element.name] === "string"
      ) {
        const stored = values[element.name] as string;
        if (element.value !== stored) {
          element.value = stored;
          changed = true;
        }
      }
    }
    return changed;
  },

  clear(formId: string): void {
    const key = draftStore.key(formId);
    if (!key) return;
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      // Nothing to do; the draft is cleared on the next successful save anyway.
    }
  },
};

export function UnsavedChangesProvider({
  formId,
  children,
}: {
  formId: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [restored, setRestored] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const recompute = useCallback(() => {
    const form = document.getElementById(formId);
    setDirty(form instanceof HTMLFormElement ? isFormDirty(form) : false);
  }, [formId]);

  // Field edits, and the form telling us a save landed. Both recompute from the
  // DOM rather than assuming: a save that came back with a validation error has
  // not cleared anything, and the recompute finds that out rather than guessing.
  useEffect(() => {
    const onChange = (event: Event) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.closest(`#${CSS.escape(formId)}`)) {
        recompute();
      }
    };
    const onEdit = (event: Event) => {
      onChange(event);
      const target = event.target;
      if (target instanceof HTMLElement && target.closest(`#${CSS.escape(formId)}`)) {
        draftStore.save(formId);
      }
    };
    const onSaved = () => {
      setSaved(true);
      // The saved values are now the form's defaults, so the draft is spent.
      // Clearing here rather than on unmount means a save always wins, even if
      // the Builder leaves immediately afterwards.
      draftStore.clear(formId);
      setRestored(false);
      recompute();
    };
    const onRestored = () => {
      setRestored(true);
      recompute();
    };
    document.addEventListener("input", onEdit);
    document.addEventListener("change", onEdit);
    document.addEventListener(SAVED_EVENT, onSaved);
    document.addEventListener(RESTORED_EVENT, onRestored);
    return () => {
      document.removeEventListener("input", onEdit);
      document.removeEventListener("change", onEdit);
      document.removeEventListener(SAVED_EVENT, onSaved);
      document.removeEventListener(RESTORED_EVENT, onRestored);
    };
  }, [formId, recompute]);

  // Put a stored draft back, once, after the listeners above are live.
  //
  // The restore mutates the DOM and then dispatches, rather than calling
  // setState here: a state update in an effect body cascades a second render
  // and is what React's own lint rule warns about. The listener registered
  // above picks the event up as an ordinary handler.
  useEffect(() => {
    if (draftStore.restore(formId)) {
      document.dispatchEvent(new Event(RESTORED_EVENT));
    }
  }, [formId]);

  // In-app navigation. Capture phase, so this runs before Next's own link
  // handling rather than racing it.
  useEffect(() => {
    if (!dirty) return;

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      // A modified click opens a new tab or window. This one stays put, so
      // there is nothing to warn about and hijacking it would be rude.
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor =
        event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.origin !== window.location.origin) return;

      const href = anchor.pathname + anchor.search;
      if (href === window.location.pathname + window.location.search) return;

      event.preventDefault();
      setPendingHref(href);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [dirty]);

  // Reload, tab close, and Back out of the application. The browser decides
  // what this looks like; see NoScriptSaveNotice and the verification record
  // for what it cannot do.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Set for browsers that still require it. No browser has honoured a
      // custom string here since 2017 — every one shows its own wording.
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const discard = useCallback(() => {
    const form = document.getElementById(formId);
    // Nothing was sent to the server, so discarding is purely local: put the
    // controls back to what the server rendered and go.
    if (form instanceof HTMLFormElement) form.reset();
    // And drop the stored draft, or coming back would restore what was just
    // discarded — which would make "discard" a lie.
    draftStore.clear(formId);
    setDirty(false);
    setRestored(false);
    const href = pendingHref;
    setPendingHref(null);
    if (href) router.push(href);
  }, [formId, pendingHref, router]);

  return (
    <DirtyContext.Provider value={{ dirty, saved, restored, formId }}>
      {children}
      {pendingHref ? (
        <ExitDialog
          formId={formId}
          pendingHref={pendingHref}
          onDiscard={discard}
          onKeepEditing={() => setPendingHref(null)}
        />
      ) : null}
    </DirtyContext.Provider>
  );
}

/**
 * The approved dialog: save and close, discard, keep editing.
 *
 * `aria-modal` with a focus trap and Escape, matching the baseline's markup.
 * It is rendered in flow under the editor rather than as an overlay, which is
 * what the prototype does — the content behind it stays readable while you
 * decide, and there is no scroll-lock to get wrong.
 */
function ExitDialog({
  formId,
  pendingHref,
  onDiscard,
  onKeepEditing,
}: {
  formId: string;
  pendingHref: string;
  onDiscard: () => void;
  onKeepEditing: () => void;
}) {
  const [node, setNode] = useState<HTMLDivElement | null>(null);

  // Focus moves to the dialog when it opens. A ref callback rather than an
  // effect: the node is focused at the moment React hands it over.
  const attach = useCallback((element: HTMLDivElement | null) => {
    setNode(element);
    element?.focus();
  }, []);

  useEffect(() => {
    if (!node) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onKeepEditing();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(node.querySelectorAll<HTMLElement>("button, [href]"));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    node.addEventListener("keydown", onKeyDown);
    return () => node.removeEventListener("keydown", onKeyDown);
  }, [node, onKeepEditing]);

  return (
    <div
      ref={attach}
      role="dialog"
      aria-modal="true"
      aria-labelledby="unsaved-title"
      aria-describedby="unsaved-body"
      tabIndex={-1}
      id="unsaved-changes-dialog"
      className="mt-[16px] rounded-[10px] border border-[#F3DFB4] bg-[#FFF7E8] p-[20px]"
    >
      <h2 id="unsaved-title" className="t-card-title text-ink">
        You have unsaved changes
      </h2>
      <p id="unsaved-body" className="t-body mt-[8px] text-body">
        Save this listing as a draft, or discard what you have entered since the last save.
      </p>
      <div className="mt-[14px] flex flex-wrap gap-[12px]">
        {/* Associated with the form by id, so it can submit a form it is not
            inside. `next` is the link that was intercepted, so saving lands
            where the Builder was trying to go. */}
        <Button type="submit" form={formId} name="next" value={pendingHref}>
          Save draft and close
        </Button>
        <Button type="button" variant="destructive" onClick={onDiscard}>
          Discard changes
        </Button>
        <Button type="button" variant="quiet" onClick={onKeepEditing}>
          Keep editing
        </Button>
      </div>
    </div>
  );
}

/**
 * The header save control (B-15).
 *
 * Associated with the form by the HTML `form` attribute rather than by being
 * inside it, which is what lets the approved header layout submit the editor.
 * That attribute is plain HTML, so this button still saves with scripting off —
 * it just always reads "Save draft" there, because nothing is tracking state.
 */
export function SaveDraftButton() {
  const context = useContext(DirtyContext);
  const settled = context ? context.saved && !context.dirty : false;
  return (
    <Button
      type="submit"
      form={context?.formId ?? SECTION_FORM_FALLBACK_ID}
      variant="secondary"
      size="sm"
    >
      {settled ? "Draft saved" : "Save draft"}
    </Button>
  );
}

/**
 * Says a draft was put back, so the form differing from the last save is
 * explained rather than mysterious.
 *
 * Without this the restoration would be the confusing kind of helpful: a
 * Builder returns to a section, sees text they do not remember leaving there,
 * and cannot tell whether it was saved. The line says it was not.
 */
export function RestoredDraftNotice() {
  const context = useContext(DirtyContext);
  if (!context?.restored) return null;
  return (
    <p
      role="status"
      className="rounded-[8px] border border-[#F3DFB4] bg-[#FFF7E8] px-[13px] py-[10px] text-[14px] text-body"
    >
      <strong className="text-ink">Unsaved work restored.</strong> You left this section without
      saving, so what you had typed has been put back. It is held in this browser tab only — save
      the draft to keep it.
    </p>
  );
}

/** The header mark. Nothing when there is nothing pending. */
export function UnsavedBadge() {
  const context = useContext(DirtyContext);
  if (!context?.dirty) return null;
  return (
    <span role="status" className="text-[14px] font-semibold text-[#8A4A08]">
      Unsaved changes
    </span>
  );
}

/**
 * Tells the provider a save landed, so the header mark clears.
 *
 * A DOM event rather than a shared state setter, because the form and the
 * header are on opposite sides of the tree and a child cannot set a parent's
 * state during render. The event fires on the transition into "saved", not on
 * every render of it.
 */
export function SavedSignal({ savedAt }: { savedAt: number | undefined }) {
  useEffect(() => {
    if (savedAt === undefined) return;
    document.dispatchEvent(new Event(SAVED_EVENT));
  }, [savedAt]);
  return null;
}

/**
 * What the editor is, and is not, with scripting turned off.
 *
 * Every part of B-15's unsaved-changes experience is client behaviour: the
 * header mark reads the DOM, the exit dialog intercepts clicks, the reload
 * warning is a `beforeunload` handler. With JavaScript off there is no mark, no
 * dialog and no warning, and claiming otherwise would be worse than saying so.
 *
 * What does still work is the part a Builder would actually lose work to: every
 * control that leaves a section is a submit button, so moving through the
 * editor saves on the way. The risk that remains is the browser's own Back
 * button and closing the tab, and this says which.
 */
export function NoScriptSaveNotice() {
  return (
    <noscript>
      <p className="t-caption rounded-[8px] bg-tint px-[13px] py-[10px] text-body">
        <strong className="text-ink">Without JavaScript there is no unsaved-changes
        warning.</strong>{" "}
        Moving between sections with the buttons above saves as you go. Using the browser&rsquo;s
        Back button, or closing the tab, will lose anything typed since the last save.
      </p>
    </noscript>
  );
}
