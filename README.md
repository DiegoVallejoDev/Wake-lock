# Wake Lock - Retro 90s Web Page

This project is a simple web page designed with a retro style inspired by 90s websites. The page includes functionality to prevent the device from going to sleep using the **Screen Wake Lock API**.

## Features

- **Retro design**: Gray background, monospace font, and a minimalist layout.
- **Wake Lock functionality**: Keeps the screen active when the button is clicked.

## How It Works

1. The page includes a button that requests a **Wake Lock** using the Screen Wake Lock API.
2. When the page is in focus, and the button is clicked, it prevents the screen from going to sleep.
3. The status of the wake lock is displayed on the page.

## Setup

To use this project:

1. Download or clone the repository.
2. Open the `index.html` file in a modern browser.
3. Click the "Enable Wake Lock" button to activate the wake lock and prevent your computer from sleeping.

### Requirements

- Modern browser with support for the **Screen Wake Lock API** (e.g., Chrome, Edge, Firefox).

## Browser Support

The Screen Wake Lock API is supported in most modern browsers, but it may not be available in older browsers or some mobile versions. Check the [MDN documentation](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API#browser_compatibility) for up-to-date compatibility.

## License

This project is licensed under the MIT License.
