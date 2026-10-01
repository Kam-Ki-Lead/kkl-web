/**
 * Photograph eligibility. These fixtures never touch kkl_review.
 * A stored row here is not a claim that a file was uploaded.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  coverBadge,
  declarationsToAdd,
  imageFromMedia,
  isStoredPhotograph,
  ownerPhotographLine,
  photographCover,
  photographRecordLabel,
  photographStepComplete,
  staffPhotographLabel,
  staffPhotographSubtitle,
  storedPhotographCount,
} from "../src/lib/domain/listing-photographs.ts";

const declared = { id: "d", retained: false, availability: "declared" };
const unavailable = { id: "u", retained: false, availability: "unavailable" };
const available = { id: "a", retained: true, availability: "available" };
const missing = { id: "m", retained: true };
const inconsistentDeclared = { id: "id", retained: true, availability: "declared" };
const inconsistentAvailable = { id: "ia", retained: false, availability: "available" };

test("no media counts as no stored photograph and has no cover", () => {
  assert.equal(storedPhotographCount([]), 0);
  assert.deepEqual(photographCover([]), { role: "none" });
  assert.equal(photographStepComplete([], "backend"), false);
  assert.equal(photographStepComplete([], "sample"), false);
  assert.equal(ownerPhotographLine([], "backend"), "None");
  assert.equal(staffPhotographLabel([]), "no photographs");
  assert.equal(staffPhotographSubtitle([]), "None on this listing");
});

test("declared media with stored false is metadata, not a photograph", () => {
  assert.equal(isStoredPhotograph(declared), false);
  assert.equal(storedPhotographCount([declared]), 0);
  assert.equal(photographCover([declared]).role, "none");
  assert.equal(coverBadge(declared, [declared]), null);
  assert.equal(photographRecordLabel(declared), "name, type and size recorded · not uploaded");
  assert.equal(photographStepComplete([declared], "backend"), false);
  assert.equal(photographStepComplete([declared], "sample"), false);
  assert.equal(ownerPhotographLine([declared], "backend"), "None stored · 1 file record, not uploaded");
  assert.equal(staffPhotographLabel([declared]), "1 file record, not uploaded");
});

test("unavailable media is not a stored photograph and is not the cover", () => {
  assert.equal(isStoredPhotograph(unavailable), false);
  assert.equal(photographCover([unavailable]).role, "none");
  assert.equal(coverBadge(unavailable, [unavailable]), null);
  assert.equal(photographRecordLabel(unavailable), "not available · not uploaded");
  assert.equal(photographStepComplete([unavailable], "backend"), false);
});

test("available media counts only when stored is also true", () => {
  assert.equal(isStoredPhotograph(available), true);
  assert.equal(storedPhotographCount([available]), 1);
  assert.deepEqual(photographCover([available]), { role: "stored", id: "a" });
  assert.equal(coverBadge(available, [available]), "stored");
  assert.equal(photographRecordLabel(available), "stored");
  assert.equal(photographStepComplete([available], "backend"), true);
  assert.equal(ownerPhotographLine([available], "backend"), "1 stored");
  assert.equal(staffPhotographSubtitle([available]), "1 stored");
});

test("missing or inconsistent fields fail closed", () => {
  assert.equal(isStoredPhotograph(missing), false);
  assert.equal(isStoredPhotograph(inconsistentDeclared), false);
  assert.equal(isStoredPhotograph(inconsistentAvailable), false);
  assert.equal(isStoredPhotograph({ retained: true, availability: "" }), false);
  assert.equal(isStoredPhotograph({ retained: true, availability: null }), false);
  assert.equal(isStoredPhotograph({ availability: "available" }), false);
  assert.equal(photographRecordLabel(missing), "not stored");
  assert.equal(photographRecordLabel(inconsistentDeclared), "name, type and size recorded · not uploaded");
  assert.equal(photographCover([missing, inconsistentDeclared, inconsistentAvailable]).role, "none");
  assert.equal(photographStepComplete([missing], "backend"), false);
  const unnamed = imageFromMedia({
    id: "x",
    kind: "image",
    stored: true,
    availability: "available",
  });
  assert.equal(unnamed?.retained, true);
  assert.equal(unnamed?.availability, "available");
  assert.equal(isStoredPhotograph(unnamed), true);
  const coerced = imageFromMedia({ id: "y", kind: "image", stored: "true", availability: "available" });
  assert.equal(coerced?.retained, false);
  assert.equal(isStoredPhotograph(coerced), false);
  assert.equal(imageFromMedia({ kind: "image", stored: true, availability: "available" }), null);
  assert.equal(imageFromMedia({ id: "z", kind: "video", stored: true, availability: "available" }), null);
  const unknown = imageFromMedia({ id: "w", kind: "image", stored: true, availability: "ready", byteSize: 10, fileName: "a.jpg" });
  assert.equal(unknown?.availability, undefined);
  assert.equal(isStoredPhotograph(unknown), false);
});

test("mixed rows count only the stored photograph and use it as the cover", () => {
  const rows = [declared, unavailable, missing, available, inconsistentAvailable];
  assert.equal(storedPhotographCount(rows), 1);
  assert.deepEqual(photographCover(rows), { role: "stored", id: "a" });
  assert.equal(coverBadge(declared, rows), null);
  assert.equal(coverBadge(unavailable, rows), null);
  assert.equal(coverBadge(available, rows), "stored");
  assert.equal(staffPhotographLabel(rows), "1 stored");
  assert.equal(ownerPhotographLine(rows, "backend"), "1 stored");
});

test("a sample name can be labelled cover and is not a stored photograph", () => {
  const sample = [{ id: "s1", retained: false }, { id: "s2", retained: false }];
  assert.equal(isStoredPhotograph(sample[0]), false);
  assert.equal(photographCover(sample).role, "sample-name");
  assert.equal(coverBadge(sample[0], sample), "sample-name");
  assert.equal(coverBadge(sample[1], sample), null);
  assert.equal(photographStepComplete(sample, "sample"), true);
  assert.equal(ownerPhotographLine(sample, "sample"), "2 chosen · files not stored in this build");
  assert.equal(photographCover([declared, sample[0]]).role, "none");
});

test("a repeated declaration of the same name, type and size is not added again", () => {
  const existing = [{ fileName: "living-room.jpg", byteSize: 2048, contentType: "image/jpeg" }];
  const again = declarationsToAdd(existing, existing);
  assert.equal(again.length, 0);
  const different = declarationsToAdd(existing, [
    { fileName: "living-room.jpg", byteSize: 4096, contentType: "image/jpeg" },
  ]);
  assert.equal(different.length, 1);
  const sameRequest = declarationsToAdd([], [
    { fileName: "kitchen.jpg", byteSize: 100, contentType: "image/png" },
    { fileName: "kitchen.jpg", byteSize: 100, contentType: "IMAGE/PNG" },
  ]);
  assert.equal(sameRequest.length, 1);
});
