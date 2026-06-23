import { describe, expect, it } from "vitest";
import {
  buildCronExpression,
  parseScheduleArgs,
} from "../src/scheduler/daily.js";

describe("scheduler", () => {
  it("builds cron expression for configured hour and minute", () => {
    expect(buildCronExpression(10, 0)).toBe("0 10 * * *");
    expect(buildCronExpression(4, 30)).toBe("30 4 * * *");
  });

  it("parses once and daemon flags", () => {
    expect(parseScheduleArgs(["--once"])).toEqual({
      once: true,
      daemon: false,
    });
    expect(parseScheduleArgs(["--daemon"])).toEqual({
      once: false,
      daemon: true,
    });
    expect(parseScheduleArgs([])).toEqual({
      once: false,
      daemon: true,
    });
  });
});
