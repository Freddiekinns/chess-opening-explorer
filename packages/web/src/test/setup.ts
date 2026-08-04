import '@testing-library/jest-dom';
import { beforeEach } from 'vitest';
import { __resetSearchIndexForTests } from '../lib/searchIndex';

// The search index is cached for the lifetime of the page, which in a test file
// is the lifetime of the file. Left alone, the first test's fixture answers
// every later test's search — and silently, because the surfaces are meant to
// work whether or not the index has loaded.
beforeEach(() => {
  __resetSearchIndexForTests();
});

// Setup for tests
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// IntersectionObserver that reports every observed element as immediately
// visible — components under test behave as if scrolled into view.
(global as any).IntersectionObserver = class IntersectionObserver {
  private cb: (entries: { isIntersecting: boolean; target: Element }[], observer: this) => void;

  constructor(
    cb: (entries: { isIntersecting: boolean; target: Element }[], observer: any) => void
  ) {
    this.cb = cb;
  }
  observe(target: Element) {
    this.cb([{ isIntersecting: true, target }], this);
  }
  unobserve() {}
  disconnect() {}
};

// Provide consistent element sizing for react-chessboard in JSDOM.
Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
  configurable: true,
  get() {
    return 400;
  },
});

Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
  configurable: true,
  get() {
    return 400;
  },
});

HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
  return {
    width: 400,
    height: 400,
    top: 0,
    left: 0,
    bottom: 400,
    right: 400,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect;
};

// Mock AudioContext for practice mode audio
class MockAudioContext {
  state = 'running';
  createBufferSource() {
    return {
      buffer: null,
      connect: () => {},
      start: () => {},
      stop: () => {},
    };
  }
  createOscillator() {
    return {
      frequency: { value: 440 },
      type: 'sine',
      connect: () => {},
      start: () => {},
      stop: () => {},
    };
  }
  createGain() {
    return {
      gain: {
        value: 1,
        setValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {},
      },
      connect: () => {},
    };
  }
  decodeAudioData() {
    return Promise.resolve({});
  }
  resume() {
    return Promise.resolve();
  }
  get destination() {
    return {};
  }
  get currentTime() {
    return 0;
  }
}

(global as any).AudioContext = MockAudioContext;
(global as any).webkitAudioContext = MockAudioContext;

// Mock canvas context for chessboard
(global as any).HTMLCanvasElement.prototype.getContext = () => ({
  fillRect: () => {},
  clearRect: () => {},
  getImageData: () => ({ data: new Uint8ClampedArray(4) }),
  putImageData: () => {},
  createImageData: () => ({
    data: new Uint8ClampedArray(4),
    width: 0,
    height: 0,
    colorSpace: 'srgb',
  }),
  setTransform: () => {},
  drawImage: () => {},
  save: () => {},
  fillText: () => {},
  restore: () => {},
  beginPath: () => {},
  moveTo: () => {},
  lineTo: () => {},
  closePath: () => {},
  stroke: () => {},
  translate: () => {},
  scale: () => {},
  rotate: () => {},
  arc: () => {},
  fill: () => {},
  measureText: () => ({
    width: 0,
    actualBoundingBoxAscent: 0,
    actualBoundingBoxDescent: 0,
    actualBoundingBoxLeft: 0,
    actualBoundingBoxRight: 0,
    alphabeticBaseline: 0,
    emHeightAscent: 0,
    emHeightDescent: 0,
    fontBoundingBoxAscent: 0,
    fontBoundingBoxDescent: 0,
    hangingBaseline: 0,
    ideographicBaseline: 0,
  }),
  transform: () => {},
  rect: () => {},
  clip: () => {},
});
