/** A missing count is not zero. Zero is a count the response actually carried. */
export function enquiryCountLabel(count: number | null): string | null {
  if (count == null) return null;
  return count === 1 ? "1 enquiry" : `${count} enquiries`;
}

/** Image records are not stored photographs. A missing count is not shown as zero. */
export function imageRecordLabel(count: number | null): string | null {
  if (count == null) return null;
  const records = count === 1 ? "1 image record" : `${count} image records`;
  return `${records}. An image record is not a stored photograph.`;
}

/**
 * Owner-list caption. A missing declared count stays the older photograph
 * sentence. A present count, including zero, names stored photographs and
 * image records as separate numbers.
 */
export function ownerCountLine(
  photoCount: number,
  declaredImageCount: number | null,
  enquiryCount: number | null,
): string {
  const photos =
    declaredImageCount == null
      ? photoCount === 0
        ? "no photographs"
        : `${photoCount} photograph${photoCount === 1 ? "" : "s"}`
      : `${photoCount} stored photograph${photoCount === 1 ? "" : "s"} · ${imageRecordLabel(declaredImageCount)}`;
  const enquiries = enquiryCountLabel(enquiryCount);
  return enquiries ? `${photos} · ${enquiries}` : photos;
}
