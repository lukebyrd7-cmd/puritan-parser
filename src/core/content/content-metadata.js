/* ---------- Content metadata helpers ---------- */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  Object.assign(root, api);
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const CONTENT_TYPES = new Set(['vocabulary', 'glosses', 'grammar', 'bible', 'search-index']);
  const LOAD_STRATEGIES = new Set(['startup-small', 'lazy', 'runtime-cache']);

  function normalizeContentMetadata(item) {
    const metadata = Object.assign({
      id: '',
      language: 'unknown',
      type: 'unknown',
      path: '',
      version: '',
      source: '',
      sourceUrl: '',
      license: '',
      attribution: '',
      loadStrategy: 'lazy',
      notes: ''
    }, item || {});
    metadata.id = String(metadata.id || '').trim();
    metadata.language = String(metadata.language || 'unknown').trim().toLowerCase();
    metadata.type = String(metadata.type || 'unknown').trim().toLowerCase();
    metadata.path = String(metadata.path || '').trim();
    metadata.loadStrategy = String(metadata.loadStrategy || 'lazy').trim();
    return metadata;
  }

  function validateContentMetadata(item) {
    const metadata = normalizeContentMetadata(item);
    const errors = [];
    if (!metadata.id) errors.push('id is required');
    if (!CONTENT_TYPES.has(metadata.type)) errors.push(`unsupported type: ${metadata.type}`);
    if (!metadata.path) errors.push('path is required');
    if (metadata.path.startsWith('/') || metadata.path.includes('..')) errors.push('path must be a relative content path');
    if (!metadata.version) errors.push('version is required');
    if (!metadata.source) errors.push('source is required');
    if (!metadata.license) errors.push('license is required');
    if (!metadata.attribution) errors.push('attribution is required');
    if (!LOAD_STRATEGIES.has(metadata.loadStrategy)) errors.push(`unsupported loadStrategy: ${metadata.loadStrategy}`);
    return { metadata, errors, valid: errors.length === 0 };
  }

  function normalizeContentManifest(manifest) {
    const source = manifest || {};
    const items = Array.isArray(source.items) ? source.items.map(normalizeContentMetadata) : [];
    return { schemaVersion: Number(source.schemaVersion || 1), generated: source.generated || '', description: source.description || '', items };
  }

  return { CONTENT_TYPES, LOAD_STRATEGIES, normalizeContentMetadata, validateContentMetadata, normalizeContentManifest };
}));
