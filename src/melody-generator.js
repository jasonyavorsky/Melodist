import {
  generateKeyboard,
  filterKeyboard,
  getNoteLengths,
  convertToMIDINote,
  durationToMIDI,
  getBeatsPerMeasure,
} from './music-theory.js';

// Chord progressions as scale-degree indices (0=I, 1=ii, 2=iii, 3=IV, 4=V, 5=vi, 6=vii°)
const PROGRESSIONS_7 = [
  [0, 4, 0, 4],   // I  V  I  V
  [0, 3, 4, 0],   // I  IV V  I
  [0, 5, 3, 4],   // I  vi IV V
  [0, 1, 4, 0],   // I  ii V  I
  [0, 3, 0, 4],   // I  IV I  V
];

const PROGRESSIONS_5 = [
  [0, 2, 3, 0],
  [0, 3, 2, 0],
];

function getChordTones(degree, scaleLength) {
  if (scaleLength < 5) return [];
  return [
    degree % scaleLength,
    (degree + 2) % scaleLength,
    (degree + 4) % scaleLength,
  ];
}

function applyRhythmicVariation(seed, noteLengths, variationChance = 0.3) {
  return seed.map(d => {
    if (Math.random() < variationChance) {
      const shorter = noteLengths.filter(l => l < d);
      if (shorter.length > 0) return shorter[Math.floor(Math.random() * shorter.length)];
    }
    return d;
  });
}

function pickProgressionNote(notes, {
  prevIndex,
  prevPrevIndex,
  momentum,
  scaleLength,
  chordTones,
  isPhraseBoundary,
  isPhraseEnd,
  isLastMeasure,
  isStrongBeat,
  notesSoFar,
  totalNotesEstimate,
}) {
  const halfwayPoint = totalNotesEstimate / 2;

  const weights = notes.map((_, i) => {
    let w;

    // Layer 1: Stepwise distance + momentum
    if (prevIndex === null) {
      const mid = notes.length / 2;
      w = 1 + Math.max(0, 1 - Math.abs(i - mid) / mid);
    } else {
      const dist = i - prevIndex;
      const absDist = Math.abs(dist);
      if (absDist === 0)      w = 0.2;
      else if (absDist === 1) w = 5;
      else if (absDist === 2) w = 3;
      else if (absDist === 3) w = 1.2;
      else if (absDist === 4) w = 0.5;
      else                    w = Math.max(0.1, 0.3 / (absDist - 3));

      if (momentum !== 0 && dist !== 0 && Math.sign(dist) === momentum) w *= 1.4;
    }

    // Layer 2: Chord-tone targeting
    if (chordTones && chordTones.length > 0) {
      const scaleDeg = i % scaleLength;
      const isChordTone = chordTones.includes(scaleDeg);

      if (isPhraseEnd) {
        w *= isChordTone ? 5.0 : 0.2;
      } else if (isPhraseBoundary) {
        w *= isChordTone ? 3.0 : 1.0;
      } else if (isStrongBeat) {
        w *= isChordTone ? 2.5 : 0.8;
      } else {
        w *= isChordTone ? 1.3 : 1.0;
      }
    } else if (isLastMeasure && scaleLength > 0 && i % scaleLength === 0) {
      // Fallback tonic bias for scales without chord targeting
      w *= 2.5;
    }

    // Layer 3: Leap recovery
    if (prevIndex !== null && prevPrevIndex !== null) {
      const prevInterval = prevIndex - prevPrevIndex;
      const absPrevInterval = Math.abs(prevInterval);
      if (absPrevInterval >= 3) {
        const recoveryDir = -Math.sign(prevInterval);
        const moveDir = Math.sign(i - prevIndex);
        if (absPrevInterval >= 5) {
          if (moveDir === recoveryDir) w *= 3.5;
          else if (moveDir !== 0) w *= 0.2;
        } else {
          if (moveDir === recoveryDir) w *= 3.0;
          else if (moveDir !== 0) w *= 0.3;
        }
      }
    }

    // Layer 4: Melodic arc (ascend first half, descend second half)
    if (prevIndex !== null && totalNotesEstimate > 0) {
      const targetDir = notesSoFar < halfwayPoint ? 1 : -1;
      const arcBias = 1 + 0.5 * targetDir * (i - prevIndex) / notes.length;
      w *= Math.max(0.1, arcBias);
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

  if (filteredKeyboard.length === 0) return null;

  const beatsPerMeasure = getBeatsPerMeasure(timeSig);
  const noteLengths = getNoteLengths({ quarter: quarterOn, eighth: eighthOn, sixteenth: sixteenthOn });
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

  // Choose one chord progression for the entire melody
  let progression = null;
  if (logical && scaleLength >= 7) {
    progression = PROGRESSIONS_7[Math.floor(Math.random() * PROGRESSIONS_7.length)];
  } else if (logical && scaleLength === 5) {
    progression = PROGRESSIONS_5[Math.floor(Math.random() * PROGRESSIONS_5.length)];
  }

  // Pre-compute total note estimate for melodic arc
  const avgDuration = noteLengths.reduce((a, b) => a + b, 0) / noteLengths.length;
  const totalNotesEstimate = Math.max(1, Math.round(
    (measureCount * beatsPerMeasure) / avgDuration * (restsOn ? 0.85 : 1)
  ));

  const minDuration = Math.min(...noteLengths);

  let prevIndex = null;
  let prevPrevIndex = null;
  let momentum = 0;
  let notesSoFar = 0;

  // Layer 5: Rhythmic seed state
  let rhythmicSeed = [];
  let activeRhythm = null;
  let rhythmicSeedPos = 0;

  for (let m = 0; m < measureCount; m++) {
    const isLastMeasure = m === measureCount - 1;
    const measureInPhrase = m % 2;

    // Layer 5: reset/apply rhythmic seed per phrase
    if (logical) {
      if (measureInPhrase === 0) {
        rhythmicSeed = [];
        activeRhythm = null;
        rhythmicSeedPos = 0;
      } else if (rhythmicSeed.length > 0) {
        activeRhythm = applyRhythmicVariation(rhythmicSeed, noteLengths);
        rhythmicSeedPos = 0;
      }
    }

    // Chord tones for this measure
    const tonicChordTones = scaleLength >= 5 ? getChordTones(0, scaleLength) : null;
    const vChordTones = scaleLength >= 5 ? getChordTones(4, scaleLength) : null;
    let measureChordTones = null;
    if (logical && progression) {
      measureChordTones = getChordTones(progression[m % progression.length], scaleLength);
    }

    let count = 0;

    while (Math.round(count * 100) < Math.round(beatsPerMeasure * 100)) {
      const remaining = Math.round((beatsPerMeasure - count) * 100) / 100;

      // Prefer rhythmic seed duration; fall back to random
      let duration = null;
      if (logical && activeRhythm && rhythmicSeedPos < activeRhythm.length) {
        const seedDur = activeRhythm[rhythmicSeedPos];
        if (seedDur <= remaining + 0.001) {
          duration = seedDur;
          rhythmicSeedPos++;
        }
      }
      if (duration === null) {
        const available = noteLengths.filter(l => l <= remaining + 0.001);
        if (available.length === 0) break;
        duration = available[Math.floor(Math.random() * available.length)];
      }

      const isRest = restsOn && Math.random() < 0.15;

      if (isRest) {
        playNotes.push({ note: null, octave: null, duration, isRest: true });
        vexflowNotes.push({ note: "b", octave: 4, duration, isRest: true });
        midiNotes.push({ note: null, duration: durationToMIDI(duration), isRest: true });
      } else {
        let noteIndex;
        if (logical) {
          const beatInMeasure = Math.floor(count);
          const isStrongBeat = timeSig === '4/4'
            ? (beatInMeasure === 0 || beatInMeasure === 2)
            : beatInMeasure === 0;
          const isLastNote = remaining <= minDuration + 0.001;
          const isPhraseEnd = isLastNote && (isLastMeasure || measureInPhrase === 1);
          const isPhraseBoundary = isLastNote && measureInPhrase === 0 && !isLastMeasure;

          const chordTones = isPhraseEnd ? tonicChordTones
            : isPhraseBoundary ? vChordTones
            : measureChordTones;

          noteIndex = pickProgressionNote(filteredKeyboard, {
            prevIndex,
            prevPrevIndex,
            momentum,
            scaleLength,
            chordTones,
            isPhraseBoundary,
            isPhraseEnd,
            isLastMeasure,
            isStrongBeat,
            notesSoFar,
            totalNotesEstimate,
          });

          prevPrevIndex = prevIndex;
          momentum = prevIndex === null ? 0 : Math.sign(noteIndex - prevIndex);
          prevIndex = noteIndex;
          notesSoFar++;
        } else {
          noteIndex = Math.floor(Math.random() * filteredKeyboard.length);
        }

        const pickedNote = { ...filteredKeyboard[noteIndex], duration };
        playNotes.push({ note: convertToMIDINote(pickedNote.note), octave: pickedNote.octave, duration, isRest: false });
        vexflowNotes.push({ note: pickedNote.note.toLowerCase(), octave: pickedNote.octave, duration, isRest: false });
        midiNotes.push({ note: pickedNote.note + pickedNote.octave, duration: durationToMIDI(duration), isRest: false });
      }

      // Record duration for rhythmic seed (measure 0 of each phrase)
      if (logical && measureInPhrase === 0) rhythmicSeed.push(duration);

      count += duration;
    }
  }

  return { playNotes, vexflowNotes, midiNotes };
}
