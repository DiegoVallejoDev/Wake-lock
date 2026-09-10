# Wake Lock - Retro Web Inc

A Windows 98-style desktop with small browser utilities, built with HTML, CSS, and vanilla JavaScript. No build step is required.

## Features

- **Wake Lock**: Request a screen wake lock, cancel pending requests, and restore the lock when returning to the page.
- **Timer**: One-, five-, and twenty-five-minute presets, custom durations, pause, reset, and an audible alarm. The countdown uses elapsed time rather than counting interval callbacks.
- **Notepad**: Save notes locally, download a text file, and preview basic Markdown. The preview is sanitized with DOMPurify; if the library cannot load, it displays plain text instead.
- **Calculator**: Basic arithmetic with operator precedence.
- **Tic-Tac-Toe**: A local two-player game.
- **Todo List**: Add, complete, and delete tasks stored in the current browser.
- **Desktop controls**: Drag, minimize, maximize, and restore windows. Windows stay within the available screen area and use a full-window layout on phones.
- **Classic shell**: Matching Chicago95 bitmap icons, label-only desktop selection, beveled windows, an icon-based Start menu, and taskbar buttons that track the active window.

## Run Locally

1. Clone or download this repository.
2. Open [index.html](index.html) in a modern browser.
3. Double-click a desktop icon, or choose a utility from the Start menu. On a touchscreen, tap an icon once.

The interface works as a static file. For deployment, use an HTTPS static host. The Screen Wake Lock API requires a secure context and browser support; localhost is also suitable for development. Local-file wake lock support may vary by browser.

Internet access is needed for the external [98.css](https://jdan.github.io/98.css/) stylesheet and fonts, [Chicago95](https://github.com/grassmunk/Chicago95) icons, and [DOMPurify](https://github.com/cure53/DOMPurify). DOMPurify is version-pinned and verified with Subresource Integrity.

## Desktop Interaction

- Hovering does not select an icon. A single mouse click selects its label; a double click opens the app. Clicking empty desktop space clears the selection.
- Tab focuses the desktop selection. Arrow keys move between nearby icons; Home and End select the first and last. Space selects, Enter opens, and Escape clears the selection.
- The Start menu supports arrow keys, Home, End, and typing the first letter of an app. Enter or Space opens it; Escape closes the menu and returns focus to Start.
- A taskbar button brings a background window forward. Clicking the active window's button minimizes it. Closing or minimizing restores focus to the next visible window or the desktop.
- Double-click a title bar to maximize or restore a window. Hover over the clock to see the full date.

## Wake Lock Behavior

- A screen wake lock asks the browser to keep the display on. It does not guarantee that the operating system or other applications will keep running.
- Browsers can deny or release a lock because of battery settings, permissions, or page visibility. The status reports whether a request succeeded.
- Switching away from the page releases its locks. Returning requests them again only if the manual control is still enabled or the timer is still running.
- Manual and timer locks are independent. Pausing, resetting, or closing the timer releases its lock without disabling the manual lock. Minimizing the timer leaves it running.
- A delayed request is released if it is no longer needed. An expired timer does not acquire another lock when the page becomes visible again.
- The timer still counts down when wake lock is unavailable. Browser suspension can delay display updates or the alarm; the countdown catches up when execution resumes. Sound also depends on browser audio policies.

See [MDN's compatibility table](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API#browser_compatibility) for current browser support.

## Local Data

Notes are saved with the Save button. Task changes are saved automatically. Both use local storage in the current browser and origin; they are not synchronized between devices. Clearing browser data removes them. Download notes to keep a separate copy.

## Tests

With Node.js 22 or later, run:

```sh
node --test tests/script.test.cjs
```

The dependency-free tests exercise the application event handlers with controlled browser objects and clocks. They cover wake lock races, cancellation, visibility changes, timer drift, pause/resume, input bounds, safe preview fallback, desktop selection, mouse/touch/keyboard activation, taskbar focus, and Start menu navigation. Real DOM sanitization, icon loading, hover/focus styling, and responsive layout should also be checked in a browser.

## License

This project is licensed under the [MIT License](LICENSE).
