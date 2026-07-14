// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// jsdom doesn't expose the Web Crypto API as a global the way real browsers
// do; yjs (via lib0/webcrypto.js) reads `crypto` at module-load time, so
// this has to run before any test file imports the editor/collaboration code.
if (typeof globalThis.crypto === 'undefined') {
  // eslint-disable-next-line global-require
  globalThis.crypto = require('node:crypto').webcrypto;
}

// jsdom doesn't implement IntersectionObserver; framer-motion's useInView
// (used by animated landing-page sections) needs it to exist at all, even
// though jsdom can't actually report real intersections.
if (typeof globalThis.IntersectionObserver === 'undefined') {
  globalThis.IntersectionObserver = class IntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  };
}
