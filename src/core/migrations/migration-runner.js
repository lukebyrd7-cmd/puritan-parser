(function (root, factory) {
  const source = root.PuritanParserMigrations || (typeof require === 'function' ? require('./migrations') : {});
  const api = factory(source);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.PuritanParserMigrationRunner = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function (migrationSource) {
  const CURRENT_SCHEMA_VERSION = migrationSource.CURRENT_SCHEMA_VERSION || 1;
  const migrations = migrationSource.migrations || {};
  const payloadKey = migrationSource.payloadKey || (kind => kind);
  const wrapLegacyPayload = migrationSource.wrapLegacyPayload || ((value, kind) => ({ schemaVersion: 0, [payloadKey(kind)]: value }));

  function migratePayload(value, kind) {
    let payload = wrapLegacyPayload(value, kind);
    let version = Number(payload.schemaVersion) || 0;
    while (version < CURRENT_SCHEMA_VERSION) {
      const nextVersion = version + 1;
      const migrate = migrations[nextVersion];
      payload = migrate ? migrate(payload, kind) : Object.assign({}, payload, { schemaVersion: nextVersion });
      version = Number(payload.schemaVersion) || nextVersion;
    }
    if (version > CURRENT_SCHEMA_VERSION) return payload;
    return Object.assign({}, payload, { schemaVersion: CURRENT_SCHEMA_VERSION });
  }

  function unwrapPersistedData(payload, kind) {
    if (!payload || typeof payload !== 'object') return kind === 'vocab' ? [] : {};
    const key = payloadKey(kind);
    return Object.prototype.hasOwnProperty.call(payload, key) ? payload[key] : (kind === 'vocab' ? [] : {});
  }

  return { CURRENT_SCHEMA_VERSION, migratePayload, unwrapPersistedData };
}));
