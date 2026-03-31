const EMAIL_COLUMN_CANDIDATES = [
  "email",
  "email_address",
  "emailaddress",
  "mail",
  "recipient",
  "to"
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function detectEmailColumn(rows: Array<Record<string, string>>, fallback?: string): string {
  if (fallback && rows.length > 0 && fallback in rows[0]) {
    return fallback;
  }

  if (rows.length === 0) {
    throw new Error("CSV has no rows.");
  }

  const headers = Object.keys(rows[0]);
  const normalizedHeaders = headers.map((header) => header.toLowerCase().trim());

  for (const candidate of EMAIL_COLUMN_CANDIDATES) {
    const hitIndex = normalizedHeaders.findIndex((header) => header === candidate);
    if (hitIndex >= 0) {
      return headers[hitIndex];
    }
  }

  let bestHeader = headers[0];
  let bestScore = -1;

  for (const header of headers) {
    const validCount = rows.reduce((count, row) => {
      const value = (row[header] ?? "").trim();
      return count + (EMAIL_REGEX.test(value) ? 1 : 0);
    }, 0);

    if (validCount > bestScore) {
      bestScore = validCount;
      bestHeader = header;
    }
  }

  if (bestScore <= 0) {
    throw new Error("Unable to detect an email column in CSV.");
  }

  return bestHeader;
}

export function isValidEmail(input: string): boolean {
  return EMAIL_REGEX.test(input.trim());
}
