import { Renderer, Stave, StaveNote, Voice, Formatter, Accidental } from 'vexflow';
import { durationToVexflow } from './music-theory.js';

let renderer = null;
let context = null;
let noteElements = []; // Store SVG elements for playback highlighting

const STAVE_WIDTH = 420;
const STAVE_X_START = 10;
const STAVE_Y_START = 40;
const LINE_HEIGHT = 105;
const MEASURES_PER_LINE = 2;

// Sharp count for each major key name (negative = flats).
const KEY_SIG_SHARPS = {
  "C": 0,
  "G": 1, "D": 2, "A": 3, "E": 4, "B": 5, "F#": 6, "C#": 7,
  "F": -1, "Bb": -2, "Eb": -3, "Ab": -4, "Db": -5, "Gb": -6, "Cb": -7,
};

// Enharmonic respelling for keys that use flats (VexFlow lowercase names).
const SHARP_TO_FLAT = { "c#": "db", "d#": "eb", "f#": "gb", "g#": "ab", "a#": "bb" };

/**
 * Initialize the VexFlow renderer on the given container element.
 */
export function initRenderer(container) {
  renderer = new Renderer(container, Renderer.Backends.SVG);
  renderer.resize(900, 200);
  context = renderer.getContext();
  context.setFont('Arial', 10);
}

/**
 * Calculate and set the canvas height based on measure count.
 */
function resizeCanvas(measureCount) {
  const lines = Math.ceil(measureCount / MEASURES_PER_LINE);
  const height = STAVE_Y_START + lines * LINE_HEIGHT + 40;
  renderer.resize(900, height);
}

/**
 * Draw the melody notation on the staff.
 * @param {Array} notes - Array of { note, octave, duration, isRest }
 * @param {number} measureCount
 * @param {string} timeSig - e.g. "4/4"
 * @param {string} keySig  - VexFlow major key name, e.g. "G", "Bb". Defaults to "C".
 */
export function drawNotes(notes, measureCount, timeSig = "4/4", keySig = "C") {
  if (!renderer) return [];

  resizeCanvas(measureCount);
  context = renderer.getContext();
  context.clear();
  context.setFont('Arial', 10);

  noteElements = [];

  const sharps = KEY_SIG_SHARPS[keySig] ?? 0;
  const useFlats = sharps < 0;
  // Approximate pixel width of the key signature symbols.
  const keySigWidth = Math.abs(sharps) * 12;

  // Group notes into measures
  const beatsPerMeasure = timeSig === "6/8" ? 3 : parseInt(timeSig.split("/")[0]);
  const measures = [];
  let currentMeasure = [];
  let beatCount = 0;

  for (const note of notes) {
    currentMeasure.push(note);
    beatCount += note.duration;
    if (beatCount >= beatsPerMeasure - 0.001) {
      measures.push(currentMeasure);
      currentMeasure = [];
      beatCount = 0;
    }
  }
  if (currentMeasure.length > 0) {
    measures.push(currentMeasure);
  }

  let globalNoteIndex = 0;

  measures.forEach((measure, measureIndex) => {
    const line = Math.floor(measureIndex / MEASURES_PER_LINE);
    const posInLine = measureIndex % MEASURES_PER_LINE;
    const isFirstInLine = measureIndex === 0 || posInLine === 0;

    let x, y;
    if (measureIndex === 0) {
      x = STAVE_X_START;
      y = STAVE_Y_START;
    } else {
      x = posInLine === 0 ? STAVE_X_START : STAVE_X_START + STAVE_WIDTH + 15;
      y = STAVE_Y_START + line * LINE_HEIGHT;
    }

    const stave = new Stave(x, y, STAVE_WIDTH);
    if (measureIndex === 0) {
      stave.addClef('treble').addKeySignature(keySig).addTimeSignature(timeSig);
    } else if (isFirstInLine) {
      // Show key sig at the start of each new line (standard notation practice)
      stave.addKeySignature(keySig);
    }
    stave.setContext(context).draw();

    // Create VexFlow notes, respelling accidentals to match the key's convention
    const vfNotes = measure.map((n) => {
      const durText = durationToVexflow(n.duration);

      if (n.isRest) {
        return new StaveNote({ keys: ['b/4'], duration: durText + 'r' });
      }

      // n.note is already lowercase (e.g. "c#", "d"). Respell if key uses flats.
      const spelling = useFlats ? (SHARP_TO_FLAT[n.note] ?? n.note) : n.note;
      return new StaveNote({ keys: [`${spelling}/${n.octave}`], duration: durText });
    });

    // Create voice
    const voice = new Voice({ numBeats: beatsPerMeasure, beatValue: timeSig === "6/8" ? 8 : 4 })
      .setMode(Voice.Mode.SOFT)
      .addTickables(vfNotes);

    // Let VexFlow compute which accidentals to show given the key signature.
    // This handles sharps, flats, naturals (e.g. raised 7th in harmonic minor),
    // and courtesy accidentals automatically.
    Accidental.applyAccidentals([voice], keySig);

    // Formatter width: shrink by key-sig symbol space on staves that show one.
    const keySigOffset = isFirstInLine ? keySigWidth : 0;
    const formatWidth = measureIndex === 0
      ? STAVE_WIDTH - 120 - keySigOffset
      : STAVE_WIDTH - 60 - keySigOffset;

    new Formatter().joinVoices([voice]).format([voice], formatWidth);
    voice.draw(context, stave);

    vfNotes.forEach((vfNote) => {
      noteElements.push({
        element: vfNote.getSVGElement(),
        noteIndex: globalNoteIndex++,
      });
    });
  });

  return noteElements;
}

/**
 * Highlight a specific note by index. Pass -1 to clear all highlights.
 */
export function highlightNote(index) {
  noteElements.forEach(({ element, noteIndex }) => {
    if (!element) return;
    if (noteIndex === index) {
      element.classList.add('vf-note-highlight');
    } else {
      element.classList.remove('vf-note-highlight');
    }
  });
}
