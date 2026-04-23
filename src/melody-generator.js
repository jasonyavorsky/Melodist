import {
  generateKeyboard,
  filterKeyboard,
  getNoteLengths,
  convertToMIDINote,
  durationToMIDI,
  getBeatsPerMeasure,
} from './music-theory.js';

/**
 * Weighted random note pick for logical mode.
 * Prefers scale-adjacent notes (stepwise motion) with directional momentum.
 * On the final measure, biases toward tonic notes (indices divisible by scaleLength).
 */
function pickLogicalNote(notes, prevIndex, momentum, isLastMeasure, scaleLength) {
  const weights = notes.map((_, i) => {
    let w;
    if (prevIndex === null) {
      // First note: bias toward middle of range for a natural start
      const mid = notes.length / 2;
      w = 1 + Math.max(0, 1 - Math.abs(i - mid) / mid);
    } else {
      const dist = i - prevIndex;
      const absDist = Math.abs(dist);
      if (absDist === 0) w = 0.2;
      else if (absDist === 1) w = 5;
      else if (absDist === 2) w = 3;
      else if (absDist === 3) w = 1.2;
      else if (absDist === 4) w = 0.5;
      else w = Math.max(0.1, 0.3 / (absDist - 3));

      // Directional momentum: slightly favor continuing in the same direction
      if (momentum !== 0 && dist !== 0 && Math.sign(dist) === momentum) {
        w *= 1.4;
      }
    }

    // On the last measure, pull toward tonic notes (root of each octave)
    if (isLastMeasure && scaleLength > 0 && i % scaleLength === 0) {
      w *= 2.5;
    }

    return w;
  });

  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

/**
 * Generate a melody based on the given parameters.
 * When logical=true, uses stepwise weighted motion instead of pure random.
 * Returns { playNotes, vexflowNotes, midiNotes }
 */
export function generateMelody({
  key,
  scale,
  measureCount,
  quarterOn,
  eighthOn,
  sixteenthOn,
  restsOn = false,
  octaveMin = 4,
  octaveMax = 5,
  timeSig = "4/4",
  logical = false,
}) {
  const keyboard = generateKeyboard(octaveMin, octaveMax);
  const filteredKeyboard = filterKeyboard(keyboard, key, scale);

  if (filteredKeyboard.length === 0) {
    return null;
  }

  const beatsPerMeasure = getBeatsPerMeasure(timeSig);
  const playNotes = [];
  const vexflowNotes = [];
  const midiNotes = [];

  // Detect scale length (notes per octave) by finding first repeat of root note name
  let scaleLength = 0;
  if (logical && filteredKeyboard.length > 1) {
    const rootNote = filteredKeyboard[0].note;
    for (let i = 1; i < filteredKeyboard.length; i++) {
      if (filteredKeyboard[i].note === rootNote) { scaleLength = i; break; }
    }
  }

  let prevIndex = null;
  let momentum = 0; // -1 descending, 0 neutral, 1 ascending

  for (let m = 0; m < measureCount; m++) {
    let count = 0;
    const isLastMeasure = logical && m === measureCount - 1;
    const noteLengths = getNoteLengths({ quarter: quarterOn, eighth: eighthOn, sixteenth: sixteenthOn });
    let availableLengths = [...noteLengths];

    while (Math.round(count * 100) < Math.round(beatsPerMeasure * 100)) {
      const remaining = Math.round((beatsPerMeasure - count) * 100) / 100;

      availableLengths = availableLengths.filter((l) => l <= remaining + 0.001);
      if (availableLengths.length === 0) break;

      const duration = availableLengths[Math.floor(Math.random() * availableLengths.length)];
      const isRest = restsOn && Math.random() < 0.15;

      if (isRest) {
        playNotes.push({ note: null, octave: null, duration, isRest: true });
        vexflowNotes.push({ note: "b", octave: 4, duration, isRest: true });
        midiNotes.push({ note: null, duration: durationToMIDI(duration), isRest: true });
      } else {
        let noteIndex;
        if (logical) {
          noteIndex = pickLogicalNote(filteredKeyboard, prevIndex, momentum, isLastMeasure, scaleLength);
          momentum = prevIndex === null ? 0 : Math.sign(noteIndex - prevIndex);
          prevIndex = noteIndex;
        } else {
          noteIndex = Math.floor(Math.random() * filteredKeyboard.length);
        }

        const pickedNote = { ...filteredKeyboard[noteIndex], duration };

        playNotes.push({
          note: convertToMIDINote(pickedNote.note),
          octave: pickedNote.octave,
          duration: pickedNote.duration,
          isRest: false,
        });

        vexflowNotes.push({
          note: pickedNote.note.toLowerCase(),
          octave: pickedNote.octave,
          duration: pickedNote.duration,
          isRest: false,
        });

        midiNotes.push({
          note: pickedNote.note + pickedNote.octave,
          duration: durationToMIDI(pickedNote.duration),
          isRest: false,
        });
      }

      count += duration;
    }
  }

  return { playNotes, vexflowNotes, midiNotes };
}
