const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

const script = readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8');

function createElement() {
  const element = new EventTarget();
  const classes = new Set();
  const attributes = new Map();
  Object.assign(element, {
    value: '0',
    textContent: '',
    innerHTML: '',
    children: [],
    dataset: {},
    style: {},
    closest: () => null,
    classList: {
      contains: (name) => classes.has(name),
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
      toggle(name, force = !classes.has(name)) {
        if (force) classes.add(name);
        else classes.delete(name);
        return force;
      },
    },
    setAttribute: (name, value) => attributes.set(name, String(value)),
    getAttribute: (name) => attributes.get(name) ?? null,
    appendChild(child) {
      element.children.push(child);
      return child;
    },
    replaceChildren(...children) {
      element.innerHTML = '';
      element.children = children;
    },
  });
  let html = '';
  Object.defineProperty(element, 'innerHTML', {
    get: () => html,
    set(value) {
      html = value;
      element.children = [];
    },
  });
  return element;
}

function createApp({ requestWakeLock, sanitizer } = {}) {
  const elements = new Map();
  const intervals = new Map();
  let nextInterval = 0;
  let now = 0;
  const document = new EventTarget();
  document.visibilityState = 'visible';
  document.querySelector = (selector) => {
    if (!elements.has(selector)) elements.set(selector, createElement());
    return elements.get(selector);
  };
  document.querySelectorAll = () => [];
  document.createElement = createElement;
  const appWindow = new EventTarget();
  appWindow.DOMPurify = sanitizer;
  appWindow.innerWidth = 1280;
  appWindow.innerHeight = 800;
  appWindow.matchMedia = () => ({ matches: false });

  vm.runInNewContext(script, {
    document,
    navigator: requestWakeLock ? { wakeLock: { request: requestWakeLock } } : {},
    window: appWindow,
    console,
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    Date: class extends Date {
      static now() { return now; }
    },
    setInterval(callback) {
      const interval = ++nextInterval;
      intervals.set(interval, callback);
      return interval;
    },
    clearInterval: (interval) => intervals.delete(interval),
  }, { filename: 'script.js' });
  document.dispatchEvent(new Event('DOMContentLoaded'));

  return {
    document,
    element: (selector) => document.querySelector(selector),
    click: (selector) => document.querySelector(selector).dispatchEvent(new Event('click')),
    elapse(milliseconds) {
      now += milliseconds;
    },
    visibility(value) {
      document.visibilityState = value;
      document.dispatchEvent(new Event('visibilitychange'));
    },
    advance(milliseconds) {
      now += milliseconds;
      for (const callback of [...intervals.values()]) callback();
    },
  };
}

function dispatchEvent(target, type, properties = {}) {
  const event = new Event(type, { cancelable: true });
  Object.entries(properties).forEach(([name, value]) => {
    Object.defineProperty(event, name, { value });
  });
  target.dispatchEvent(event);
  return event;
}

function createDesktopApp() {
  const app = createApp();
  const desktop = app.element('#desktop');
  const ids = ['wake-Lock', 'calculator', 'notepad', 'timer', 'tic-tac-toe', 'todo'];
  const names = ['Wake Lock', 'Calculator', 'Notepad', 'Timer', 'Tic-Tac-Toe', 'Todo List'];
  const selectors = new Map();
  const icons = ids.map((id, index) => {
    const icon = createElement();
    icon.dataset.window = id;
    icon.closest = (selector) => selector === '.desktop-icon' ? icon : null;
    icon.getBoundingClientRect = () => ({ left: 16, top: 16 + index * 88 });
    icon.focus = () => {
      app.document.activeElement = icon;
      dispatchEvent(desktop, 'focusin', { target: icon });
    };
    selectors.set(`.desktop-icon[data-window="${id}"]`, icon);
    selectors.set(`.desktop-icon[data-window="${id}"] img`, null);
    return icon;
  });
  const panels = ids.map((id) => {
    const panel = app.element(`#${id}`);
    const titleBar = createElement();
    panel.id = id;
    panel.classList.add('hidden');
    panel.offsetWidth = 300;
    panel.offsetHeight = 200;
    panel.getBoundingClientRect = () => ({ left: 128, top: 40 });
    panel.querySelector = (selector) => selector === '.title-bar' ? titleBar : null;
    panel.focus = () => { app.document.activeElement = panel; };
    return panel;
  });
  const menuItems = ids.map((id, index) => {
    const item = createElement();
    item.dataset.window = id;
    item.textContent = names[index];
    item.closest = (selector) => selector === '#start-menu li' ? item : null;
    item.focus = () => { app.document.activeElement = item; };
    return item;
  });
  selectors.set('#start-menu li', menuItems[0]);
  const querySelector = app.document.querySelector;
  app.document.querySelector = (selector) => selectors.has(selector) ? selectors.get(selector) : querySelector(selector);
  app.document.querySelectorAll = (selector) => {
    if (selector === '.desktop-icon') return icons;
    if (selector === '.window') return panels;
    if (selector === '.window:not(.hidden)') return panels.filter((panel) => !panel.classList.contains('hidden'));
    if (selector === '#active-windows button') return app.element('#active-windows').children;
    if (selector === '#start-menu li') return menuItems;
    return [];
  };
  app.element('.taskbar').getBoundingClientRect = () => ({ top: 772 });
  app.element('#start-btn').focus = () => { app.document.activeElement = app.element('#start-btn'); };
  desktop.focus = () => {
    app.document.activeElement = desktop;
    dispatchEvent(desktop, 'focusin');
  };

  return {
    ...app,
    icons,
    panels,
    menuItems,
    key: (key) => dispatchEvent(app.document, 'keydown', { key }),
    clickIcon(index, properties = {}) {
      icons[index].focus();
      dispatchEvent(desktop, 'click', { target: icons[index], detail: 1, pointerType: 'mouse', ...properties });
    },
    doubleClickIcon(index) {
      icons[index].focus();
      dispatchEvent(desktop, 'dblclick', { target: icons[index] });
    },
    taskButton: (id) => app.element('#active-windows').children.find((button) => button.dataset.window === id),
  };
}

function createWakeLock() {
  const lock = new EventTarget();
  lock.released = false;
  lock.release = async () => {
    lock.released = true;
    lock.dispatchEvent(new Event('release'));
  };
  return lock;
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

async function settle() {
  await new Promise((resolve) => setImmediate(resolve));
}

test('pausing the timer releases a wake lock granted after the pause', async () => {
  const pending = deferred();
  const app = createApp({ requestWakeLock: () => pending.promise });
  app.click('#timer-start');
  app.click('#timer-pause');

  const lock = createWakeLock();
  pending.resolve(lock);
  await settle();

  assert.equal(lock.released, true);
  assert.equal(app.element('#timer-status').textContent, 'Paused');
});

test('the timer uses elapsed time when interval callbacks are throttled', () => {
  const app = createApp();
  app.click('#timer-start');
  app.advance(65_000);

  assert.equal(app.element('#timer-display').textContent, '03:55');
  app.advance(235_000);
  assert.equal(app.element('#timer-display').textContent, '00:00');
  assert.equal(app.element('#timer-status').textContent, "Time's up!");
});

test('a pending manual wake lock can be cancelled without a duplicate request', async () => {
  const pending = deferred();
  let requests = 0;
  const app = createApp({ requestWakeLock: () => { requests++; return pending.promise; } });
  app.click('#wake-lock-btn');
  assert.equal(app.element('#wake-lock-btn').getAttribute('aria-busy'), 'true');
  app.visibility('visible');
  app.click('#wake-lock-btn');

  const lock = createWakeLock();
  pending.resolve(lock);
  await settle();

  assert.equal(requests, 1);
  assert.equal(lock.released, true);
  assert.equal(app.element('#wake-lock-btn').getAttribute('aria-pressed'), 'false');
  assert.equal(app.element('#wake-lock-btn').getAttribute('aria-busy'), 'false');
});

test('a stale manual request cannot replace or release a newer wake lock', async () => {
  const first = deferred();
  const second = deferred();
  const requests = [first, second];
  const app = createApp({ requestWakeLock: () => requests.shift().promise });
  app.click('#wake-lock-btn');
  app.click('#wake-lock-btn');
  app.click('#wake-lock-btn');

  const currentLock = createWakeLock();
  second.resolve(currentLock);
  await settle();
  const staleLock = createWakeLock();
  first.resolve(staleLock);
  await settle();

  assert.equal(staleLock.released, true);
  assert.equal(currentLock.released, false);
  assert.equal(app.element('#status').textContent, 'Status: Wake Lock is active');
  app.click('#wake-lock-btn');
  assert.equal(currentLock.released, true);
});

test('a rejected manual request restores the button so it can be retried', async () => {
  const pending = deferred();
  const app = createApp({ requestWakeLock: () => pending.promise });
  app.click('#wake-lock-btn');
  pending.reject(new Error('Permission denied'));
  await settle();

  assert.equal(app.element('#wake-lock-btn').textContent, 'Enable Wake Lock');
  assert.equal(app.element('#wake-lock-btn').getAttribute('aria-busy'), 'false');
  assert.match(app.element('#status').textContent, /Permission denied/);
});

test('hiding and restoring the page reacquires a wanted manual wake lock once', async () => {
  const locks = [];
  const app = createApp({ requestWakeLock: async () => {
    const lock = createWakeLock();
    locks.push(lock);
    return lock;
  } });
  app.click('#wake-lock-btn');
  await settle();
  app.visibility('hidden');
  assert.equal(locks[0].released, true);
  app.visibility('visible');
  app.visibility('visible');
  await settle();

  assert.equal(locks.length, 2);
  assert.equal(locks[1].released, false);
  app.click('#wake-lock-btn');
  app.visibility('hidden');
  app.visibility('visible');
  assert.equal(locks.length, 2);
});

test('an automatic release does not prevent cancelling the manual wake lock', async () => {
  const lock = createWakeLock();
  let requests = 0;
  const app = createApp({ requestWakeLock: async () => { requests++; return lock; } });
  app.click('#wake-lock-btn');
  await settle();
  await lock.release();
  app.click('#wake-lock-btn');
  app.visibility('visible');

  assert.equal(requests, 1);
  assert.equal(app.element('#wake-lock-btn').getAttribute('aria-pressed'), 'false');
});

test('manual and timer wake locks are released independently', async () => {
  const locks = [];
  const app = createApp({ requestWakeLock: async () => {
    const lock = createWakeLock();
    locks.push(lock);
    return lock;
  } });
  app.click('#wake-lock-btn');
  app.click('#timer-start');
  await settle();
  app.click('#timer-pause');

  assert.equal(locks[0].released, false);
  assert.equal(locks[1].released, true);
  app.click('#wake-lock-btn');
  assert.equal(locks[0].released, true);
});

test('restarting the timer discards the previous pending wake lock', async () => {
  const first = deferred();
  const second = deferred();
  const requests = [first, second];
  const app = createApp({ requestWakeLock: () => requests.shift().promise });
  app.click('#timer-start');
  app.click('#timer-pause');
  app.click('#timer-start');
  app.click('#timer-start');
  app.visibility('visible');
  const currentLock = createWakeLock();
  second.resolve(currentLock);
  await settle();
  const staleLock = createWakeLock();
  first.resolve(staleLock);
  await settle();

  assert.equal(staleLock.released, true);
  assert.equal(currentLock.released, false);
  app.click('#timer-reset');
  assert.equal(currentLock.released, true);
  assert.equal(app.element('#timer-display').textContent, '05:00');
});

test('pause and resume preserve fractional time and exclude paused time', () => {
  const app = createApp();
  app.click('#timer-start');
  app.elapse(1500);
  app.click('#timer-pause');
  assert.equal(app.element('#timer-display').textContent, '04:59');
  app.advance(60_000);
  assert.equal(app.element('#timer-display').textContent, '04:59');
  app.click('#timer-start');
  app.advance(500);
  assert.equal(app.element('#timer-display').textContent, '04:58');
});

test('returning to an expired timer finishes it without acquiring a new wake lock', async () => {
  const lock = createWakeLock();
  let requests = 0;
  const app = createApp({ requestWakeLock: async () => { requests++; return lock; } });
  app.click('#timer-start');
  await settle();
  app.visibility('hidden');
  app.elapse(400_000);
  app.visibility('visible');

  assert.equal(lock.released, true);
  assert.equal(requests, 1);
  assert.equal(app.element('#timer-display').textContent, '00:00');
  assert.equal(app.element('#timer-status').textContent, "Time's up!");
});

test('timer inputs stay within their supported bounds', () => {
  const app = createApp();
  app.element('#timer-min').value = '-2';
  app.element('#timer-sec').value = '65';
  app.click('#timer-custom');
  assert.equal(app.element('#timer-display').textContent, '00:59');
  app.element('#timer-min').value = '1000';
  app.click('#timer-custom');
  assert.equal(app.element('#timer-display').textContent, '999:59');
});

test('unsupported wake lock disables the manual control but leaves the timer usable', () => {
  const app = createApp();
  assert.equal(app.element('#wake-lock-btn').disabled, true);
  app.click('#timer-start');
  assert.match(app.element('#timer-status').textContent, /unavailable/);
  app.advance(1000);
  assert.equal(app.element('#timer-display').textContent, '04:59');
});

test('the Markdown preview only inserts HTML returned by the sanitizer', () => {
  const calls = [];
  const app = createApp({ sanitizer: {
    isSupported: true,
    sanitize(html, options) {
      calls.push({ html, options });
      return '<p>Sanitized preview</p>';
    },
  } });
  app.element('#notepad-content').value = '![note](missing-image" onerror="this.dataset.injected=1)';
  app.click('#preview-toggle');

  assert.equal(calls.length, 1);
  assert.match(calls[0].html, /onerror=/);
  assert.equal(calls[0].options.USE_PROFILES.html, true);
  assert.equal(app.element('#notepad-preview').innerHTML, '<p>Sanitized preview</p>');
  assert.equal(app.element('#preview-toggle').getAttribute('aria-pressed'), 'true');
  app.click('#preview-toggle');
  assert.equal(app.element('#preview-toggle').getAttribute('aria-pressed'), 'false');
  assert.equal(app.element('#notepad-content').hidden, false);
});

for (const sanitizer of [undefined, { isSupported: false }]) {
  test(`the preview falls back to plain text when the sanitizer is ${sanitizer ? 'unsupported' : 'missing'}`, () => {
    const app = createApp({ sanitizer });
    const source = '<img src=x onerror="this.dataset.injected=1">';
    app.element('#notepad-content').value = source;
    app.click('#preview-toggle');

    const preview = app.element('#notepad-preview');
    assert.equal(preview.innerHTML, '');
    assert.equal(preview.children.length, 1);
    assert.equal(preview.children[0].textContent, source);
    assert.equal(preview.hidden, false);
  });
}

test('a mouse click selects one desktop icon without opening an app', () => {
  const app = createDesktopApp();
  app.clickIcon(0);
  app.clickIcon(1);

  assert.equal(app.icons[0].getAttribute('aria-pressed'), 'false');
  assert.equal(app.icons[1].getAttribute('aria-pressed'), 'true');
  assert.equal(app.icons[0].tabIndex, -1);
  assert.equal(app.icons[1].tabIndex, 0);
  assert.equal(app.panels.every((panel) => panel.classList.contains('hidden')), true);

  dispatchEvent(app.element('#desktop'), 'click');
  assert.equal(app.icons.some((icon) => icon.classList.contains('selected')), false);
  assert.equal(app.icons[0].tabIndex, 0);
});

test('a double click opens the selected application and transfers focus', () => {
  const app = createDesktopApp();
  app.clickIcon(4);
  app.doubleClickIcon(4);

  assert.equal(app.panels[4].classList.contains('hidden'), false);
  assert.equal(app.document.activeElement, app.panels[4]);
  assert.equal(app.taskButton('tic-tac-toe').getAttribute('aria-pressed'), 'true');
  assert.equal(app.element('#active-windows').children.length, 1);
});

test('touch and assistive clicks can open an application without double clicking', () => {
  const app = createDesktopApp();
  app.clickIcon(2, { pointerType: 'touch' });
  assert.equal(app.panels[2].classList.contains('hidden'), false);
  app.clickIcon(5, { detail: 0 });
  assert.equal(app.panels[5].classList.contains('hidden'), false);
});

test('desktop keyboard navigation selects icons and Enter opens the focused app', () => {
  const app = createDesktopApp();
  app.icons[0].focus();
  app.key('ArrowDown');
  assert.equal(app.document.activeElement, app.icons[1]);
  assert.equal(app.key(' ').defaultPrevented, true);
  assert.equal(app.panels[1].classList.contains('hidden'), true);
  app.key('End');
  assert.equal(app.document.activeElement, app.icons[5]);
  app.key('Home');
  app.key('Enter');
  assert.equal(app.panels[0].classList.contains('hidden'), false);
  assert.equal(app.document.activeElement, app.panels[0]);
});

test('taskbar clicks raise background windows and minimize only the active window', () => {
  const app = createDesktopApp();
  app.doubleClickIcon(0);
  app.doubleClickIcon(1);
  app.taskButton('wake-Lock').dispatchEvent(new Event('click'));

  assert.equal(app.panels[0].classList.contains('hidden'), false);
  assert.equal(app.panels[1].classList.contains('hidden'), false);
  assert.equal(app.taskButton('wake-Lock').getAttribute('aria-pressed'), 'true');
  assert.equal(app.taskButton('calculator').getAttribute('aria-pressed'), 'false');

  app.taskButton('wake-Lock').dispatchEvent(new Event('click'));
  assert.equal(app.panels[0].classList.contains('hidden'), true);
  assert.equal(app.document.activeElement, app.panels[1]);
  assert.equal(app.taskButton('calculator').getAttribute('aria-pressed'), 'true');
  assert.equal(app.element('#active-windows').children.length, 2);
});

test('the Start menu wraps arrow navigation, supports type-ahead, and restores focus on Escape', () => {
  const app = createDesktopApp();
  app.click('#start-btn');
  assert.equal(app.document.activeElement, app.menuItems[0]);
  app.key('ArrowUp');
  assert.equal(app.document.activeElement, app.menuItems[5]);
  app.key('n');
  assert.equal(app.document.activeElement, app.menuItems[2]);
  app.key('Escape');
  assert.equal(app.element('#start-btn').getAttribute('aria-expanded'), 'false');
  assert.equal(app.document.activeElement, app.element('#start-btn'));
  app.key('ArrowDown');
  app.key('End');
  app.key('Enter');
  assert.equal(app.panels[5].classList.contains('hidden'), false);
  assert.equal(app.element('#start-menu').classList.contains('visible'), false);
});