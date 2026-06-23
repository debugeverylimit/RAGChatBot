import { describe, expect, it } from "vitest";
import { buildRefusal } from "../src/app/refusal.js";
import {
  AMFI_EDUCATION_URL,
  DISCLAIMER,
  SEBI_EDUCATION_URL,
} from "../src/app/schemas.js";

describe("buildRefusal", () => {
  it("returns advisory refusal with SEBI link", async () => {
    const response = await buildRefusal(
      "advisory",
      "Should I invest in HDFC Mid Cap Fund?",
    );

    expect(response.is_refusal).toBe(true);
    expect(response.citation_url).toBe(SEBI_EDUCATION_URL);
    expect(response.disclaimer).toBe(DISCLAIMER);
    expect(response.answer.toLowerCase()).toContain("investment advice");
  });

  it("returns comparison refusal with AMFI link", async () => {
    const response = await buildRefusal(
      "comparison",
      "Which is better, mid cap or large cap?",
    );

    expect(response.is_refusal).toBe(true);
    expect(response.citation_url).toBe(AMFI_EDUCATION_URL);
    expect(response.answer.toLowerCase()).toContain("compare");
  });

  it("returns performance refusal with scheme link when scheme is named", async () => {
    const response = await buildRefusal(
      "performance",
      "What returns will I get from HDFC Mid Cap Fund in 3 years?",
    );

    expect(response.is_refusal).toBe(true);
    expect(response.citation_url).toBe(
      "https://groww.in/mutual-funds/hdfc-mid-cap-fund-direct-growth",
    );
    expect(response.answer.toLowerCase()).toContain("returns");
  });

  it("returns advisory refusal for comparison plus buy recommendation", async () => {
    const response = await buildRefusal(
      "advisory",
      "Compare expense ratios and tell me which to buy",
    );

    expect(response.is_refusal).toBe(true);
    expect(response.citation_url).toBe(SEBI_EDUCATION_URL);
  });
});
