import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import fs from "node:fs";
import path from "node:path";

vi.mock("@toss/tds-mobile", () => ({}));
vi.mock("@/pages/Home", () => ({
  default: () => React.createElement("div", { "data-testid": "page-home" }, "HOME"),
}));
vi.mock("@/pages/Result", () => ({
  default: () => React.createElement("div", { "data-testid": "page-result" }, "RESULT"),
}));
vi.mock("@/state/AppStateContext", () => ({
  useAppState: () => ({ input: null, setInput: vi.fn() }),
}));

import App from "@/App";

function LocationProbe() {
  const loc = useLocation();
  return React.createElement("span", { "data-testid": "loc" }, loc.pathname);
}

function renderAt(entry: string) {
  return render(
    React.createElement(
      MemoryRouter,
      { initialEntries: [entry] },
      React.createElement(App),
      React.createElement(LocationProbe),
    ),
  );
}

// ── src 스캔 유틸 ──
const SRC = path.resolve(__dirname, "..");
function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === "__tests__" ? [] : walk(p);
    return /\.(tsx?|css)$/.test(e.name) && !e.name.startsWith("__TdsGallery") ? [p] : [];
  });
}
const files = walk(SRC);
function findAll(re: RegExp): string[] {
  const hits: string[] = [];
  for (const f of files) {
    const text = fs.readFileSync(f, "utf8");
    const m = text.match(re);
    if (m) hits.push(`${path.relative(SRC, f)}: ${m[0]}`);
  }
  return hits;
}

describe("Routing & Integration", () => {
  it("AC-1[P0]: '/' renders Home only", () => {
    renderAt("/");
    expect(screen.getByTestId("page-home").textContent).toBe("HOME");
    expect(screen.queryByTestId("page-result")).toBeNull();
    expect(screen.getByTestId("loc").textContent).toBe("/");
  });

  it("AC-1[P0]: '/result' renders Result only", () => {
    renderAt("/result");
    expect(screen.getByTestId("page-result").textContent).toBe("RESULT");
    expect(screen.queryByTestId("page-home")).toBeNull();
    expect(screen.getByTestId("loc").textContent).toBe("/result");
  });

  it("AC-1[P0]: unknown paths redirect to '/' and render Home", () => {
    renderAt("/unknown");
    expect(screen.getByTestId("loc").textContent).toBe("/");
    expect(screen.getByTestId("page-home").textContent).toBe("HOME");
    expect(screen.queryByTestId("page-result")).toBeNull();
  });

  it("AC-1: deep unknown path also redirects to '/'", () => {
    renderAt("/result/extra/segments");
    expect(screen.getByTestId("loc").textContent).toBe("/");
    expect(screen.getByTestId("page-home").textContent).toBe("HOME");
  });

  it("AC-2[P0]: no hardcoded HEX colors, console.error, or outlinks in src", () => {
    expect(findAll(/#[0-9a-fA-F]{3,6}\b/)).toEqual([]);
    expect(findAll(/console\.error/)).toEqual([]);
    expect(findAll(/window\.open/)).toEqual([]);
    expect(findAll(/https?:\/\/(?!www\.w3\.org)/)).toEqual([]);
  });

  it("AC-2[P0]: no external logging SDKs or forbidden UI libraries in src", () => {
    expect(findAll(/gtag|amplitude|@sentry|datadog|bugsnag/i)).toEqual([]);
    expect(
      findAll(/from\s+['"](@?shadcn[^'"]*|@mui\/[^'"]*|antd[^'"]*|@chakra-ui\/[^'"]*|tailwindcss[^'"]*)['"]/),
    ).toEqual([]);
    expect(findAll(/@\/components\/ui\//)).toEqual([]);
  });

  it("AC-3[P0]: every <Button and <TextField has aria-label", () => {
    const missing: string[] = [];

    for (const f of files.filter((x) => x.endsWith(".tsx"))) {
      const text = fs.readFileSync(f, "utf8");
      for (const m of text.matchAll(/<(Button|TextField)\b(?:[^>]|=>)*>/g)) {

        if (!/aria-label/.test(m[0])) missing.push(`${path.relative(SRC, f)}: <${m[1]}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("AC-3: App.tsx wires both routes and a catch-all Navigate replace", () => {
    const src = fs.readFileSync(path.join(SRC, "App.tsx"), "utf8");
    expect(src).toMatch(/path="\/"/);
    expect(src).toMatch(/path="\/result"/);
    expect(src).toMatch(/path="\*"[\s\S]*<Navigate to="\/" replace/);
  });
});
