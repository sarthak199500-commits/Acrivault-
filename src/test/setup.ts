import '@testing-library/jest-dom/vitest';

// jsdom doesn't implement matchMedia; provide a no-op so theme bootstrapping
// and any prefers-* checks don't throw under test.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}
