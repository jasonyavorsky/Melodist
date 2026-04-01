import {
  generateKeyboard,
  filterKeyboard,
  getNoteLengths,
  convertToMIDINote,
  durationToMIDI,
  getBeatsPerMeasure,
} from './music-theory.js';

/**
 * Generate a random melody based on the given parameters.
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

  for (let m = 0; m < measureCount; m++) {
    let count = 0;
    let noteLengths = getNoteLengths({ quarter: quarterOn, eighth: eighthOn, sixteenth: sixteenthOn });

    // Clone to allow safe removal during measure filling
    let availableLengths = [...noteLengths];
    let qAllowed = quarterOn;
    let eighthAllowed = eighthOn;

    while (Math.round(count * 100) < Math.round(beatsPerMeasure * 100)) {
      const remaining = Math.round((beatsPerMeasure - count) * 100) / 100;

      // Remove note lengths that would overflow the measure
      availableLengths = availableLengths.filter((l) => l <= remaining + 0.001);
      if (availableLengths.length === 0) break;

      const duration = availableLengths[Math.floor(Math.random() * availableLengths.length)];

      // Decide if this should be a rest
      const isRest = restsOn && Math.random() < 0.15;

      if (isRest) {
        playNotes.push({ note: null, octave: null, duration, isRest: true });
        vexflowNotes.push({ note: "b", octave: 4, duration, isRest: true });
        midiNotes.push({ note: null, duration: durationToMIDI(duration), isRest: true });
      } else {
        const randomNote = { ...filteredKeyboard[Math.floor(Math.random() * filteredKeyboard.length)] };
        randomNote.duration = duration;

        playNotes.push({
          note: convertToMIDINote(randomNote.note),
          octave: randomNote.octave,
          duration: randomNote.duration,
          isRest: false,
        });

        vexflowNotes.push({
          note: randomNote.note.toLowerCase(),
          octave: randomNote.octave,
          duration: randomNote.duration,
          isRest: false,
        });

        midiNotes.push({
          note: randomNote.note + randomNote.octave,
          duration: durationToMIDI(randomNote.duration),
          isRest: false,
        });
      }

      count += duration;
    }
  }

  return { playNotes, vexflowNotes, midiNotes };
}
