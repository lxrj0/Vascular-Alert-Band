import { describe, expect, it } from "vitest";

import {
  calculateRiskScore,
  scoreTemp,
  TEMP_BASELINE,
  temperatureRisk,
} from "@/routes/index";

describe("temperature risk", () => {
  it("uses absolute deviation from the 37.5°C baseline", () => {
    expect(TEMP_BASELINE).toBe(37.5);
    expect(temperatureRisk(37).deviation).toBe(0.5);
    expect(temperatureRisk(38).deviation).toBe(0.5);
  });

  it("scores deviations up to 0.5°C as Normal with 0 points", () => {
    expect(temperatureRisk(37)).toMatchObject({ points: 0, label: "Normal", tone: "success" });
    expect(temperatureRisk(38)).toMatchObject({ points: 0, label: "Normal", tone: "success" });
  });

  it("scores deviations above 0.5°C and up to 1.5°C as Warning with 1 point", () => {
    expect(temperatureRisk(36.9)).toMatchObject({ points: 1, label: "Warning", tone: "warning" });
    expect(temperatureRisk(36)).toMatchObject({ points: 1, label: "Warning", tone: "warning" });
    expect(temperatureRisk(39)).toMatchObject({ points: 1, label: "Warning", tone: "warning" });
  });

  it("scores deviations above 1.5°C as High risk with 2 points", () => {
    expect(temperatureRisk(35.9)).toMatchObject({ points: 2, label: "High risk", tone: "destructive" });
    expect(temperatureRisk(39.1)).toMatchObject({ points: 2, label: "High risk", tone: "destructive" });
  });

  it("includes temperature points with SpO2 and perfusion in the total score", () => {
    expect(scoreTemp(36)).toBe(1);
    expect(calculateRiskScore({ spo2: 94, pi: 0.6, temp: 36 })).toBe(3);
    expect(calculateRiskScore({ spo2: 97, pi: 2.5, temp: 37.2 })).toBe(0);
    expect(calculateRiskScore({ spo2: 82, pi: 0.2, temp: 35.5 })).toBe(8);
  });
});
