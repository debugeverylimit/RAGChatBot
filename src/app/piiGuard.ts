export class PiiRejectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PiiRejectedError";
  }
}

const PII_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  { name: "PAN", pattern: /\b[A-Z]{5}[0-9]{4}[A-Z]\b/i },
  { name: "Aadhaar", pattern: /\b[2-9]\d{11}\b/ },
  { name: "email", pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i },
  {
    name: "phone",
    pattern: /\b(?:\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}\b/,
  },
  { name: "OTP", pattern: /\botp\b[\s:.-]*\d{4,8}\b/i },
  {
    name: "account number",
    pattern: /\b(?:account|a\/c|acct)[\s#:.-]*\d{6,}\b/i,
  },
];

export function assertNoPii(message: string): void {
  for (const { name, pattern } of PII_PATTERNS) {
    if (pattern.test(message)) {
      throw new PiiRejectedError(
        `For your privacy, do not share ${name} or other personal identifiers. Ask a factual question about expense ratio, exit load, benchmark, minimum SIP, or fund managers for the supported HDFC schemes.`,
      );
    }
  }
}
