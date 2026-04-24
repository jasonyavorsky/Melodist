# Melodist

Random melody generator with sheet music notation and audio playback. Generate melodies in various keys, scales, and time signatures, then play them back or export as MIDI. Can be used for sight reading practice, melody recognition, transcription practice, and similar.

Forked from [mwin96/Melodist](https://github.com/mwin96/Melodist).

Live preview: https://jasonyavorsky.github.io/Melodist/

## Features

- Generate melodies in 12 keys and 12 scales (all 7 modes of the major scale, plus Natural Minor, Harmonic Minor, Pentatonic Major, Blues, Whole Tone, and Chromatic)
- Progression Mode — generates melodies using diatonic chord progressions (randomly chosen per melody), chord-tone targeting on strong beats, half-cadences at phrase boundaries, tonic resolution at phrase ends, leap recovery, a global melodic arc, and rhythmic motif repetition with variation
- Intro cadence — optionally plays a II–V–I or IV–V–I chord progression before the melody at the selected key, scale, BPM, and time signature
- Real-time sheet music rendering with correct key signature and accidentals (VexFlow)
- Audio playback with piano samples via Tone.js
- MIDI file export
- Playback visualization (highlights current note)
- Multiple time signatures (4/4, 3/4, 6/8)
- Configurable note types (quarter, eighth, sixteenth) and rests
- Adjustable BPM with tap tempo
- Configurable octave range
- Loop mode — repeats the melody indefinitely (cadence plays once at the start)
- Hide Sheet Music — hides notation for transcription or ear training practice
- All settings persisted across page refreshes
- Melody history with save/load
- Keyboard shortcuts (Space, R, E, Escape)

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Build for Production

```bash
npm run build
npm start
```

The production server runs on http://localhost:3000.

## Tech Stack

- [Vite](https://vite.dev/) - Build tool
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [VexFlow](https://www.vexflow.com/) - Music notation rendering
- [Tone.js](https://tonejs.github.io/) - Audio playback
- [midi-writer-js](https://github.com/grimmdude/MidiWriterJS) - MIDI file generation
- [Express](https://expressjs.com/) - Production server

## Authors

### Original project
- **Michael Win** - [GitHub](https://github.com/mwin96)
- **Timothy Lam** - [GitHub](https://github.com/thl024)

### Additional features
- **Jason Yavorsky** - [GitHub](https://github.com/jasonyavorsky)

## License

MIT
