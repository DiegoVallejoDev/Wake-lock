(function () {
  'use strict';

  const state = {
    wakeLock: null,
    wakeLockWanted: false,
    wakeLockRequest: null,
    activeWindows: new Set(),
    focusedWindow: null,
    zIndexCounter: 10,
    isDragging: false,
    currentWindow: null,
    dragOffset: { x: 0, y: 0 },
    timer: {
      interval: null,
      remaining: 0,
      total: 0,
      deadline: 0,
      wakeLock: null,
      wakeLockRequest: null,
    },
    calculator: { display: '' },
    tictactoe: { board: Array(9).fill(''), current: 'X', winner: null },
    todos: [],
    notepadPreview: false,
  };

  const windows = {
    'wake-Lock': { name: 'Wake Lock', default: { top: 40, left: 128 } },
    calculator: { name: 'Calculator', default: { top: 40, left: 464 } },
    notepad: { name: 'Notepad', default: { top: 250, left: 128 } },
    timer: { name: 'Timer', default: { top: 250, left: 464 } },
    'tic-tac-toe': { name: 'Tic-Tac-Toe', default: { top: 40, left: 680 } },
    todo: { name: 'Todo List', default: { top: 250, left: 680 } },
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
    if (!btn) return;
    btn.textContent = active ? 'Release Wake Lock' : 'Enable Wake Lock';
    btn.setAttribute('aria-pressed', String(active));
    btn.setAttribute('aria-busy', String(!!state.wakeLockRequest));
  }

  async function requestWakeLock() {
    if (!('wakeLock' in navigator)) {
      updateWakeStatus('Wake Lock API not supported');
      return;
    }
    if (document.visibilityState !== 'visible' || state.wakeLockRequest) return;
    if (state.wakeLock && !state.wakeLock.released) return;
    const request = {};
    state.wakeLockRequest = request;
    state.wakeLockWanted = true;
    updateWakeStatus('Requesting Wake Lock...');
    updateWakeButton(true);
    try {
      const lock = await navigator.wakeLock.request('screen');
      if (state.wakeLockRequest !== request || !state.wakeLockWanted || document.visibilityState !== 'visible') {
        await lock.release();
        return;
      }
      state.wakeLock = lock;
      state.wakeLockRequest = null;
      updateWakeStatus('Wake Lock is active');
      updateWakeIndicator(true);
      updateWakeButton(true);

      lock.addEventListener('release', () => {
        if (state.wakeLock !== lock) return;
        state.wakeLock = null;
        updateWakeStatus('Wake Lock was released');
        updateWakeIndicator(false);
        updateWakeButton(state.wakeLockWanted);
      });
    } catch (err) {
      if (state.wakeLockRequest === request) {
        state.wakeLockWanted = false;
        updateWakeStatus(`Error - ${err.message}`);
        updateWakeIndicator(false);
      }
    } finally {
      if (state.wakeLockRequest === request) {
        state.wakeLockRequest = null;
        updateWakeButton(state.wakeLockWanted);
      }
    }
  }

  async function releaseWakeLock(keepWanted = false) {
    state.wakeLockRequest = null;
    const lock = state.wakeLock;
    state.wakeLock = null;
    if (!keepWanted) state.wakeLockWanted = false;
    updateWakeIndicator(false);
    updateWakeButton(state.wakeLockWanted);
    updateWakeStatus(state.wakeLockWanted ? 'Wake Lock is suspended' : 'Wake Lock is not active');
    try {
      if (lock && !lock.released) await lock.release();
    } catch (err) {
      console.error('Wake lock release failed:', err);
    }
  }

  function toggleWakeLock() {
    if (state.wakeLockWanted) {
      releaseWakeLock();
    } else {
      requestWakeLock();
    }
  }

  // --- Window Management ---

  function selectDesktopIcon(selected) {
    $$('.desktop-icon').forEach((icon, index) => {
      const active = icon === selected;
      icon.classList.toggle('selected', active);
      icon.setAttribute('aria-pressed', String(active));
      icon.tabIndex = active || (!selected && index === 0) ? 0 : -1;
    });
  }

  function moveDesktopSelection(icon, key) {
    const icons = Array.from($$('.desktop-icon'));
    if (key === 'Home' || key === 'End') {
      (key === 'Home' ? icons[0] : icons[icons.length - 1]).focus();
      return;
    }

    const horizontal = key === 'ArrowLeft' || key === 'ArrowRight';
    const direction = key === 'ArrowRight' || key === 'ArrowDown' ? 1 : -1;
    const axis = horizontal ? 'left' : 'top';
    const crossAxis = horizontal ? 'top' : 'left';
    const origin = icon.getBoundingClientRect();
    let nearest = icon;
    let distance = Infinity;
    icons.forEach((candidate) => {
      const bounds = candidate.getBoundingClientRect();
      const delta = (bounds[axis] - origin[axis]) * direction;
      if (delta > 0 && delta < distance && Math.abs(bounds[crossAxis] - origin[crossAxis]) < 1) {
        nearest = candidate;
        distance = delta;
      }
    });
    nearest.focus();
  }

  function createAppIcon(id, size = 16) {
    const source = $(`.desktop-icon[data-window="${id}"] img`);
    if (!source) return null;
    const icon = source.cloneNode();
    icon.className = 'app-icon';
    icon.width = size;
    icon.height = size;
    icon.draggable = false;
    return icon;
  }

  function positionWindow(win, left, top) {
    const maxLeft = Math.max(0, window.innerWidth - win.offsetWidth);
    const maxTop = Math.max(0, $('.taskbar').getBoundingClientRect().top - win.offsetHeight);
    win.style.left = `${Math.min(Math.max(0, left), maxLeft)}px`;
    win.style.top = `${Math.min(Math.max(0, top), maxTop)}px`;
  }

  function constrainWindow(win) {
    if (window.matchMedia('(max-width: 600px)').matches || win.classList.contains('maximized')) return;
    const rect = win.getBoundingClientRect();
    positionWindow(win, rect.left, rect.top);
  }

  function focusWindow(id) {
    const win = id ? $(`#${id}`) : null;
    if (win && state.focusedWindow !== id) {
      state.zIndexCounter++;
      win.style.zIndex = state.zIndexCounter;
    }
    state.focusedWindow = id;

    $$('.window').forEach((w) => {
      const tb = w.querySelector('.title-bar');
      if (tb) tb.classList.toggle('inactive', w.id !== id);
    });
    $$('#active-windows button').forEach((button) => {
      const active = button.dataset.window === id;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function restoreWindowFocus(id) {
    if (state.focusedWindow !== id) return;
    const visible = Array.from($$('.window:not(.hidden)'));
    visible.sort((left, right) => Number(right.style.zIndex) - Number(left.style.zIndex));
    if (visible.length) {
      focusWindow(visible[0].id);
      visible[0].focus({ preventScroll: true });
    } else {
      focusWindow(null);
      $(`.desktop-icon[data-window="${id}"]`).focus();
    }
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

    constrainWindow(win);
    focusWindow(id);
    updateTaskbar();
    win.focus({ preventScroll: true });
  }

  function closeWindow(id) {
    const win = $(`#${id}`);
    if (!win) return;

    win.classList.add('hidden');
    state.activeWindows.delete(id);
    if (id === 'timer') pauseTimer();
    restoreWindowFocus(id);
    updateTaskbar();
  }

  function minimizeWindow(id) {
    const win = $(`#${id}`);
    if (win) win.classList.add('hidden');
    restoreWindowFocus(id);
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

    constrainWindow(win);
    focusWindow(id);
  }

  function updateTaskbar() {
    const container = $('#active-windows');
    container.innerHTML = '';

    state.activeWindows.forEach((id) => {
      const win = $(`#${id}`);
      const isActive = state.focusedWindow === id;
      const btn = document.createElement('button');
      const label = document.createElement('span');
      label.textContent = windows[id].name;
      const icon = createAppIcon(id);
      if (icon) btn.appendChild(icon);
      btn.appendChild(label);
      btn.title = windows[id].name;
      btn.dataset.window = id;
      btn.className = isActive ? 'active' : '';
      btn.setAttribute('aria-pressed', String(isActive));
      btn.addEventListener('click', () => {
        if (win && !win.classList.contains('hidden') && state.focusedWindow === id) minimizeWindow(id);
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
    positionWindow(win, e.clientX - state.dragOffset.x, e.clientY - state.dragOffset.y);
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
    if (menu.classList.contains('visible')) {
      closeStartMenu(true);
      return;
    }
    menu.classList.add('visible');
    btn.setAttribute('aria-expanded', 'true');
    btn.setAttribute('aria-pressed', 'true');
    $('#start-menu li').focus();
  }

  function closeStartMenu(restoreFocus = false) {
    const menu = $('#start-menu');
    const btn = $('#start-btn');
    menu.classList.remove('visible');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-pressed', 'false');
    if (restoreFocus) btn.focus();
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
    renderNotepadPreview();
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

  // --- Markdown Preview ---

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function parseMarkdown(text) {
    if (!text) return '';
    const escaped = escapeHtml(text);
    const lines = escaped.split(/\r?\n/);
    const blocks = [];
    let i = 0;

    function isTableSeparator(s) {
      const cells = s.trim().split('|').slice(1, -1);
      return cells.length > 0 && cells.every((cell) => /^:?-+:?$/.test(cell.trim()));
    }

    function splitTableCells(s) {
      return s
        .trim()
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((cell) => cell.trim());
    }

    function tableAlign(sep) {
      return splitTableCells(sep).map((cell) => {
        const c = cell.trim();
        if (c.startsWith(':') && c.endsWith(':')) return 'center';
        if (c.endsWith(':')) return 'right';
        return 'left';
      });
    }

    function inline(s) {
      return s
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/~~(.+?)~~/g, '<del>$1</del>')
        .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    }

    while (i < lines.length) {
      const line = lines[i];

      if (line.trim() === '```') {
        i++;
        const code = [];
        while (i < lines.length && lines[i].trim() !== '```') {
          code.push(lines[i]);
          i++;
        }
        blocks.push('<pre><code>' + code.join('\n') + '</code></pre>');
        i++;
        continue;
      }

      const h = line.match(/^(#{1,6})\s+(.*)$/);
      if (h) {
        const n = h[1].length;
        blocks.push(`<h${n}>${inline(h[2])}</h${n}>`);
        i++;
        continue;
      }

      if (/^(---|\*\*\*|___)\s*$/.test(line.trim())) {
        blocks.push('<hr>');
        i++;
        continue;
      }

      if (/^&gt;\s?(.*)$/.test(line)) {
        const quoteLines = [];
        while (i < lines.length && /^&gt;\s?(.*)$/.test(lines[i])) {
          const m = lines[i].match(/^&gt;\s?(.*)$/);
          quoteLines.push(m[1]);
          i++;
        }
        const content = quoteLines.map(inline).join('<br>');
        blocks.push(`<blockquote><p>${content}</p></blockquote>`);
        continue;
      }

      const trimmed = line.trim();
      if (
        trimmed.startsWith('|') &&
        trimmed.endsWith('|') &&
        i + 1 < lines.length &&
        isTableSeparator(lines[i + 1])
      ) {
        const tableLines = [];
        while (
          i < lines.length &&
          lines[i].trim().startsWith('|') &&
          lines[i].trim().endsWith('|')
        ) {
          tableLines.push(lines[i].trim());
          i++;
        }

        const headerCells = splitTableCells(tableLines[0]);
        const align = tableAlign(tableLines[1]);
        const thead = '<thead><tr>' + headerCells
          .map((cell, idx) => `<th style="text-align:${align[idx] || 'left'}">${inline(cell)}</th>`)
          .join('') + '</tr></thead>';

        const tbody = [];
        for (let r = 2; r < tableLines.length; r++) {
          const cells = splitTableCells(tableLines[r]);
          tbody.push('<tr>' + headerCells
            .map((_, idx) => `<td style="text-align:${align[idx] || 'left'}">${inline(cells[idx] || '')}</td>`)
            .join('') + '</tr>');
        }

        blocks.push('<table>' + thead + '<tbody>' + tbody.join('') + '</tbody></table>');
        continue;
      }

      if (/^[-*]\s+(.*)$/.test(line)) {
        const items = [];
        while (i < lines.length && /^[-*]\s+(.*)$/.test(lines[i])) {
          const m = lines[i].match(/^[-*]\s+(.*)$/);
          items.push(inline(m[1]));
          i++;
        }
        blocks.push('<ul>' + items.map((item) => `<li>${item}</li>`).join('') + '</ul>');
        continue;
      }

      if (/^\d+\.\s+(.*)$/.test(line)) {
        const items = [];
        while (i < lines.length && /^\d+\.\s+(.*)$/.test(lines[i])) {
          const m = lines[i].match(/^\d+\.\s+(.*)$/);
          items.push(inline(m[1]));
          i++;
        }
        blocks.push('<ol>' + items.map((item) => `<li>${item}</li>`).join('') + '</ol>');
        continue;
      }

      if (line.trim() === '') {
        i++;
        continue;
      }

      blocks.push('<p>' + inline(line) + '</p>');
      i++;
    }

    return blocks.join('');
  }

  function renderNotepadPreview() {
    const textarea = $('#notepad-content');
    const preview = $('#notepad-preview');
    const btn = $('#preview-toggle');
    if (!textarea || !preview || !btn) return;

    btn.setAttribute('aria-pressed', String(state.notepadPreview));
    if (state.notepadPreview) {
      if (window.DOMPurify && window.DOMPurify.isSupported) {
        preview.innerHTML = window.DOMPurify.sanitize(parseMarkdown(textarea.value), {
          USE_PROFILES: { html: true },
          ADD_ATTR: ['target'],
        });
      } else {
        const plainText = document.createElement('pre');
        plainText.textContent = textarea.value;
        preview.replaceChildren(plainText);
      }
      preview.hidden = false;
      textarea.hidden = true;
      btn.textContent = 'Edit';
    } else {
      preview.hidden = true;
      textarea.hidden = false;
      btn.textContent = 'Preview';
    }
  }

  function toggleNotepadPreview() {
    state.notepadPreview = !state.notepadPreview;
    renderNotepadPreview();
  }

  // --- Tic-Tac-Toe ---

  const WINNING_LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];

  function checkTicTacToeWinner() {
    const { board } = state.tictactoe;
    for (const [a, b, c] of WINNING_LINES) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a];
      }
    }
    return null;
  }

  function updateTicTacToeStatus() {
    const el = $('#tictactoe-status');
    if (!el) return;
    if (state.tictactoe.winner) {
      el.textContent = state.tictactoe.winner === 'draw'
        ? "It's a draw!"
        : `${state.tictactoe.winner} wins!`;
      return;
    }
    if (state.tictactoe.board.every((cell) => cell !== '')) {
      state.tictactoe.winner = 'draw';
      el.textContent = "It's a draw!";
      return;
    }
    el.textContent = `${state.tictactoe.current}'s turn`;
  }

  function renderTicTacToeBoard() {
    const board = $('#tictactoe-board');
    if (!board) return;
    board.innerHTML = '';
    const { winner } = state.tictactoe;
    state.tictactoe.board.forEach((cell, index) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = cell;
      btn.setAttribute('data-index', index);
      btn.setAttribute('aria-label', `Cell ${index + 1}${cell ? `, ${cell}` : ''}`);
      btn.disabled = !!cell || !!winner;
      board.appendChild(btn);
    });
    updateTicTacToeStatus();
  }

  function handleTicTacToeClick(index) {
    const { board, current } = state.tictactoe;
    if (board[index] || state.tictactoe.winner) return;

    board[index] = current;
    const winner = checkTicTacToeWinner();
    if (winner) {
      state.tictactoe.winner = winner;
    } else {
      state.tictactoe.current = current === 'X' ? 'O' : 'X';
    }

    renderTicTacToeBoard();
  }

  function resetTicTacToe() {
    state.tictactoe = { board: Array(9).fill(''), current: 'X', winner: null };
    renderTicTacToeBoard();
  }

  // --- Todo List ---

  function loadTodos() {
    try {
      const data = localStorage.getItem('todos');
      state.todos = data ? JSON.parse(data) : [];
    } catch (err) {
      state.todos = [];
    }
  }

  function saveTodos() {
    localStorage.setItem('todos', JSON.stringify(state.todos));
  }

  function renderTodos() {
    const list = $('#todo-list');
    if (!list) return;
    list.innerHTML = '';

    state.todos.forEach((todo, index) => {
      const li = document.createElement('li');
      li.setAttribute('role', 'listitem');
      if (todo.done) li.classList.add('done');

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = todo.done;
      checkbox.setAttribute('data-index', index);
      checkbox.setAttribute('aria-label', `Mark ${todo.text} as ${todo.done ? 'incomplete' : 'complete'}`);

      const span = document.createElement('span');
      span.textContent = todo.text;

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.textContent = '×';
      delBtn.setAttribute('data-action', 'delete');
      delBtn.setAttribute('data-index', index);
      delBtn.setAttribute('aria-label', `Delete ${todo.text}`);

      li.appendChild(checkbox);
      li.appendChild(span);
      li.appendChild(delBtn);
      list.appendChild(li);
    });
  }

  function addTodo() {
    const input = $('#todo-input');
    const text = input.value.trim();
    if (!text) return;
    state.todos.push({ text, done: false });
    input.value = '';
    renderTodos();
    saveTodos();
  }

  function toggleTodo(index) {
    if (index < 0 || index >= state.todos.length) return;
    state.todos[index].done = !state.todos[index].done;
    renderTodos();
    saveTodos();
  }

  function deleteTodo(index) {
    if (index < 0 || index >= state.todos.length) return;
    state.todos.splice(index, 1);
    renderTodos();
    saveTodos();
  }

  // --- Timer ---

  function formatTimerTime(seconds) {
    const rounded = Math.ceil(seconds);
    const minutes = Math.floor(rounded / 60).toString().padStart(2, '0');
    const remainder = (rounded % 60).toString().padStart(2, '0');
    return `${minutes}:${remainder}`;
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
    const minutes = parseInt($('#timer-min').value, 10) || 0;
    const seconds = parseInt($('#timer-sec').value, 10) || 0;
    return Math.min(999, Math.max(0, minutes)) * 60 + Math.min(59, Math.max(0, seconds));
  }

  async function requestTimerWakeLock() {
    if (!state.timer.interval || document.visibilityState !== 'visible') return;
    if (!('wakeLock' in navigator)) {
      updateTimerStatus('Running... Screen wake lock is unavailable.');
      return;
    }
    if (state.timer.wakeLockRequest) return;
    if (state.timer.wakeLock && !state.timer.wakeLock.released) return;
    const request = {};
    state.timer.wakeLockRequest = request;
    try {
      const lock = await navigator.wakeLock.request('screen');
      if (state.timer.wakeLockRequest !== request || !state.timer.interval || document.visibilityState !== 'visible') {
        await lock.release();
        return;
      }
      state.timer.wakeLock = lock;
      updateTimerStatus('Running...');
      lock.addEventListener('release', () => {
        if (state.timer.wakeLock !== lock) return;
        state.timer.wakeLock = null;
        if (state.timer.interval) updateTimerStatus('Running... Screen wake lock was released.');
      });
    } catch (err) {
      if (state.timer.wakeLockRequest === request) {
        updateTimerStatus('Running... Screen wake lock is unavailable.');
      }
    } finally {
      if (state.timer.wakeLockRequest === request) state.timer.wakeLockRequest = null;
    }
  }

  async function releaseTimerWakeLock() {
    state.timer.wakeLockRequest = null;
    const lock = state.timer.wakeLock;
    state.timer.wakeLock = null;
    try {
      if (lock && !lock.released) await lock.release();
    } catch (err) {
      console.error('Timer wake lock release failed:', err);
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
    if (state.timer.interval) return;
    if (state.timer.remaining <= 0) {
      const custom = readTimerInput();
      if (custom > 0) setTimer(custom);
      else return;
    }

    state.timer.deadline = Date.now() + state.timer.remaining * 1000;
    state.timer.interval = setInterval(tickTimer, 1000);
    updateTimerStatus('Running...');
    requestTimerWakeLock();
  }

  function updateTimerRemaining() {
    if (!state.timer.interval) return;
    state.timer.remaining = Math.max(0, (state.timer.deadline - Date.now()) / 1000);
    updateTimerDisplay();
  }

  function tickTimer() {
    if (!state.timer.interval) return;
    updateTimerRemaining();
    if (state.timer.remaining <= 0) {
      pauseTimer();
      updateTimerStatus("Time's up!");
      playAlarm();
    }
  }

  function pauseTimer() {
    if (state.timer.interval) {
      updateTimerRemaining();
      clearInterval(state.timer.interval);
      state.timer.interval = null;
    }
    state.timer.deadline = 0;
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
    if (el) {
      el.textContent = `${h}:${m}`;
      el.dateTime = now.toISOString();
      el.title = now.toLocaleDateString(undefined, {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      });
    }
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
        closeStartMenu(true);
        return;
      }
    }

    const icon = document.activeElement.closest('.desktop-icon');
    if (icon) {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
        e.preventDefault();
        moveDesktopSelection(icon, e.key);
        return;
      }
      if (e.key === ' ') {
        e.preventDefault();
        selectDesktopIcon(icon);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        showWindow(icon.dataset.window);
        return;
      }
      if (e.key === 'Escape') {
        selectDesktopIcon(null);
        $('#desktop').focus();
      }
    }

    if (document.activeElement === $('#start-btn') && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      if (!$('#start-menu').classList.contains('visible')) toggleStartMenu();
      const items = $$('#start-menu li');
      (e.key === 'ArrowUp' ? items[items.length - 1] : items[0]).focus();
      return;
    }

    const item = document.activeElement.closest('#start-menu li');
    if (item) {
      const items = Array.from($$('#start-menu li'));
      const index = items.indexOf(item);
      if (['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) {
        e.preventDefault();
        const next = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1
          : (index + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        items[next].focus();
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const id = item.dataset.window;
        if (id) {
          showWindow(id);
          closeStartMenu();
        }
        return;
      }
      if (e.key === 'Tab') {
        closeStartMenu(true);
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        const ordered = items.slice(index + 1).concat(items.slice(0, index + 1));
        const match = ordered.find((entry) => entry.textContent.trim().toLowerCase().startsWith(e.key.toLowerCase()));
        if (match) {
          e.preventDefault();
          match.focus();
        }
      }
    }
  }

  function init() {
    // Desktop icons
    $('#desktop').tabIndex = -1;
    selectDesktopIcon(null);
    $$('.desktop-icon').forEach((icon) => {
      icon.title = windows[icon.dataset.window].name;
      icon.querySelector('img').draggable = false;
      const item = $(`#start-menu [data-window="${icon.dataset.window}"]`);
      if (item) item.prepend(createAppIcon(icon.dataset.window, 32));
    });
    $('#desktop').addEventListener('focusin', (e) => {
      focusWindow(null);
      const icon = e.target.closest('.desktop-icon');
      if (icon) selectDesktopIcon(icon);
    });
    $('#desktop').addEventListener('click', (e) => {
      const icon = e.target.closest('.desktop-icon');
      selectDesktopIcon(icon);
      if (!icon) {
        $('#desktop').focus();
        return;
      }
      if (e.detail === 0 || e.pointerType === 'touch' || e.pointerType === 'pen' || window.matchMedia('(hover: none)').matches) {
        showWindow(icon.dataset.window);
      }
    });
    $('#desktop').addEventListener('dblclick', (e) => {
      const icon = e.target.closest('.desktop-icon');
      if (icon) showWindow(icon.dataset.window);
    });

    // Window controls
    $$('.window .title-bar-controls button').forEach((btn) => {
      btn.addEventListener('click', handleWindowControlClick);
    });

    // Bring to front / dragging
    $$('.window').forEach((win) => {
      win.tabIndex = -1;
      const titleBar = win.querySelector('.title-bar');
      const title = win.querySelector('.title-bar-text');
      const label = document.createElement('span');
      label.textContent = title.textContent;
      title.replaceChildren(createAppIcon(win.id), label);
      titleBar.addEventListener('mousedown', startDrag);
      titleBar.addEventListener('dblclick', (e) => {
        if (!e.target.closest('.title-bar-controls')) maximizeWindow(win.id);
      });
      win.addEventListener('mousedown', () => focusWindow(win.id));
      win.addEventListener('focusin', () => focusWindow(win.id));
    });
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDrag);
    window.addEventListener('resize', () => {
      $$('.window:not(.hidden)').forEach(constrainWindow);
    });

    // Start menu
    $('#start-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleStartMenu();
    });

    $$('#start-menu li').forEach((item) => {
      item.addEventListener('mouseenter', () => item.focus({ preventScroll: true }));
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
    updateWakeButton(false);
    if (!('wakeLock' in navigator)) {
      $('#wake-lock-btn').disabled = true;
      updateWakeStatus('Wake Lock API not supported in this browser or context');
    }

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
    $('#preview-toggle').addEventListener('click', toggleNotepadPreview);

    // Tic-Tac-Toe
    $('#tictactoe-reset').addEventListener('click', resetTicTacToe);
    $('#tictactoe-board').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-index]');
      if (!btn) return;
      handleTicTacToeClick(parseInt(btn.dataset.index, 10));
    });
    renderTicTacToeBoard();

    // Todo List
    $('#todo-add').addEventListener('click', addTodo);
    $('#todo-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addTodo();
    });
    $('#todo-list').addEventListener('change', (e) => {
      if (e.target.tagName === 'INPUT' && e.target.type === 'checkbox') {
        toggleTodo(parseInt(e.target.dataset.index, 10));
      }
    });
    $('#todo-list').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action="delete"]');
      if (btn) deleteTodo(parseInt(btn.dataset.index, 10));
    });
    loadTodos();
    renderTodos();

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
        tickTimer();
        if (state.timer.interval) requestTimerWakeLock();
      } else {
        if (state.wakeLockWanted) releaseWakeLock(true);
        releaseTimerWakeLock();
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
