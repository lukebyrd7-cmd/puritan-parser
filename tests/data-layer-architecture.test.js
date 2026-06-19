const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function extractArray(source, name) {
  const pattern = new RegExp('const\\s+' + name + '\\s*=\\s*\\[([\\s\\S]*?)\\];');
  const match = source.match(pattern);
  if (!match) throw new Error(`Could not find ${name}`);
  return Function(`return [${match[1]}];`)();
}

function walkJs(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkJs(full);
    return full.endsWith('.js') ? [full] : [];
  });
}

test('service worker precaches every browser-loaded module from main entrypoint', () => {
  const mainScripts = extractArray(read('src/main.js'), 'PURITAN_PARSER_SCRIPTS').map(file => `./${file}`);
  const swFiles = extractArray(read('sw.js'), 'FILES');

  assert.ok(swFiles.includes('./src/main.js'));
  assert.deepEqual(mainScripts.filter(file => !swFiles.includes(file)), []);
});

test('localStorage access is isolated to the storage layer', () => {
  const offenders = walkJs('src')
    .filter(file => !file.startsWith(path.join('src', 'core', 'storage') + path.sep))
    .filter(file => read(file).includes('localStorage'));

  assert.deepEqual(offenders, []);
});
