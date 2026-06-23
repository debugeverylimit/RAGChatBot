import { describe, expect, it } from "vitest";
import {
  containsAdvisoryLanguage,
  containsPerformanceClaims,
  countSentences,
  getCitationAllowlist,
  trimToThreeSentences,
  validateResponse,
} from "../src/app/validator.js";
import { AMFI_EDUCATION_URL } from "../src/app/schemas.js";

describe("validator", () => {
  it("allows corpus and education URLs", () => {
    const allowlist = getCitationAllowlist();
    expect(allowlist.has(AMFI_EDUCATION_URL)).toBe(true);
    expect(
      allowlist.has(
        "https://groww.in/mutual-funds/hdfc-mid-cap-fund-direct-growth",
      ),
    ).toBe(true);
  });

  it("trims answers to three sentences", () => {
    const trimmed = trimToThreeSentences(
      "One. Two. Three. Four. Five.",
    );
    expect(countSentences(trimmed)).toBeLessThanOrEqual(3);
  });

  it("detects advisory language", () => {
    expect(containsAdvisoryLanguage("You should invest today.")).toBe(true);
  });

  it("detects performance claims", () => {
    expect(containsPerformanceClaims("Expected CAGR of 12%.")).toBe(true);
  });

  it("rejects disallowed citations", () => {
    const result = validateResponse({
      answer: "Example answer.",
      citation_url: "https://example.com/not-allowed",
      is_refusal: false,
      chunks: [
        {
          id: "x",
          text: "Scheme: HDFC Mid Cap Fund Direct Growth\nSource: https://groww.in/mutual-funds/hdfc-mid-cap-fund-direct-growth\n\nExpense ratio: 0.76%",
          section: "expense_ratio",
          distance: 0.1,
          managerName: null,
        },
      ],
    });

    expect(result.citation_url).toBe(
      "https://groww.in/mutual-funds/hdfc-mid-cap-fund-direct-growth",
    );
  });

  it("strips advisory language from factual answers", () => {
    const result = validateResponse({
      answer: "You should invest in this fund because the expense ratio is low.",
      citation_url: "https://groww.in/mutual-funds/hdfc-mid-cap-fund-direct-growth",
      is_refusal: false,
      chunks: [
        {
          id: "x",
          text: "Expense ratio: 0.76%",
          section: "expense_ratio",
          distance: 0.1,
          managerName: null,
        },
      ],
    });

    expect(result.issues).toContain("advisory_language");
    expect(result.answer.toLowerCase()).not.toContain("you should invest");
  });
});
