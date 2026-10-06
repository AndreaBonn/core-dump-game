import { EventEmitter } from 'node:events';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createFileStore,
  handleSaveRequest,
  isLoopbackHost,
  isSameOrigin,
  isSaveRoute,
  MAX_SAVE_BYTES,
  SAVE_ROUTE,
  saveFilePlugin,
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

describe('isLoopbackHost', () => {
  it.each(['localhost:4173', '127.0.0.1:4173', '[::1]:4173', 'localhost', 'LOCALHOST:4173'])(
    'accepts the loopback host %s',
    (host) => {
      expect(isLoopbackHost(host)).toBe(true);
    },
  );

  it.each([
    'evil.example:4173',
    'localhost.evil.example:4173',
    '192.168.1.20:5173',
    '127.0.0.2:4173',
    'evil.example@localhost:4173',
    'localhost.:4173',
    '',
    'not a host',
  ])('refuses %s', (host) => {
    expect(isLoopbackHost(host)).toBe(false);
  });

  it('refuses a missing Host header', () => {
    expect(isLoopbackHost(undefined)).toBe(false);
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

  it('refuses a DNS-rebinding request, whose Origin matches a foreign Host, with 403', () => {
    const store = memoryStore('{"kept":true}');
    const rebound = { host: 'evil.example:4173', origin: 'http://evil.example:4173' };

    expect(handleSaveRequest({ method: 'GET', ...rebound }, store).status).toBe(403);
    expect(handleSaveRequest({ method: 'PUT', ...rebound, body: '{}' }, store).status).toBe(403);
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

type Middleware = (req: FakeRequest, res: FakeResponse, next: () => void) => Promise<void>;

class FakeRequest extends EventEmitter {
  destroyed = false;
  headers = { host: HOST };
  constructor(
    readonly method: string,
    readonly url: string,
  ) {
    super();
  }
  destroy() {
    this.destroyed = true;
  }
}

class FakeResponse {
  status = 0;
  body: string | undefined;
  readonly done: Promise<void>;
  private finish: () => void = () => {};
  constructor() {
    this.done = new Promise((resolve) => {
      this.finish = resolve;
    });
  }
  writeHead(status: number) {
    this.status = status;
  }
  end(body?: string) {
    this.body = body;
    this.finish();
  }
}

function mountPlugin(filePath: string): Middleware {
  let middleware: Middleware | undefined;
  saveFilePlugin(filePath).configurePreviewServer({
    middlewares: { use: (handler: Middleware) => (middleware = handler) },
  });
  return middleware!;
}

async function send(middleware: Middleware, req: FakeRequest, chunks: string[] = []) {
  const res = new FakeResponse();
  const handled = middleware(req, res, () => {});
  for (const chunk of chunks) {
    req.emit('data', Buffer.from(chunk));
  }
  req.emit('end');
  await handled;
  return res;
}

describe('saveFilePlugin', () => {
  let dir: string;

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('passes requests for other paths on to the next handler', async () => {
    dir = mkdtempSync(join(tmpdir(), 'save-'));
    const middleware = mountPlugin(join(dir, 'progress.json'));
    const next = vi.fn();

    await middleware(new FakeRequest('GET', '/index.html'), new FakeResponse(), next);

    expect(next).toHaveBeenCalledOnce();
  });

  it('stores a PUT body on disk and serves it back on the next GET', async () => {
    dir = mkdtempSync(join(tmpdir(), 'save-'));
    const middleware = mountPlugin(join(dir, 'progress.json'));

    const put = await send(middleware, new FakeRequest('PUT', SAVE_ROUTE), ['{"earned":', '[]}']);
    const get = await send(middleware, new FakeRequest('GET', SAVE_ROUTE));

    expect(put.status).toBe(204);
    expect(get).toMatchObject({ status: 200, body: '{"earned":[]}' });
  });

  it('answers 413 and stops reading a streamed body that passes the cap', async () => {
    dir = mkdtempSync(join(tmpdir(), 'save-'));
    const path = join(dir, 'progress.json');
    const middleware = mountPlugin(path);
    const req = new FakeRequest('PUT', SAVE_ROUTE);
    const half = 'x'.repeat(MAX_SAVE_BYTES / 2 + 1);

    const res = await send(middleware, req, [half, half]);

    expect(res.status).toBe(413);
    expect(req.destroyed).toBe(true);
    expect(existsSync(path)).toBe(false);
  });

  it('answers 500 and logs when the save file cannot be read', async () => {
    dir = mkdtempSync(join(tmpdir(), 'save-'));
    const path = join(dir, 'progress.json');
    mkdirSync(path);
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    const middleware = mountPlugin(path);

    const res = await send(middleware, new FakeRequest('GET', SAVE_ROUTE));

    expect(res.status).toBe(500);
    expect(logged).toHaveBeenCalledOnce();
  });
});
