# Melodist

Random melody generator with sheet music notation and audio playback. Generate melodies in various keys, scales, and time signatures, then play them back or export as MIDI.

## Features

- Generate random melodies in 12 keys and 10 scales (Major, Minor, Dorian, Blues, and more)
- Real-time sheet music rendering with VexFlow
- Audio playback with piano samples via Tone.js
- MIDI file export
- Playback visualization (highlights current note)
- Multiple time signatures (4/4, 3/4, 6/8)
- Configurable note types (quarter, eighth, sixteenth) and rests
- Adjustable BPM with tap tempo
- Configurable octave range
- Melody history with save/load (localStorage)
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

- **Michael Win** - [GitHub](https://github.com/mwin96)
- **Timothy Lam** - [GitHub](https://github.com/thl024)

## License

MIT
