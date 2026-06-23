import { describe, expect, it } from "vitest";
import { classifyQuery } from "../src/app/classifier.js";

describe("classifyQuery", () => {
  it("labels advisory queries", () => {
    expect(classifyQuery("Should I invest in HDFC Mid Cap Fund?")).toBe("advisory");
  });

  it("labels comparison queries", () => {
    expect(classifyQuery("Which is better, mid cap or large cap?")).toBe("comparison");
  });

  it("labels performance queries", () => {
    expect(classifyQuery("What returns will I get in 3 years?")).toBe("performance");
  });

  it("labels comparison plus advisory as advisory", () => {
    expect(
      classifyQuery("Compare expense ratios and tell me which to buy"),
    ).toBe("advisory");
  });

  it("labels factual queries", () => {
    expect(
      classifyQuery("What is the expense ratio of HDFC Mid Cap Fund?"),
    ).toBe("factual");
  });

  it("does not label factual expense ratio queries as advisory", () => {
    expect(classifyQuery("Expense ratio of HDFC Defence Fund")).toBe("factual");
  });

  it("labels good investment queries as advisory", () => {
    expect(classifyQuery("Is HDFC Defence Fund a good investment?")).toBe("advisory");
  });
});
