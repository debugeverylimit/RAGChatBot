import { describe, expect, it } from "vitest";
import { formatResponse } from "../src/app/formatter.js";
import { DISCLAIMER } from "../src/app/schemas.js";

describe("formatResponse", () => {
  it("appends last updated footer", () => {
    const formatted = formatResponse({
      answer: "The expense ratio is 0.76%.",
      citation_url: "https://groww.in/mutual-funds/hdfc-mid-cap-fund-direct-growth",
      last_updated: "2026-06-22",
      is_refusal: false,
      disclaimer: DISCLAIMER,
    });

    expect(formatted.answer).toContain("Last updated from sources: 2026-06-22");
    expect(formatted.disclaimer).toBe(DISCLAIMER);
  });
});
