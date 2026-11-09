import { describe, expect, it } from "vitest";

import {
  calculateRiskScore,
  scoreTemp,
  TEMP_BASELINE,
  temperatureRisk,
} from "@/routes/index";

describe("temperature risk", () => {
  it("uses only temperature rises above the 37.5°C baseline", () => {
    expect(TEMP_BASELINE).toBe(37.5);
    expect(temperatureRisk(38).rise).toBe(0.5);
    expect(temperatureRisk(39).rise).toBe(1.5);
  });

  it("counts temperatures at or below baseline as zero rise and Normal", () => {
    expect(temperatureRisk(37.5)).toMatchObject({ rise: 0, points: 0, label: "Normal", tone: "success" });
    expect(temperatureRisk(37)).toMatchObject({ rise: 0, points: 0, label: "Normal", tone: "success" });
    expect(temperatureRisk(35)).toMatchObject({ rise: 0, points: 0, label: "Normal", tone: "success" });
  });

  it("scores rises up to 0.5°C as Normal with 0 points", () => {
    expect(temperatureRisk(37.6)).toMatchObject({ points: 0, label: "Normal", tone: "success" });
    expect(temperatureRisk(38)).toMatchObject({ points: 0, label: "Normal", tone: "success" });
  });

  it("scores rises above 0.5°C and up to 1.5°C as Warning with 1 point", () => {
    expect(temperatureRisk(38.1)).toMatchObject({ points: 1, label: "Warning", tone: "warning" });
    expect(temperatureRisk(38.7)).toMatchObject({ points: 1, label: "Warning", tone: "warning" });
    expect(temperatureRisk(39)).toMatchObject({ points: 1, label: "Warning", tone: "warning" });
  });

  it("scores rises above 1.5°C as High risk with 2 points", () => {
    expect(temperatureRisk(39.1)).toMatchObject({ points: 2, label: "High risk", tone: "destructive" });
    expect(temperatureRisk(40)).toMatchObject({ points: 2, label: "High risk", tone: "destructive" });
  });

  it("includes temperature points with SpO2 and perfusion in the total score", () => {
    expect(scoreTemp(36)).toBe(0);
    expect(scoreTemp(38.7)).toBe(1);
    expect(calculateRiskScore({ spo2: 94, pi: 0.6, temp: 38.7 })).toBe(3);
    expect(calculateRiskScore({ spo2: 97, pi: 2.5, temp: 37.2 })).toBe(0);
    expect(calculateRiskScore({ spo2: 82, pi: 0.2, temp: 39.5 })).toBe(8);
  });
});
