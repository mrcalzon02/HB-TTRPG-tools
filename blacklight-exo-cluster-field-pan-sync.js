(() => {
  'use strict';

  function wait(attempt = 0) {
    const canvas = document.getElementById('exo-cluster-volume-canvas-v2');
    const overlay = document.getElementById('exo-cluster-lensing-plane-overlay');
    const reset = document.getElementById('exo-cluster-camera-reset');
    if (!canvas || !overlay || !reset) {
      if (attempt < 360) requestAnimationFrame(() => wait(attempt + 1));
      return;
    }

    let panX = 0;
    let panY = 0;
    let drag = null;

    canvas.addEventListener('pointerdown', event => {
      if (!event.shiftKey && event.button !== 1) return;
      drag = {id:event.pointerId, x:event.clientX, y:event.clientY, panX, panY};
    });
    canvas.addEventListener('pointermove', event => {
      if (!drag || drag.id !== event.pointerId) return;
      panX = drag.panX + event.clientX - drag.x;
      panY = drag.panY + event.clientY - drag.y;
      overlay.style.translate = `${panX}px ${panY}px`;
    });
    const finish = event => {
      if (drag?.id === event.pointerId) drag = null;
    };
    canvas.addEventListener('pointerup', finish);
    canvas.addEventListener('pointercancel', finish);
    reset.addEventListener('click', () => {
      panX = 0;
      panY = 0;
      overlay.style.translate = '0px 0px';
    });
  }

  wait();
})();
