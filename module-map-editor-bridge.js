(() => {
  let injected = false;
  let pendingPdfModule = null;

  function slugify(value){
    return String(value || 'module').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'') || 'module';
  }

  function makeModule(detail){
    const state = detail.state || (window.getModuleMapEditorState ? window.getModuleMapEditorState() : null);
    const title = pendingPdfModule?.title || 'Extracted PDF Module';
    const id = `${slugify(title)}-${Date.now()}`;
    return {
      schemaVersion: '0.1.0',
      id,
      path: `memory:${id}`,
      title,
      subtitle: 'In-memory module extracted from uploaded PDF map page',
      system: 'PDF extracted module draft',
      source: {
        fileName: pendingPdfModule?.fileName || '',
        page: pendingPdfModule?.page || null,
        notes: 'Created in-browser by the Module Map Editor PDF extraction bridge. Export JSON/SVG to persist it.'
      },
      general: {
        size: state ? `${state.width} x ${state.height}` : 'Unknown',
        status: 'draft extracted from PDF'
      },
      map: {
        image: '',
        width: state?.width || 39,
        height: state?.height || 39,
        grid: state ? `${state.width} x ${state.height}` : '39 x 39'
      },
      hotspots: [],
      rooms: [],
      doors: [],
      mapEditorState: state || null,
      extractionStatus: {
        map: 'Extracted from uploaded PDF page into editable tile grid.',
        persistence: 'In-memory until exported or committed.'
      }
    };
  }

  function status(message){
    const el = document.querySelector('#mme-status');
    if(el) el.textContent = message;
  }

  function injectButton(){
    if(injected) return;
    const root = document.querySelector('#module-map-editor-root');
    const fileInput = document.querySelector('#mme-image');
    const extractor = document.querySelector('#mme-extract-image');
    const actionRow = document.querySelector('.module-extractor-box .module-editor-actions');
    if(!root || !fileInput || !extractor || !actionRow) return;

    const button = document.createElement('button');
    button.id = 'mme-extract-new-module-pdf';
    button.type = 'button';
    button.textContent = 'Extract New Module From PDF';
    button.title = 'Rasterize the selected PDF page, extract the grid, create a new in-memory module, and show it in the viewer above.';
    button.addEventListener('click', () => {
      const file = fileInput.files?.[0];
      if(!file){ status('Choose a PDF first.'); return; }
      if(!(file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))){ status('Extract New Module From PDF requires a PDF file. Use Create From PDF / Image for normal image extraction.'); return; }
      const page = document.querySelector('#mme-pdf-page')?.value || '1';
      pendingPdfModule = {
        fileName: file.name,
        page,
        title: file.name.replace(/\.pdf$/i,'') + ` — page ${page}`
      };
      status('Extracting PDF page into a new module draft…');
      extractor.click();
    });

    actionRow.insertBefore(button, actionRow.firstChild);
    injected = true;
  }

  document.addEventListener('module-map-editor-output', event => {
    if(!pendingPdfModule) return;
    const detail = event.detail || {};
    const module = makeModule(detail);
    document.dispatchEvent(new CustomEvent('module-map-editor-new-module', {
      detail: {
        module,
        svg: detail.svg,
        state: detail.state,
        title: module.title
      }
    }));
    status(`Created new module from PDF: ${module.title}`);
    pendingPdfModule = null;
  });

  const observer = new MutationObserver(injectButton);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectButton);
  else injectButton();
})();
