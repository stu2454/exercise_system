import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ClientDemoLanding } from "./ClientDemoLanding";

describe("Client Demo landing", () => {
  it("shows programme information and one start action without developer terminology", () => {
    const html = renderToStaticMarkup(<ClientDemoLanding exerciseCount={9} onStart={() => undefined} />);
    expect(html).toContain("9 exercises");
    expect(html).toContain("GET STARTED");
    expect(html).toContain("not a medical assessment or treatment");
    expect(html).not.toContain("ENABLE CAMERA");
    for (const excluded of ["Launch Participant Mode", "Exercise Library", "Programme Configuration", "diagnostics", "+1 Rep", "Build 7"]) {
      expect(html).not.toContain(excluded);
    }
  });
});
