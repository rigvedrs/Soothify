const HIGH_PRIORITY_PHRASES = [
  "panic attack",
  "i'm panicking",
  "i am panicking",
  "i'm freaking out",
  "i am freaking out",
  "can't breathe",
  "cannot breathe",
  "make it stop",
  "feel out of control",
  "feeling out of control",
];

const PHYSICAL_SYMPTOMS = [
  "heart racing",
  "heart is racing",
  "chest tight",
  "chest feels tight",
  "shaking",
  "spiraling",
  "spiralling",
  "can't calm down",
  "cannot calm down",
  "losing control",
];

const URGENT_LANGUAGE = [
  "help me",
  "right now",
  "not okay right now",
  "i'm not okay",
  "i am not okay",
];

export type PanicDetectionResult = {
  score: number;
  detected: boolean;
  evidence: string[];
};

export function detectPanicSignals(input: string): PanicDetectionResult {
  const normalized = input.trim().toLowerCase();

  if (!normalized) {
    return { score: 0, detected: false, evidence: [] };
  }

  const evidence = new Set<string>();
  let score = 0;

  for (const phrase of HIGH_PRIORITY_PHRASES) {
    if (normalized.includes(phrase)) {
      evidence.add(phrase);
      score += 4;
    }
  }

  for (const phrase of PHYSICAL_SYMPTOMS) {
    if (normalized.includes(phrase)) {
      evidence.add(phrase);
      score += 3;
    }
  }

  for (const phrase of URGENT_LANGUAGE) {
    if (normalized.includes(phrase)) {
      evidence.add(phrase);
      score += 2;
    }
  }

  if (evidence.size >= 2) {
    score += 2;
  }

  if (/[!?]{2,}/.test(normalized) || /[A-Z]{4,}/.test(input)) {
    score += 1;
  }

  return {
    score,
    detected: score >= 6,
    evidence: Array.from(evidence),
  };
}
