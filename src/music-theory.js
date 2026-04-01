export const INTERVALS = {
  "Major": [2, 2, 1, 2, 2, 2, 1],
  "Natural Minor": [2, 1, 2, 2, 1, 2, 2],
  "Harmonic Minor": [2, 1, 2, 2, 1, 3, 1],
  "Pentatonic Major": [2, 2, 3, 2],
  "Dorian": [2, 1, 2, 2, 2, 1, 2],
  "Mixolydian": [2, 2, 1, 2, 2, 1, 2],
  "Phrygian": [1, 2, 2, 2, 1, 2, 2],
  "Blues": [3, 2, 1, 1, 3, 2],
  "Whole Tone": [2, 2, 2, 2, 2, 2],
  "Chromatic": [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
};

export const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export const DEFAULTS = {
  bpm: 130,
  measures: 2,
  minMeasures: 2,
  maxMeasures: 28,
  measureStep: 2,
  minBPM: 1,
  maxBPM: 300,
  defaultDuration: 1,
  bpmConversion: 60000,
  octaveMin: 3,
  octaveMax: 6,
  timeSignature: "4/4",
};

export const TIME_SIGNATURES = {
  "4/4": { beatsPerMeasure: 4, beatUnit: 4 },
  "3/4": { beatsPerMeasure: 3, beatUnit: 4 },
  "6/8": { beatsPerMeasure: 6, beatUnit: 8 },
};

/**
 * Generate a keyboard array spanning the given octave range.
 */
export function generateKeyboard(octaveMin = 4, octaveMax = 5) {
  const keyboard = [];
  for (let octave = octaveMin; octave <= octaveMax; octave++) {
    for (const note of NOTES) {
      keyboard.push({ note, octave, duration: DEFAULTS.defaultDuration });
    }
  }
  return keyboard;
}

/**
 * Filter the keyboard to only include notes in the selected scale.
 */
export function filterKeyboard(keyboard, selectedKey, selectedScale) {
  const intervals = INTERVALS[selectedScale];
  if (!intervals) return [];

  // Find the first occurrence of the key in the keyboard
  let index = keyboard.findIndex((k) => k.note === selectedKey);
  if (index === -1) return [];

  // Walk through intervals repeatedly across all available octaves.
  // After each pass, jump by the closing interval (12 - sum) to land
  // on the root note in the next octave before repeating.
  const intervalSum = intervals.reduce((a, b) => a + b, 0);
  const closingInterval = 12 - intervalSum;

  const filtered = [keyboard[index]];
  let pos = index;
  outer:
  while (true) {
    for (const interval of intervals) {
      pos += interval;
      if (pos >= keyboard.length) break outer;
      filtered.push(keyboard[pos]);
    }
    // Jump to root of next octave (skip if closing interval is 0,
    // meaning the scale already ends on the next root)
    if (closingInterval > 0) {
      pos += closingInterval;
      if (pos >= keyboard.length) break;
      filtered.push(keyboard[pos]);
    }
  }
  return filtered;
}

/**
 * Get available note durations based on toggle states.
 */
export function getNoteLengths({ quarter, eighth, sixteenth }) {
  const lengths = [];
  if (sixteenth) lengths.push(0.25);
  if (eighth) lengths.push(0.5);
  if (quarter) lengths.push(1);
  return lengths;
}

/**
 * Convert sharp notation to MIDI-compatible flat notation.
 */
export function convertToMIDINote(originalNote) {
  const sharpToFlat = {
    "A#": "Bb", "C#": "Db", "D#": "Eb", "F#": "Gb", "G#": "Ab",
  };
  return sharpToFlat[originalNote] || originalNote;
}

/**
 * Convert numeric duration to VexFlow text duration.
 */
export function durationToVexflow(duration) {
  if (duration === 0.25) return "16";
  if (duration === 0.5) return "8";
  return "q";
}

/**
 * Convert numeric duration to MIDI-writer-js duration string.
 */
export function durationToMIDI(duration) {
  if (duration === 0.25) return "16";
  if (duration === 0.5) return "8";
  return "4";
}

/**
 * Get the number of beats in a measure for the given time signature.
 */
export function getBeatsPerMeasure(timeSig) {
  const sig = TIME_SIGNATURES[timeSig];
  if (!sig) return 4;
  // For 6/8, the beat grouping is in dotted quarters (2 groups of 3 eighths)
  // but for note filling, we use total beat value relative to quarter notes
  if (timeSig === "6/8") return 3; // 3 quarter-note beats worth
  return sig.beatsPerMeasure;
}
