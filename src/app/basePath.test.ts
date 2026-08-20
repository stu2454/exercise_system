import { describe, expect, it } from "vitest";
import { publicAssetUrl } from "./basePath";

describe("publicAssetUrl", () => {
  it("resolves root-relative assets at the domain root", () => {
    expect(publicAssetUrl("/videos/exercise-01.mov", "/")).toBe("/videos/exercise-01.mov");
  });

  it("resolves assets under a GitHub Pages repository base", () => {
    expect(publicAssetUrl("/videos/exercise-01.mov", "/exercise-engagement/")).toBe(
      "/exercise-engagement/videos/exercise-01.mov",
    );
  });
});
