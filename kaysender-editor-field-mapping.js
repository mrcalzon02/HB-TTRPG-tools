(() => {
  'use strict';

  function readPath(source, path) {
    if (typeof path === 'function') return path(source);
    if (!path) return undefined;
    return String(path).split('.').reduce((value, key) => value == null ? undefined : value[key], source);
  }

  function writeField(field, value) {
    if (!field || value === undefined || value === null) return false;
    if (field instanceof RadioNodeList) {
      Array.from(field).forEach(option => {
        option.checked = String(option.value) === String(value);
      });
      return true;
    }
    if (field.type === 'checkbox') {
      field.checked = Boolean(value);
      return true;
    }
    if (field.tagName === 'SELECT' && field.multiple && Array.isArray(value)) {
      const selected = new Set(value.map(String));
      Array.from(field.options).forEach(option => {
        option.selected = selected.has(option.value);
      });
      return true;
    }
    if (Array.isArray(value)) field.value = value.join(', ');
    else if (typeof value === 'object') field.value = JSON.stringify(value, null, 2);
    else field.value = value;
    return true;
  }

  function apply(form, profileInput, fieldMap = {}) {
    if (!form) return [];
    const data = profileInput?.data && profileInput?.profileId ? profileInput.data : profileInput;
    const applied = [];
    Object.entries(fieldMap).forEach(([fieldName, sourcePath]) => {
      const field = form.elements?.[fieldName];
      const value = readPath(data, sourcePath);
      if (writeField(field, value)) applied.push(fieldName);
    });
    return applied;
  }

  function applyFlat(form, profileInput, exclusions = []) {
    if (!form) return [];
    const data = profileInput?.data && profileInput?.profileId ? profileInput.data : profileInput;
    const excluded = new Set(exclusions);
    const fieldMap = {};
    Object.entries(data || {}).forEach(([key, value]) => {
      if (!excluded.has(key) && (value === null || typeof value !== 'object')) fieldMap[key] = key;
    });
    return apply(form, data, fieldMap);
  }

  window.KaysenderEditorFieldMapping = Object.freeze({
    readPath,
    writeField,
    apply,
    applyFlat
  });
})();
