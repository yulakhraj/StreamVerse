import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("application entry", () => {
  it("provides an accessible landmark and honest setup state", () => {
    const html = renderToStaticMarkup(<App />);
    expect(html).toContain('id="main"');
    expect(html).toContain("Where will you watch?");
    expect(html).toContain('role="status"');
    expect(html).not.toContain("vite.svg");
  });
});
