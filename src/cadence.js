import { NOTES, INTERVALS } from './music-theory.js';

// Semitone intervals for each chord quality: root + 3rd + 5th + octave doubling
const CHORD_INTERVALS = {
  major:      [0, 4, 7, 12],
  minor:      [0, 3, 7, 12],
  dominant7:  [0, 4, 7, 10],
  diminished: [0, 3, 6, 9],
  augmented:  [0, 4, 8, 12],
};

// Diatonic chord quality at each scale degree (0 = I, 1 = II, ...) for heptatonic scales
const SCALE_CHORD_QUALITIES = {
  'Major':          ['major', 'minor', 'minor', 'major', 'dominant7', 'minor', 'diminished'],
  'Natural Minor':  ['minor', 'diminished', 'major', 'minor', 'minor', 'major', 'major'],
  'Harmonic Minor': ['minor', 'diminished', 'augmented', 'minor', 'dominant7', 'major', 'diminished'],
  'Dorian':         ['minor', 'minor', 'major', 'major', 'minor', 'diminished', 'major'],
  'Lydian':         ['major', 'major', 'minor', 'diminished', 'major', 'minor', 'minor'],
  'Mixolydian':     ['major', 'minor', 'diminished', 'major', 'minor', 'minor', 'major'],
  'Phrygian':       ['minor', 'major', 'major', 'minor', 'diminished', 'major', 'minor'],
  'Locrian':        ['diminished', 'major', 'minor', 'minor', 'diminished', 'major', 'minor'],
};

// For non-heptatonic scales, derive I/IV/V quality from overall character
const SCALE_CHARACTER = {
  'Pentatonic Major': 'major',
  'Blues':            'minor',
  'Whole Tone':       'major',
  'Chromatic':        'major',
};

// Get cumulative semitone offsets for each scale degree from root
function getScaleDegreeOffsets(scale) {
  const intervals = INTERVALS[scale];
  if (!intervals) return [0, 2, 4, 5, 7, 9, 11];
  const offsets = [0];
  let pos = 0;
  for (const interval of intervals) {
    pos += interval;
    if (pos < 12) offsets.push(pos);
  }
  return offsets;
}

// Build a chord given root semitone (0–11), chord quality string, and base octave
function buildChord(rootSemitone, quality, baseOctave) {
  const intervals = CHORD_INTERVALS[quality] || CHORD_INTERVALS.major;
  return intervals.map(interval => {
    const abs = rootSemitone + interval;
    return { note: NOTES[abs % 12], octave: baseOctave + Math.floor(abs / 12) };
  });
}

/**
 * Build three cadence chords for the given key/scale/type.
 * Returns an array of 3 chord arrays: each is [{note, octave}, ...].
 * cadenceType: '2-5-1' or '1-4-5'
 */
export function buildCadenceChords(key, scale, cadenceType) {
  const keyIndex = NOTES.indexOf(key);
  if (keyIndex === -1) return [];

  const degreeOffsets = getScaleDegreeOffsets(scale);
  const qualities = SCALE_CHORD_QUALITIES[scale];

  // Standard chromatic fallback for scales with fewer than 7 degrees
  const fallbackOffsets = [0, 2, 4, 5, 7, 9, 11];

  const degreeAt = (i) => degreeOffsets[i] ?? fallbackOffsets[i] ?? (i * 2 % 12);

  const chordQualityAt = (i) => {
    if (qualities) return qualities[i] || 'major';
    const character = SCALE_CHARACTER[scale] || 'major';
    // In minor-character scales, I and IV are minor; V stays major (dominant function)
    if (character === 'minor') {
      if (i === 0 || i === 3) return 'minor';
      if (i === 4) return 'major'; // V stays major for strong cadence
      if (i === 1) return 'diminished';
    }
    return 'major';
  };

  // Degree indices: II=1, IV=3, V=4, I=0 (all 0-based)
  const progression = cadenceType === '2-5-1' ? [1, 4, 0] : [3, 4, 0];
  const baseOctave = 3;

  return progression.map(degIdx => {
    const semitoneOffset = degreeAt(degIdx);
    const rootSemitone = (keyIndex + semitoneOffset) % 12;
    const quality = chordQualityAt(degIdx);
    return buildChord(rootSemitone, quality, baseOctave);
  });
}
