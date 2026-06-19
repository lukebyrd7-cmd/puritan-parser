(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.PuritanParserMigrations = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const CURRENT_SCHEMA_VERSION = 1;

  function clone(value) {
    if (Array.isArray(value)) return value.map(clone);
    if (value && typeof value === 'object') return Object.assign({}, value);
    return value;
  }

  function payloadKey(kind) {
    if (kind === 'prefs') return 'preferences';
    if (kind === 'vocab') return 'progress';
    return kind;
  }

  function wrapLegacyPayload(value, kind) {
    const key = payloadKey(kind);
    if (value && typeof value === 'object' && !Array.isArray(value) && Object.prototype.hasOwnProperty.call(value, 'schemaVersion')) {
      const wrapped = clone(value);
      if (!Object.prototype.hasOwnProperty.call(wrapped, key)) wrapped[key] = kind === 'vocab' ? [] : {};
      return wrapped;
    }
    return { schemaVersion: 0, [key]: clone(value == null ? (kind === 'vocab' ? [] : {}) : value) };
  }

  const migrations = {
    1(payload, kind) {
      const key = payloadKey(kind);
      const next = wrapLegacyPayload(payload, kind);
      next.schemaVersion = 1;
      if (kind === 'vocab' && !Array.isArray(next[key])) next[key] = [];
      if ((kind === 'prefs' || kind === 'dashboard') && (!next[key] || typeof next[key] !== 'object' || Array.isArray(next[key]))) next[key] = {};
      return next;
    }
  };

  return { CURRENT_SCHEMA_VERSION, migrations, payloadKey, wrapLegacyPayload };
}));
