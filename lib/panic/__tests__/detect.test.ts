import { detectPanicSignals } from "../detect";

describe("detectPanicSignals", () => {
  it("detects acute panic language with physical symptoms", () => {
    const result = detectPanicSignals("I'm freaking out, I can't breathe and my heart is racing.");

    expect(result.detected).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(6);
    expect(result.evidence).toEqual(
      expect.arrayContaining(["i'm freaking out", "can't breathe", "heart is racing"])
    );
  });

  it("does not trigger on ordinary stress", () => {
    const result = detectPanicSignals("I feel stressed about work this week and need a break.");

    expect(result.detected).toBe(false);
    expect(result.score).toBeLessThan(6);
  });

  it("can trigger on urgent panic phrasing even without exact panic attack wording", () => {
    const result = detectPanicSignals("Help me right now, I feel out of control.");

    expect(result.detected).toBe(true);
    expect(result.evidence).toEqual(
      expect.arrayContaining(["help me", "right now", "feel out of control"])
    );
  });
});
