import MidiWriter from 'midi-writer-js';

/**
 * Generate a MIDI data URI from the given notes array.
 * @param {Array} notes - Array of { note, duration, isRest }
 * @param {number} bpm
 * @returns {string} data URI for the MIDI file
 */
export function generateMidiDataUri(notes, bpm) {
  const track = new MidiWriter.Track();
  track.setTempo(bpm);

  for (const n of notes) {
    if (n.isRest) {
      track.addEvent(new MidiWriter.NoteEvent({
        pitch: ['C4'],
        duration: n.duration,
        velocity: 0,
      }));
    } else {
      track.addEvent(new MidiWriter.NoteEvent({
        pitch: [n.note],
        duration: n.duration,
      }));
    }
  }

  const writer = new MidiWriter.Writer([track]);
  return writer.dataUri();
}

/**
 * Trigger a MIDI file download.
 */
export function downloadMidi(notes, bpm, filename = 'melodist-melody.mid') {
  const dataUri = generateMidiDataUri(notes, bpm);
  const link = document.createElement('a');
  link.href = dataUri;
  link.download = filename;
  link.click();
}
