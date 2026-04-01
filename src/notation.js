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
 * @param {string} timeSig - Time signature string (e.g., "4/4")
 * @returns {Array} noteElements - SVG elements for each note (for highlighting)
 */
export function drawNotes(notes, measureCount, timeSig = "4/4") {
  if (!renderer) return [];

  resizeCanvas(measureCount);
  context = renderer.getContext();
  context.clear();
  context.setFont('Arial', 10);

  noteElements = [];

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

    let x, y;
    if (measureIndex === 0) {
      x = STAVE_X_START;
      y = STAVE_Y_START;
    } else {
      // First stave in a line is wider to account for the clef on the first stave
      x = posInLine === 0 ? STAVE_X_START : STAVE_X_START + STAVE_WIDTH + 15;
      y = STAVE_Y_START + line * LINE_HEIGHT;
    }

    const stave = new Stave(x, y, STAVE_WIDTH);
    if (measureIndex === 0) {
      stave.addClef('treble').addTimeSignature(timeSig);
    }
    stave.setContext(context).draw();

    // Create VexFlow notes
    const vfNotes = measure.map((n) => {
      const durText = durationToVexflow(n.duration);

      if (n.isRest) {
        return new StaveNote({
          keys: ['b/4'],
          duration: durText + 'r',
        });
      }

      const key = `${n.note}/${n.octave}`;
      const staveNote = new StaveNote({
        keys: [key],
        duration: durText,
      });

      // Add accidental if note has a sharp
      if (n.note.length > 1 && n.note.includes('#')) {
        staveNote.addModifier(new Accidental('#'), 0);
      }

      return staveNote;
    });

    // Create voice and format
    const voice = new Voice({ numBeats: beatsPerMeasure, beatValue: timeSig === "6/8" ? 8 : 4 })
      .setMode(Voice.Mode.SOFT)
      .addTickables(vfNotes);

    // Give the formatter less width for the first measure (clef + time sig take space)
    // and leave padding so notes don't touch the barline
    const formatWidth = measureIndex === 0 ? STAVE_WIDTH - 120 : STAVE_WIDTH - 60;
    new Formatter().joinVoices([voice]).format([voice], formatWidth);
    voice.draw(context, stave);

    // Store note SVG elements for playback highlighting
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
