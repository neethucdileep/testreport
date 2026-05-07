export function normalizeE164India(raw: string) {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.startsWith("91") && digits.length === 12) return `+${digits}`;
  if (trimmed.startsWith("+")) return trimmed;
  return trimmed;
}

export function safePhoneId(e164: string) {
  // Firestore doc IDs allow '+' but it's easier to standardize.
  return e164.replaceAll("+", "plus_");
}

export function unsafePhoneId(phoneId: string) {
  return phoneId.startsWith("plus_") ? phoneId.replace("plus_", "+") : phoneId;
}

