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
