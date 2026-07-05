(() => {
  'use strict';
  // Temporarily disabled. The previous tiered access implementation reorganized live cards
  // with a page-wide mutation observer, which could crash the post-login route. Rebuild this
  // as static tiered markup or a narrowly scoped one-shot initializer before re-enabling.
  window.BlacklightTieredAccessConsoleDisabled = true;
})();
