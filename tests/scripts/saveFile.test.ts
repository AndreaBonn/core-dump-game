import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  createFileStore,
  handleSaveRequest,
  isSameOrigin,
  isSaveRoute,
  MAX_SAVE_BYTES,
} from '../../scripts/lib/saveFile.mjs';

const HOST = 'localhost:4173';

function memoryStore(initial: string | null = null) {
  let saved = initial;
  return {
    read: () => saved,
    write: (text: string) => {
      saved = text;
    },
    current: () => saved,
  };
}

describe('isSameOrigin', () => {
  it('accepts a request without an Origin header', () => {
    expect(isSameOrigin(undefined, HOST)).toBe(true);
  });

  it('accepts the page own origin', () => {
    expect(isSameOrigin('http://localhost:4173', HOST)).toBe(true);
  });

  it('refuses another site', () => {
    expect(isSameOrigin('https://evil.example', HOST)).toBe(false);
  });

  it('refuses the same host on another port', () => {
    expect(isSameOrigin('http://localhost:5173', HOST)).toBe(false);
  });

  it('refuses an unparseable origin', () => {
    expect(isSameOrigin('null', HOST)).toBe(false);
  });
});

describe('handleSaveRequest', () => {
  it('answers 204 to a GET when there is no save yet', () => {
    expect(handleSaveRequest({ method: 'GET', host: HOST }, memoryStore())).toEqual({
      status: 204,
    });
  });

  it('returns the saved text on a GET', () => {
    const store = memoryStore('{"earned":[]}');

    expect(handleSaveRequest({ method: 'GET', host: HOST }, store)).toEqual({
      status: 200,
      body: '{"earned":[]}',
    });
  });

  it('stores a JSON object sent with PUT', () => {
    const store = memoryStore();

    const result = handleSaveRequest({ method: 'PUT', host: HOST, body: '{"a":1}' }, store);

    expect(result.status).toBe(204);
    expect(store.current()).toBe('{"a":1}');
  });

  it.each(['not json', '[1,2]', 'null', '42'])('refuses %s as a save with 400', (body) => {
    const store = memoryStore('{"kept":true}');

    expect(handleSaveRequest({ method: 'PUT', host: HOST, body }, store).status).toBe(400);
    expect(store.current()).toBe('{"kept":true}');
  });

  it('refuses a body over the size cap with 413', () => {
    const store = memoryStore();
    const body = JSON.stringify({ pad: 'x'.repeat(MAX_SAVE_BYTES) });

    expect(handleSaveRequest({ method: 'PUT', host: HOST, body }, store).status).toBe(413);
    expect(store.current()).toBeNull();
  });

  it('refuses a write from another origin with 403', () => {
    const store = memoryStore('{"kept":true}');

    const result = handleSaveRequest(
      { method: 'PUT', host: HOST, origin: 'https://evil.example', body: '{}' },
      store,
    );

    expect(result.status).toBe(403);
    expect(store.current()).toBe('{"kept":true}');
  });

  it('refuses other methods with 405', () => {
    expect(handleSaveRequest({ method: 'DELETE', host: HOST }, memoryStore()).status).toBe(405);
  });
});

describe('isSaveRoute', () => {
  it('matches the route with or without a query string', () => {
    expect(isSaveRoute('/api/save')).toBe(true);
    expect(isSaveRoute('/api/save?t=1')).toBe(true);
  });

  it('does not match other paths', () => {
    expect(isSaveRoute('/api/saves')).toBe(false);
    expect(isSaveRoute('/')).toBe(false);
    expect(isSaveRoute(undefined)).toBe(false);
  });
});

describe('createFileStore', () => {
  let dir: string;

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('reads null when the file does not exist', () => {
    dir = mkdtempSync(join(tmpdir(), 'save-'));

    expect(createFileStore(join(dir, 'save', 'progress.json')).read()).toBeNull();
  });

  it('creates the folder on first write and reads the text back', () => {
    dir = mkdtempSync(join(tmpdir(), 'save-'));
    const path = join(dir, 'save', 'progress.json');
    const store = createFileStore(path);

    store.write('{"a":1}');

    expect(readFileSync(path, 'utf8')).toBe('{"a":1}');
    expect(store.read()).toBe('{"a":1}');
  });

  it('replaces the previous save', () => {
    dir = mkdtempSync(join(tmpdir(), 'save-'));
    const path = join(dir, 'progress.json');
    writeFileSync(path, '{"old":true}');

    createFileStore(path).write('{"new":true}');

    expect(readFileSync(path, 'utf8')).toBe('{"new":true}');
  });
});
