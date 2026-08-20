import { describe, expect, it } from "vitest";
import { DEVELOPER_TABS, isDeveloperTab } from "./developerTabs";

describe("developer navigation", () => {
  it("defines the five Build 7 workspace destinations in order", () => {
    expect(DEVELOPER_TABS.map((tab) => tab.id)).toEqual([
      "overview", "programmes", "exercise-library", "sessions", "developer",
    ]);
  });

  it("accepts only known tab identifiers", () => {
    expect(isDeveloperTab("sessions")).toBe(true);
    expect(isDeveloperTab("participant")).toBe(false);
  });
});
