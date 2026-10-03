import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("[개선] TDS 컴포넌트 색 변수 고치기", () => {
  it("AC-1: reward-ad.css는 --tds-color-* 변수 0건을 사용하지 않는다", () => {
    const cssPath = path.join(process.cwd(), "src/styles/reward-ad.css");
    const content = fs.readFileSync(cssPath, "utf-8");

    const tdsColorMatches = content.match(/--tds-color-/g);
    expect(tdsColorMatches).toBeNull();
  });

  it("AC-1-detail: 줄 11에 --tds-color-grey500이 없다", () => {
    const cssPath = path.join(process.cwd(), "src/styles/reward-ad.css");
    const lines = fs.readFileSync(cssPath, "utf-8").split("\n");

    const line11 = lines[10];
    expect(line11).not.toContain("--tds-color-grey500");
  });

  it("AC-1-detail: 줄 19에 --tds-color-blue500이 없다", () => {
    const cssPath = path.join(process.cwd(), "src/styles/reward-ad.css");
    const lines = fs.readFileSync(cssPath, "utf-8").split("\n");

    const line19 = lines[18];
    expect(line19).not.toContain("--tds-color-blue500");
  });

  it("AC-1-detail: 줄 20에 --tds-color-white가 없다", () => {
    const cssPath = path.join(process.cwd(), "src/styles/reward-ad.css");
    const lines = fs.readFileSync(cssPath, "utf-8").split("\n");

    const line20 = lines[19];
    expect(line20).not.toContain("--tds-color-white");
  });

  it("AC-1-detail: 줄 29에 --tds-color-grey300이 없다", () => {
    const cssPath = path.join(process.cwd(), "src/styles/reward-ad.css");
    const lines = fs.readFileSync(cssPath, "utf-8").split("\n");

    const line29 = lines[28];
    expect(line29).not.toContain("--tds-color-grey300");
  });

  it("AC-2: reward-ad.css는 --adaptive* 변수 또는 고정 색값만 사용한다", () => {
    const cssPath = path.join(process.cwd(), "src/styles/reward-ad.css");
    const content = fs.readFileSync(cssPath, "utf-8");

    const lines = content.split("\n");
    const colorLines = lines.filter((line) => line.includes("color:") || line.includes("background-color:"));

    colorLines.forEach((line) => {
      const hasAdaptiveVar = line.includes("--adaptive");
      const hasHexColor = /#[0-9a-fA-F]{3,6}/.test(line);
      const hasRgb = /rgb\(|rgba\(/.test(line);

      expect(hasAdaptiveVar || hasHexColor || hasRgb).toBe(true);
    });
  });

  it("AC-3: 줄 19의 배경색은 --adaptiveBlue500 또는 유사한 adaptive 변수를 사용한다", () => {
    const cssPath = path.join(process.cwd(), "src/styles/reward-ad.css");
    const lines = fs.readFileSync(cssPath, "utf-8").split("\n");

    const line19 = lines[18];
    expect(line19).toContain("background-color:");
    expect(line19).toMatch(/--adaptive|#[0-9a-fA-F]{3,6}/);
    expect(line19).not.toContain("--tds-color-");
  });

  it("AC-4: 줄 20의 텍스트색은 고정 흰색 #ffffff 또는 --adaptive 변수를 사용한다", () => {
    const cssPath = path.join(process.cwd(), "src/styles/reward-ad.css");
    const lines = fs.readFileSync(cssPath, "utf-8").split("\n");

    const line20 = lines[19];
    expect(line20).toContain("color:");
    expect(line20).toMatch(/#ffffff|--adaptive/);
    expect(line20).not.toContain("--tds-color-white");
  });
});
