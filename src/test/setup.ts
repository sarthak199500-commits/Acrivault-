import '@testing-library/jest-dom/vitest';

// jsdom doesn't implement matchMedia; provide a no-op so theme bootstrapping
// and any prefers-* checks don't throw under test.
// jsdom doesn't implement ResizeObserver either. Radix reaches for it through
// `react-use-size` (Checkbox's indicator, among others), so any test rendering one
// throws in a layout effect without this. Measurements are meaningless in jsdom,
// so a no-op observer is the honest stand-in.
if (!window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

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
