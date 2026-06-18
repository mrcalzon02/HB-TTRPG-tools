(() => {
  'use strict';

  const root = typeof window !== 'undefined' ? window : globalThis;

  class SurfaceGridToolbar {
    constructor(options = {}) {
      if (!options.root || !(options.root instanceof Element)) throw new Error('Surface grid toolbar requires a root Element.');
      if (!options.view || typeof options.view.setBrush !== 'function') throw new Error('Surface grid toolbar requires a surface-grid view.');
      this.root = options.root;
      this.view = options.view;
      this.brushApi = options.brushApi || root.KaysenderSurfaceGridBrushes;
      if (!this.brushApi) throw new Error('Surface grid brush API is not available.');
      this.palette = [...(options.palette || this.view.palette || [])];
      this.familyOrder = options.familyOrder || ['outline', 'terrain', 'elevation', 'slope', 'water', 'site', 'resource', 'hazard'];
      this.onBrushChange = typeof options.onBrushChange === 'function' ? options.onBrushChange : null;
      this.render();
    }

    setPalette(palette = [], brushId = null) {
      this.palette = [...palette];
      this.view.setPalette(this.palette, brushId);
      this.render();
    }

    selectBrush(brushId) {
      this.view.setBrush(brushId);
      this.render();
      const brush = this.palette.find(item => item.id === brushId) || null;
      this.onBrushChange?.(brush);
      return brush;
    }

    render() {
      this.root.classList.add('kaysender-surface-toolbar');
      this.root.replaceChildren();
      const groups = this.brushApi.groupPalette(this.palette);
      const orderedFamilies = [
        ...this.familyOrder.filter(family => groups[family]?.length),
        ...Object.keys(groups).filter(family => !this.familyOrder.includes(family))
      ];

      orderedFamilies.forEach(family => {
        const section = document.createElement('section');
        section.className = `surface-brush-family family-${family}`;
        const heading = document.createElement('div');
        heading.className = 'surface-brush-family-heading';
        heading.innerHTML = `<strong>${family}</strong><small>${groups[family].length} brushes</small>`;
        section.appendChild(heading);

        const controls = document.createElement('div');
        controls.className = 'surface-brush-list';
        groups[family].forEach(brush => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = `surface-brush-button${this.view.brushId === brush.id ? ' selected' : ''}`;
          button.dataset.brushId = brush.id;
          button.title = brush.description || brush.label;
          button.setAttribute('aria-pressed', this.view.brushId === brush.id ? 'true' : 'false');
          button.innerHTML = `<span class="surface-brush-code">${brush.code || brush.label.slice(0, 2).toUpperCase()}</span><span class="surface-brush-label">${brush.label}</span>`;
          button.addEventListener('click', () => this.selectBrush(brush.id));
          controls.appendChild(button);
        });
        section.appendChild(controls);
        this.root.appendChild(section);
      });
    }

    destroy() {
      this.root.replaceChildren();
      this.root.classList.remove('kaysender-surface-toolbar');
    }
  }

  root.KaysenderSurfaceGridToolbar = Object.freeze({ SurfaceGridToolbar });
})();
