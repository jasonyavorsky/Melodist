import * as Tone from 'tone';
import { convertToMIDINote } from './music-theory.js';

let sampler = null;
let metronomeClick = null;
let scheduledEvents = [];
let isPlaying = false;
let metronomeEnabled = false;
let metronomeLoop = null;
let onNoteCallback = null;

/**
 * Initialize the Tone.js sampler with piano sounds.
 */
async function ensureSampler() {
  if (sampler) return sampler;

  sampler = new Tone.Sampler({
    urls: {
      A0: "A0.mp3", C1: "C1.mp3", "D#1": "Ds1.mp3", "F#1": "Fs1.mp3",
      A1: "A1.mp3", C2: "C2.mp3", "D#2": "Ds2.mp3", "F#2": "Fs2.mp3",
      A2: "A2.mp3", C3: "C3.mp3", "D#3": "Ds3.mp3", "F#3": "Fs3.mp3",
      A3: "A3.mp3", C4: "C4.mp3", "D#4": "Ds4.mp3", "F#4": "Fs4.mp3",
      A4: "A4.mp3", C5: "C5.mp3", "D#5": "Ds5.mp3", "F#5": "Fs5.mp3",
      A5: "A5.mp3", C6: "C6.mp3", "D#6": "Ds6.mp3", "F#6": "Fs6.mp3",
      A6: "A6.mp3", C7: "C7.mp3", "D#7": "Ds7.mp3", "F#7": "Fs7.mp3",
      A7: "A7.mp3", C8: "C8.mp3",
    },
    release: 1,
    baseUrl: "https://tonejs.github.io/audio/salamander/",
  }).toDestination();

  await Tone.loaded();
  return sampler;
}

/**
 * Initialize the metronome click synth.
 */
function ensureMetronome() {
  if (metronomeClick) return metronomeClick;
  metronomeClick = new Tone.MembraneSynth({
    pitchDecay: 0.008,
    octaves: 2,
    envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.05 },
    volume: -10,
  }).toDestination();
  return metronomeClick;
}

/**
 * Enable or disable the metronome.
 */
export function setMetronome(enabled) {
  metronomeEnabled = enabled;
}

export function getMetronomeEnabled() {
  return metronomeEnabled;
}

/**
 * Set a callback that fires when each note plays (for visualization).
 * Callback receives the note index.
 */
export function onNotePlayed(callback) {
  onNoteCallback = callback;
}

/**
 * Play a melody using Tone.js Transport for precise timing.
 * @param {Array} notes - Array of { note, octave, duration, isRest }
 * @param {number} bpm - Beats per minute
 * @param {number} beatsPerMeasure
 * @param {Array|null} cadenceChords - Optional array of 3 chord arrays [{note,octave}[]]
 */
export async function playMelody(notes, bpm, beatsPerMeasure = 4, cadenceChords = null, loop = false, chordMap = null, muteNotes = false) {
  await ensureSampler();
  await Tone.start();

  stopPlayback();

  const transport = Tone.getTransport();
  transport.cancel();
  transport.position = 0;
  transport.loop = false;
  transport.bpm.value = bpm;

  const secPerBeat = 60 / bpm;
  const measureSec = beatsPerMeasure * secPerBeat;
  let timeOffset = 0;
  scheduledEvents = [];

  // Schedule cadence once (before any loop iterations).
  if (cadenceChords && cadenceChords.length > 0) {
    const quarterSec = secPerBeat;
    const lastIdx = cadenceChords.length - 1;
    cadenceChords.forEach((chord, ci) => {
      const chordNotes = chord.map(n => `${convertToMIDINote(n.note)}${n.octave}`);
      const isLast = ci === lastIdx;
      const holdSec = (isLast && beatsPerMeasure >= 4) ? quarterSec * 2 : quarterSec;
      transport.schedule((time) => {
        if (onNoteCallback) Tone.getDraw().schedule(() => onNoteCallback(-2), time);
        sampler.triggerAttackRelease(chordNotes, holdSec * 0.92, time);
      }, timeOffset);
      timeOffset += holdSec;
    });
  }

  const cadenceSec = timeOffset;
  const melodyDuration = notes.reduce((sum, n) => sum + n.duration, 0) * secPerBeat;

  // Pre-schedule all iterations explicitly rather than using transport.loop.
  // This avoids a Tone.js v15 boundary issue where events scheduled at exactly
  // loopStart are dropped on the second and subsequent iterations.
  const numIterations = loop
    ? Math.ceil((30 * 60) / Math.max(melodyDuration, 0.1))
    : 1;

  for (let iter = 0; iter < numIterations; iter++) {
    const iterStart = cadenceSec + iter * melodyDuration;

    // Metronome clicks for this iteration
    if (metronomeEnabled) {
      ensureMetronome();
      for (let beat = 0; beat * secPerBeat < melodyDuration; beat++) {
        const isDownbeat = beat % beatsPerMeasure === 0;
        transport.schedule((time) => {
          metronomeClick.triggerAttackRelease(isDownbeat ? 'C5' : 'C4', '32n', time);
        }, iterStart + beat * secPerBeat);
      }
    }

    // Per-measure chord notes for this iteration
    if (chordMap && chordMap.length > 0) {
      chordMap.forEach((chord, m) => {
        const t = iterStart + m * measureSec;
        transport.schedule((time) => {
          chord.chordTones.forEach(({ note, octave }) => {
            sampler.triggerAttackRelease(
              `${convertToMIDINote(note)}${octave}`,
              secPerBeat * 1.8,
              time,
              0.35,
            );
          });
        }, t);
      });
    }

    // Melody notes for this iteration
    let melodyOffset = iterStart;
    notes.forEach((n, index) => {
      const durationInBeats = n.duration;
      const durationNotation = durationInBeats === 0.25 ? '16n' : durationInBeats === 0.5 ? '8n' : '4n';
      transport.schedule((time) => {
        if (onNoteCallback) {
          Tone.getDraw().schedule(() => onNoteCallback(index), time);
        }
        if (!muteNotes && !n.isRest && n.note && n.octave) {
          sampler.triggerAttackRelease(`${n.note}${n.octave}`, durationNotation, time);
        }
      }, melodyOffset);
      melodyOffset += durationInBeats * secPerBeat;
    });
  }

  if (!loop) {
    transport.schedule(() => {
      Tone.getDraw().schedule(() => {
        isPlaying = false;
        if (onNoteCallback) onNoteCallback(-1);
      });
      transport.stop();
    }, cadenceSec + melodyDuration);
  }

  isPlaying = true;
  transport.start();
}

/**
 * Stop any current playback.
 */
export function stopPlayback() {
  const t = Tone.getTransport();
  t.stop();
  t.cancel();
  t.loop = false;
  scheduledEvents = [];
  isPlaying = false;
  if (onNoteCallback) onNoteCallback(-1);
}


/**
 * Returns whether audio is currently playing.
 */
export function getIsPlaying() {
  return isPlaying;
}
