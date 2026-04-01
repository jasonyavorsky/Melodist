/**
 * Show a toast notification.
 */
export function showToast(message, duration = 2500) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toast-out 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * Initialize a range slider with live output display.
 */
export function initSlider(sliderId, outputId) {
  const slider = document.getElementById(sliderId);
  const output = document.getElementById(outputId);
  if (!slider || !output) return;

  output.textContent = slider.value;
  slider.addEventListener('input', () => {
    output.textContent = slider.value;
  });

  return slider;
}

/**
 * Initialize a toggle switch with callback.
 */
export function initToggle(toggleId, onChange) {
  const input = document.getElementById(toggleId);
  if (!input) return;

  input.addEventListener('change', () => {
    onChange(input.checked);
  });

  return input;
}

/**
 * Tap tempo tracker. Call tap() on each tap, returns current BPM estimate.
 */
export function createTapTempo() {
  const taps = [];
  const MAX_TAPS = 4;
  const TIMEOUT = 2000;

  return {
    tap() {
      const now = Date.now();
      // Reset if too long since last tap
      if (taps.length > 0 && now - taps[taps.length - 1] > TIMEOUT) {
        taps.length = 0;
      }
      taps.push(now);
      if (taps.length > MAX_TAPS) taps.shift();
      if (taps.length < 2) return null;

      const intervals = [];
      for (let i = 1; i < taps.length; i++) {
        intervals.push(taps[i] - taps[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      return Math.round(60000 / avgInterval);
    },
    reset() {
      taps.length = 0;
    },
  };
}

// History management using localStorage
const HISTORY_KEY = 'melodist_history';
const MAX_HISTORY = 20;

export function saveToHistory(melody) {
  const history = getHistory();
  history.unshift({
    ...melody,
    timestamp: Date.now(),
    id: crypto.randomUUID(),
  });
  if (history.length > MAX_HISTORY) history.pop();
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  return history;
}

export function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

export function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
}
