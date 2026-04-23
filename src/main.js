import './styles/main.css';
import { INTERVALS, NOTES, DEFAULTS, getKeySignature } from './music-theory.js';
import { generateMelody } from './melody-generator.js';
import { buildCadenceChords } from './cadence.js';
import { playMelody, stopPlayback, onNotePlayed, getIsPlaying, setMetronome } from './audio.js';
import { initRenderer, drawNotes, highlightNote } from './notation.js';
import { downloadMidi } from './midi-export.js';
import {
  showToast, initSlider, initToggle, createTapTempo,
  saveToHistory, getHistory,
} from './ui.js';

// --- Settings persistence ---
const SETTINGS_KEY = 'melodist-settings';

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(state));
}

function loadSettings() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); }
  catch { return {}; }
}

// --- State (defaults merged with any saved settings) ---
const _saved = loadSettings();
let state = {
  key: "C",
  scale: "Pentatonic Major",
  bpm: DEFAULTS.bpm,
  measureCount: DEFAULTS.measures,
  quarterOn: true,
  eighthOn: true,
  sixteenthOn: false,
  restsOn: false,
  octaveMin: 4,
  octaveMax: 5,
  timeSig: "4/4",
  progressionMode: true,
  metronomeOn: false,
  cadenceType: 'none',
  ..._saved,
};

let currentMelody = null;
const tapTempo = createTapTempo();

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  // Init VexFlow renderer
  initRenderer(document.getElementById('notation-container'));

  // Populate key select
  const keySelect = document.getElementById('key-select');
  NOTES.forEach((note) => {
    const opt = document.createElement('option');
    opt.value = note;
    opt.textContent = note;
    keySelect.appendChild(opt);
  });

  // Populate scale select
  const scaleSelect = document.getElementById('scale-select');
  Object.keys(INTERVALS).forEach((scale) => {
    const opt = document.createElement('option');
    opt.value = scale;
    opt.textContent = scale;
    scaleSelect.appendChild(opt);
  });

  // Populate time signature select
  const timeSigSelect = document.getElementById('timesig-select');
  ["4/4", "3/4", "6/8"].forEach((ts) => {
    const opt = document.createElement('option');
    opt.value = ts;
    opt.textContent = ts;
    timeSigSelect.appendChild(opt);
  });

  // Apply state (loaded or default) to all controls before wiring handlers
  keySelect.value = state.key;
  scaleSelect.value = state.scale;
  timeSigSelect.value = state.timeSig;
  document.getElementById('bpm-range').value = state.bpm;
  document.getElementById('measure-range').value = state.measureCount;
  document.getElementById('octave-min').value = state.octaveMin;
  document.getElementById('octave-max').value = state.octaveMax;
  document.getElementById('quarter-toggle').checked = state.quarterOn;
  document.getElementById('eighth-toggle').checked = state.eighthOn;
  document.getElementById('sixteenth-toggle').checked = state.sixteenthOn;
  document.getElementById('rests-toggle').checked = state.restsOn;
  document.getElementById('metronome-toggle').checked = state.metronomeOn;
  document.getElementById('progression-toggle').checked = state.progressionMode;
  document.getElementById('cadence-select').value = state.cadenceType;

  // Init sliders (reads current .value to show display label)
  const bpmSlider = initSlider('bpm-range', 'bpm-output');
  const measureSlider = initSlider('measure-range', 'measure-output');
  const octaveMinSlider = initSlider('octave-min', 'octave-min-output');
  const octaveMaxSlider = initSlider('octave-max', 'octave-max-output');

  // Slider change handlers
  bpmSlider.addEventListener('input', () => { state.bpm = parseInt(bpmSlider.value); });
  measureSlider.addEventListener('input', () => { state.measureCount = parseInt(measureSlider.value); });
  octaveMinSlider.addEventListener('input', () => {
    const val = parseInt(octaveMinSlider.value);
    if (val <= state.octaveMax) state.octaveMin = val;
    else { octaveMinSlider.value = state.octaveMin; document.getElementById('octave-min-output').textContent = state.octaveMin; }
  });
  octaveMaxSlider.addEventListener('input', () => {
    const val = parseInt(octaveMaxSlider.value);
    if (val >= state.octaveMin) state.octaveMax = val;
    else { octaveMaxSlider.value = state.octaveMax; document.getElementById('octave-max-output').textContent = state.octaveMax; }
  });

  // Select change handlers
  keySelect.addEventListener('change', () => { state.key = keySelect.value; });
  scaleSelect.addEventListener('change', () => { state.scale = scaleSelect.value; });
  timeSigSelect.addEventListener('change', () => { state.timeSig = timeSigSelect.value; });

  // Toggles
  initToggle('quarter-toggle', (v) => { state.quarterOn = v; });
  initToggle('eighth-toggle', (v) => { state.eighthOn = v; });
  initToggle('sixteenth-toggle', (v) => { state.sixteenthOn = v; });
  initToggle('rests-toggle', (v) => { state.restsOn = v; });
  initToggle('metronome-toggle', (v) => { state.metronomeOn = v; setMetronome(v); });
  initToggle('progression-toggle', (v) => { state.progressionMode = v; });
  document.getElementById('cadence-select').addEventListener('change', (e) => { state.cadenceType = e.target.value; });

  // Apply metronome state now that the audio module is ready
  setMetronome(state.metronomeOn);

  // Persist settings on any control change
  document.addEventListener('input', saveSettings);
  document.addEventListener('change', saveSettings);

  // Playback visualization
  onNotePlayed((index) => { highlightNote(index); });

  // Button handlers
  document.getElementById('btn-randomize').addEventListener('click', handleRandomize);
  document.getElementById('btn-play').addEventListener('click', handlePlay);
  document.getElementById('btn-stop').addEventListener('click', handleStop);
  document.getElementById('btn-export').addEventListener('click', handleExport);
  document.getElementById('btn-tap-tempo').addEventListener('click', handleTapTempo);

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Don't trigger when typing in inputs
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

    switch (e.code) {
      case 'Space':
        e.preventDefault();
        getIsPlaying() ? handleStop() : handlePlay();
        break;
      case 'KeyR':
        handleRandomize();
        break;
      case 'Escape':
        handleStop();
        break;
      case 'KeyE':
        handleExport();
        break;
    }
  });

  // Render history
  renderHistory();
});

// --- Handlers ---

function handleRandomize() {
  if (!state.key) {
    showToast('Please select a key');
    return;
  }
  if (!state.scale) {
    showToast('Please select a scale');
    return;
  }

  const noteLengths = [state.quarterOn, state.eighthOn, state.sixteenthOn];
  if (!noteLengths.some(Boolean)) {
    showToast('Please enable at least one note type');
    return;
  }

  stopPlayback();

  currentMelody = generateMelody({
    key: state.key,
    scale: state.scale,
    measureCount: state.measureCount,
    quarterOn: state.quarterOn,
    eighthOn: state.eighthOn,
    sixteenthOn: state.sixteenthOn,
    restsOn: state.restsOn,
    octaveMin: state.octaveMin,
    octaveMax: state.octaveMax,
    timeSig: state.timeSig,
    logical: state.progressionMode,
  });

  if (!currentMelody) {
    showToast('Could not generate melody — check your settings');
    return;
  }

  // Hide placeholder
  const placeholder = document.getElementById('notation-placeholder');
  if (placeholder) placeholder.style.display = 'none';

  drawNotes(currentMelody.vexflowNotes, state.measureCount, state.timeSig, getKeySignature(state.key, state.scale));

  // Save to history
  saveToHistory({
    key: state.key,
    scale: state.scale,
    bpm: state.bpm,
    measureCount: state.measureCount,
    timeSig: state.timeSig,
    melody: currentMelody,
    settings: { ...state },
  });
  renderHistory();
}

function handlePlay() {
  if (!currentMelody || currentMelody.playNotes.length === 0) {
    showToast('Generate a melody first by clicking Randomize');
    return;
  }
  const beatsPerMeasure = state.timeSig === "6/8" ? 3 : parseInt(state.timeSig.split("/")[0]);
  const cadenceChords = state.cadenceType !== 'none'
    ? buildCadenceChords(state.key, state.scale, state.cadenceType)
    : null;
  playMelody(currentMelody.playNotes, state.bpm, beatsPerMeasure, cadenceChords);
}

function handleStop() {
  stopPlayback();
}

function handleExport() {
  if (!currentMelody || currentMelody.midiNotes.length === 0) {
    showToast('Generate a melody first');
    return;
  }
  downloadMidi(currentMelody.midiNotes, state.bpm);
  showToast('MIDI file exported!');
}

function handleTapTempo() {
  const bpm = tapTempo.tap();
  if (bpm) {
    const clamped = Math.max(DEFAULTS.minBPM, Math.min(DEFAULTS.maxBPM, bpm));
    state.bpm = clamped;
    const slider = document.getElementById('bpm-range');
    slider.value = clamped;
    document.getElementById('bpm-output').textContent = clamped;
    saveSettings();
  }
}

function loadFromHistory(entry) {
  state = { ...entry.settings };
  currentMelody = entry.melody;

  // Update UI to match loaded state
  document.getElementById('key-select').value = state.key;
  document.getElementById('scale-select').value = state.scale;
  document.getElementById('timesig-select').value = state.timeSig;
  document.getElementById('bpm-range').value = state.bpm;
  document.getElementById('bpm-output').textContent = state.bpm;
  document.getElementById('measure-range').value = state.measureCount;
  document.getElementById('measure-output').textContent = state.measureCount;
  document.getElementById('octave-min').value = state.octaveMin;
  document.getElementById('octave-min-output').textContent = state.octaveMin;
  document.getElementById('octave-max').value = state.octaveMax;
  document.getElementById('octave-max-output').textContent = state.octaveMax;

  // Update toggles
  document.getElementById('quarter-toggle').checked = state.quarterOn;
  document.getElementById('eighth-toggle').checked = state.eighthOn;
  document.getElementById('sixteenth-toggle').checked = state.sixteenthOn;
  document.getElementById('rests-toggle').checked = state.restsOn;
  document.getElementById('progression-toggle').checked = state.progressionMode ?? true;
  document.getElementById('cadence-select').value = state.cadenceType ?? 'none';

  document.getElementById('metronome-toggle').checked = state.metronomeOn ?? false;
  setMetronome(state.metronomeOn ?? false);

  const placeholder = document.getElementById('notation-placeholder');
  if (placeholder) placeholder.style.display = 'none';

  drawNotes(currentMelody.vexflowNotes, state.measureCount, state.timeSig, getKeySignature(state.key, state.scale));
  saveSettings();
  showToast('Melody loaded from history');
}

function renderHistory() {
  const container = document.getElementById('history-list');
  if (!container) return;

  const history = getHistory();
  container.innerHTML = '';

  if (history.length === 0) {
    container.innerHTML = '<p class="text-sm text-slate-400 italic">No melodies generated yet</p>';
    return;
  }

  history.forEach((entry) => {
    const div = document.createElement('div');
    div.className = 'history-item';

    const time = new Date(entry.timestamp);
    const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = time.toLocaleDateString([], { month: 'short', day: 'numeric' });

    div.innerHTML = `
      <div class="flex justify-between items-center">
        <span class="font-medium text-slate-700">${entry.key} ${entry.scale}</span>
        <span class="text-xs text-slate-400">${dateStr} ${timeStr}</span>
      </div>
      <div class="text-xs text-slate-400 mt-0.5">${entry.bpm} BPM &middot; ${entry.measureCount} measures &middot; ${entry.timeSig}</div>
    `;

    div.addEventListener('click', () => loadFromHistory(entry));
    container.appendChild(div);
  });
}
