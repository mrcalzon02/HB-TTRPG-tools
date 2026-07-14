(() => {
  'use strict';

  const MAX_PIXEL_RATIO = 1.25;
  const MIN_WIDTH = 480;
  const MIN_HEIGHT = 420;

  function initialize() {
    const stage = document.querySelector('.exo-orbit-stage');
    const canvas = document.getElementById('exo-exclusive-canvas-3d');
    if (!stage || !canvas) {
      requestAnimationFrame(initialize);
      return;
    }
    if (canvas.dataset.performanceGovernor === 'true') return;
    canvas.dataset.performanceGovernor = 'true';

    let visible = true;
    let adjusting = false;
    let queued = false;

    function schedule() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        enforceBackingResolution();
      });
    }

    function enforceBackingResolution() {
      if (adjusting) return;
      adjusting = true;
      try {
        const active3d = stage.classList.contains('exo-exclusive-3d');
        if (!active3d || !visible || document.hidden) {
          if (canvas.width !== 1) canvas.width = 1;
          if (canvas.height !== 1) canvas.height = 1;
          return;
        }

        const width = Math.max(MIN_WIDTH, Math.round(stage.clientWidth));
        const height = Math.max(MIN_HEIGHT, Math.round(stage.clientHeight));
        const ratio = Math.min(MAX_PIXEL_RATIO, window.devicePixelRatio || 1);
        const targetWidth = Math.round(width * ratio);
        const targetHeight = Math.round(height * ratio);
        if (canvas.width !== targetWidth) canvas.width = targetWidth;
        if (canvas.height !== targetHeight) canvas.height = targetHeight;
        if (canvas.style.width !== `${width}px`) canvas.style.width = `${width}px`;
        if (canvas.style.height !== `${height}px`) canvas.style.height = `${height}px`;
      } finally {
        adjusting = false;
      }
    }

    new ResizeObserver(schedule).observe(stage);
    new MutationObserver(schedule).observe(stage, {attributes:true, attributeFilter:['class']});
    new MutationObserver(schedule).observe(canvas, {attributes:true, attributeFilter:['width','height']});

    const intersection = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting);
      schedule();
    }, {rootMargin:'180px'});
    intersection.observe(stage);

    document.getElementById('exo-view-flat')?.addEventListener('click', schedule);
    document.getElementById('exo-view-3d')?.addEventListener('click', schedule);
    window.addEventListener('resize', schedule, {passive:true});
    document.addEventListener('visibilitychange', schedule);

    schedule();
  }

  initialize();
})();
