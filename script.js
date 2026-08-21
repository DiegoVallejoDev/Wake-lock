(function () {
  'use strict';

  const state = {
    wakeLock: null,
    wakeLockWanted: false,
    activeWindows: new Set(),
    zIndexCounter: 10,
    isDragging: false,
    currentWindow: null,
    dragOffset: { x: 0, y: 0 },
    timer: { interval: null, remaining: 0, total: 0, wakeLock: null },
    calculator: { display: '' },
  };

  const windows = {
    'wake-Lock': { name: 'Wake Lock', default: { top: 40, left: 40 } },
    calculator: { name: 'Calculator', default: { top: 40, left: 360 } },
    notepad: { name: 'Notepad', default: { top: 250, left: 40 } },
    timer: { name: 'Timer', default: { top: 250, left: 360 } },
  };

  function $(sel) {
    return document.querySelector(sel);
  }

  function $$(sel) {
    return document.querySelectorAll(sel);
  }

  // --- Wake Lock ---

  function updateWakeStatus(message) {
    const el = $('#status');
    if (el) el.textContent = `Status: ${message}`;
  }

  function updateWakeIndicator(active) {
    const el = $('#wake-indicator');
    if (el) el.classList.toggle('active', active);
  }

  function updateWakeButton(active) {
    const btn = $('#wake-lock-btn');
    if (btn) btn.textContent = active ? 'Release Wake Lock' : 'Enable Wake Lock';
  }

  async function requestWakeLock() {
    if (!('wakeLock' in navigator)) {
      updateWakeStatus('Wake Lock API not supported');
      return;
    }
    if (state.wakeLock && !state.wakeLock.released) return;
    try {
      state.wakeLock = await navigator.wakeLock.request('screen');
      state.wakeLockWanted = true;
      updateWakeStatus('Wake Lock is active');
      updateWakeIndicator(true);
      updateWakeButton(true);

      state.wakeLock.addEventListener('release', () => {
        updateWakeStatus('Wake Lock was released');
        updateWakeIndicator(false);
        updateWakeButton(false);
      });
    } catch (err) {
      updateWakeStatus(`Error - ${err.message}`);
    }
  }

  function releaseWakeLock() {
    if (state.wakeLock && !state.wakeLock.released) {
      state.wakeLock.release();
    }
    state.wakeLock = null;
    state.wakeLockWanted = false;
    updateWakeIndicator(false);
    updateWakeButton(false);
  }

  function toggleWakeLock() {
    if (state.wakeLock && !state.wakeLock.released) {
      releaseWakeLock();
    } else {
      requestWakeLock();
    }
  }

  // --- Window Management ---

  function focusWindow(id) {
    state.zIndexCounter++;
    const win = $(`#${id}`);
    if (win) win.style.zIndex = state.zIndexCounter;

    $$('.window').forEach((w) => {
      const tb = w.querySelector('.title-bar');
      if (tb) tb.classList.toggle('inactive', w.id !== id);
    });
  }

  function showWindow(id) {
    const win = $(`#${id}`);
    if (!win || !windows[id]) return;

    win.classList.remove('hidden');
    state.activeWindows.add(id);

    if (!win.dataset.positioned) {
      const cfg = windows[id].default;
      const offset = Array.from(state.activeWindows).indexOf(id) * 24;
      win.style.left = `${cfg.left + offset}px`;
      win.style.top = `${cfg.top + offset}px`;
      win.dataset.positioned = 'true';
    }

    focusWindow(id);
    updateTaskbar();
  }

  function closeWindow(id) {
    const win = $(`#${id}`);
    if (!win) return;

    win.classList.add('hidden');
    state.activeWindows.delete(id);
    if (id === 'timer') pauseTimer();
    updateTaskbar();
  }

  function minimizeWindow(id) {
    const win = $(`#${id}`);
    if (win) win.classList.add('hidden');
    updateTaskbar();
  }

  function maximizeWindow(id) {
    const win = $(`#${id}`);
    if (!win) return;

    win.classList.remove('hidden');
    const maxBtn = win.querySelector('[data-action="maximize"]');

    if (win.classList.contains('maximized')) {
      win.classList.remove('maximized');
      if (win.dataset.prevLeft) win.style.left = win.dataset.prevLeft;
      if (win.dataset.prevTop) win.style.top = win.dataset.prevTop;
      if (win.dataset.prevWidth) win.style.width = win.dataset.prevWidth;
      if (win.dataset.prevHeight) win.style.height = win.dataset.prevHeight;
      win.style.margin = win.dataset.prevMargin || '';
      if (maxBtn) maxBtn.setAttribute('aria-label', 'Maximize');
    } else {
      win.dataset.prevLeft = win.style.left;
      win.dataset.prevTop = win.style.top;
      win.dataset.prevWidth = win.style.width;
      win.dataset.prevHeight = win.style.height;
      win.dataset.prevMargin = win.style.margin;
      win.classList.add('maximized');
      win.style.left = '0';
      win.style.top = '0';
      win.style.width = '';
      win.style.height = '';
      win.style.margin = '0';
      if (maxBtn) maxBtn.setAttribute('aria-label', 'Restore');
    }

    focusWindow(id);
  }

  function updateTaskbar() {
    const container = $('#active-windows');
    container.innerHTML = '';

    state.activeWindows.forEach((id) => {
      const win = $(`#${id}`);
      const isVisible = win && !win.classList.contains('hidden');
      const btn = document.createElement('button');
      btn.textContent = windows[id].name;
      btn.className = isVisible ? 'active' : '';
      btn.setAttribute('aria-pressed', isVisible ? 'true' : 'false');
      btn.addEventListener('click', () => {
        if (isVisible) minimizeWindow(id);
        else showWindow(id);
      });
      container.appendChild(btn);
    });
  }

  // --- Dragging ---

  function startDrag(e) {
    if (e.target.tagName === 'BUTTON' || e.target.closest('.title-bar-controls')) return;
    if (window.matchMedia('(max-width: 600px)').matches) return;

    const win = e.target.closest('.window');
    if (!win || win.classList.contains('maximized')) return;

    state.isDragging = true;
    state.currentWindow = win;
    const rect = win.getBoundingClientRect();
    state.dragOffset.x = e.clientX - rect.left;
    state.dragOffset.y = e.clientY - rect.top;
    focusWindow(win.id);
  }

  function drag(e) {
    if (!state.isDragging || !state.currentWindow) return;
    e.preventDefault();

    const win = state.currentWindow;
    const maxX = window.innerWidth - win.offsetWidth;
    const maxY = window.innerHeight - win.offsetHeight - 28;

    let x = e.clientX - state.dragOffset.x;
    let y = e.clientY - state.dragOffset.y;
    x = Math.min(Math.max(0, x), maxX);
    y = Math.min(Math.max(0, y), maxY);

    win.style.left = `${x}px`;
    win.style.top = `${y}px`;
    win.style.margin = '0';
  }

  function stopDrag() {
    state.isDragging = false;
    state.currentWindow = null;
  }

  // --- Start Menu ---

  function toggleStartMenu() {
    const menu = $('#start-menu');
    const btn = $('#start-btn');
    const visible = menu.classList.toggle('visible');
    btn.setAttribute('aria-expanded', visible);
    btn.setAttribute('aria-pressed', visible);
  }

  function closeStartMenu() {
    const menu = $('#start-menu');
    const btn = $('#start-btn');
    menu.classList.remove('visible');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-pressed', 'false');
  }

  // --- Calculator ---

  function updateCalculatorDisplay() {
    const el = $('#calc-display');
    if (el) el.value = state.calculator.display;
  }

  function safeEvaluate(expr) {
    const clean = expr.replace(/\s+/g, '');
    if (!/^[\d+\-*/.()]+$/.test(clean)) throw new Error('Invalid input');
    // The regex above only permits numbers and math operators, so this is safe.
    // eslint-disable-next-line no-new-func
    return new Function(`return (${clean})`)();
  }

  function appendNumber(num) {
    state.calculator.display += num;
    updateCalculatorDisplay();
  }

  function appendOperator(op) {
    state.calculator.display += ` ${op} `;
    updateCalculatorDisplay();
  }

  function calculate() {
    try {
      const result = safeEvaluate(state.calculator.display);
      state.calculator.display = Number(result).toString();
      updateCalculatorDisplay();
    } catch (err) {
      state.calculator.display = 'Error';
      updateCalculatorDisplay();
    }
  }

  function clearDisplay() {
    state.calculator.display = '';
    updateCalculatorDisplay();
  }

  // --- Notepad ---

  function saveNotes() {
    const content = $('#notepad-content').value;
    localStorage.setItem('notepad-content', content);
  }

  function clearNotes() {
    $('#notepad-content').value = '';
    localStorage.removeItem('notepad-content');
  }

  function downloadNotes() {
    const content = $('#notepad-content').value;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'notes.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // --- Timer ---

  function formatTimerTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function updateTimerDisplay() {
    const el = $('#timer-display');
    if (el) el.textContent = formatTimerTime(state.timer.remaining);
  }

  function updateTimerStatus(message) {
    const el = $('#timer-status');
    if (el) el.textContent = message;
  }

  function setTimer(seconds) {
    pauseTimer();
    state.timer.remaining = seconds;
    state.timer.total = seconds;
    updateTimerDisplay();
    updateTimerStatus('Ready');
  }

  function readTimerInput() {
    const min = parseInt($('#timer-min').value || '0', 10) || 0;
    const sec = parseInt($('#timer-sec').value || '0', 10) || 0;
    return min * 60 + Math.min(59, Math.max(0, sec));
  }

  async function requestTimerWakeLock() {
    if (!('wakeLock' in navigator)) return;
    if (state.timer.wakeLock && !state.timer.wakeLock.released) return;
    try {
      state.timer.wakeLock = await navigator.wakeLock.request('screen');
    } catch (err) {
      console.error('Timer wake lock request failed:', err);
    }
  }

  function releaseTimerWakeLock() {
    if (state.timer.wakeLock) {
      try {
        if (!state.timer.wakeLock.released) state.timer.wakeLock.release();
      } catch (err) {
        console.error('Timer wake lock release failed:', err);
      }
      state.timer.wakeLock = null;
    }
  }

  function playAlarm() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      /* ignore */
    }
  }

  function startTimer() {
    if (state.timer.remaining <= 0) {
      const custom = readTimerInput();
      if (custom > 0) setTimer(custom);
      else return;
    }

    if (state.timer.interval) clearInterval(state.timer.interval);
    updateTimerStatus('Running...');
    requestTimerWakeLock();

    state.timer.interval = setInterval(() => {
      state.timer.remaining--;
      updateTimerDisplay();
      if (state.timer.remaining <= 0) {
        pauseTimer();
        updateTimerStatus("Time's up!");
        playAlarm();
      }
    }, 1000);
  }

  function pauseTimer() {
    if (state.timer.interval) {
      clearInterval(state.timer.interval);
      state.timer.interval = null;
    }
    releaseTimerWakeLock();
    updateTimerStatus(state.timer.remaining > 0 ? 'Paused' : 'Finished');
  }

  function resetTimer() {
    pauseTimer();
    state.timer.remaining = state.timer.total;
    updateTimerDisplay();
    updateTimerStatus('Ready');
  }

  // --- Clock ---

  function updateClock() {
    const now = new Date();
    const h = now.getHours().toString().padStart(2, '0');
    const m = now.getMinutes().toString().padStart(2, '0');
    const el = $('#clock');
    if (el) el.textContent = `${h}:${m}`;
  }

  // --- Event Handlers ---

  function handleWindowControlClick(e) {
    const win = e.target.closest('.window');
    const action = e.target.dataset.action;
    if (!win || !action) return;

    if (action === 'minimize') minimizeWindow(win.id);
    if (action === 'maximize') maximizeWindow(win.id);
    if (action === 'close') closeWindow(win.id);
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      const menu = $('#start-menu');
      if (menu.classList.contains('visible')) {
        e.preventDefault();
        closeStartMenu();
      }
    }

    if (e.key === 'Enter' || e.key === ' ') {
      const icon = document.activeElement.closest('.desktop-icon');
      if (icon) {
        e.preventDefault();
        const id = icon.dataset.window;
        if (id) showWindow(id);
      }

      const item = document.activeElement.closest('#start-menu li');
      if (item) {
        e.preventDefault();
        const id = item.dataset.window;
        if (id) {
          showWindow(id);
          closeStartMenu();
        }
      }
    }
  }

  function init() {
    // Desktop icons
    $('#desktop').addEventListener('click', (e) => {
      const icon = e.target.closest('.desktop-icon');
      if (!icon) return;
      const id = icon.dataset.window;
      if (id) showWindow(id);
    });

    // Window controls
    $$('.window .title-bar-controls button').forEach((btn) => {
      btn.addEventListener('click', handleWindowControlClick);
    });

    // Bring to front / dragging
    $$('.window').forEach((win) => {
      const titleBar = win.querySelector('.title-bar');
      titleBar.addEventListener('mousedown', startDrag);
      win.addEventListener('mousedown', () => focusWindow(win.id));
    });
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDrag);

    // Start menu
    $('#start-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleStartMenu();
    });

    $$('#start-menu li').forEach((item) => {
      item.addEventListener('click', () => {
        const id = item.dataset.window;
        if (id) showWindow(id);
        closeStartMenu();
      });
    });

    document.addEventListener('click', (e) => {
      const menu = $('#start-menu');
      const btn = $('#start-btn');
      if (!btn.contains(e.target) && !menu.contains(e.target)) {
        closeStartMenu();
      }
    });

    // Wake lock
    $('#wake-lock-btn').addEventListener('click', toggleWakeLock);

    // Calculator
    $$('#calculator .calc-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.type;
        const value = btn.dataset.value;
        if (type === 'num') appendNumber(value);
        if (type === 'op') appendOperator(value);
        if (type === 'eq') calculate();
        if (type === 'clear') clearDisplay();
      });
    });

    // Notepad
    $('#save-notes').addEventListener('click', saveNotes);
    $('#clear-notes').addEventListener('click', clearNotes);
    $('#download-notes').addEventListener('click', downloadNotes);

    // Timer
    $('#timer-start').addEventListener('click', startTimer);
    $('#timer-pause').addEventListener('click', pauseTimer);
    $('#timer-reset').addEventListener('click', resetTimer);
    $('#timer-custom').addEventListener('click', () => {
      const total = readTimerInput();
      if (total > 0) setTimer(total);
    });
    $$('#timer .preset').forEach((btn) => {
      btn.addEventListener('click', () => setTimer(parseInt(btn.dataset.seconds, 10)));
    });

    // Global keyboard shortcuts
    document.addEventListener('keydown', handleKeyDown);

    // Visibility change re-acquire
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        if (state.wakeLockWanted) requestWakeLock();
        if (state.timer.interval) requestTimerWakeLock();
      }
    });

    // Clock
    setInterval(updateClock, 1000);
    updateClock();

    // Load notes
    const savedNotes = localStorage.getItem('notepad-content');
    if (savedNotes) $('#notepad-content').value = savedNotes;

    // Init timer
    setTimer(300);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
