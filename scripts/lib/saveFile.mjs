// Save file served by the local launcher, so progress lives in the game folder
// and survives a different browser, a cleared browser cache or a port change.
// Only `vite preview` and `vite dev` mount it: the hosted build has no server
// and keeps using browser storage alone.

import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export const SAVE_ROUTE = '/api/save';
/** The profile is a few KB; anything far larger is not a save. */
export const MAX_SAVE_BYTES = 64 * 1024;

const JSON_HEADERS = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };

/**
 * Same-origin check. A page on another site can still fire a request at
 * localhost; the browser sends its Origin, and that is what gets refused here.
 * A missing Origin is a same-origin GET or a non-browser client, both fine.
 *
 * @param {string | undefined} origin
 * @param {string | undefined} host
 * @returns {boolean}
 */
export function isSameOrigin(origin, host) {
  if (!origin) {
    return true;
  }
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * Whether a request URL targets the save route, ignoring any query string.
 *
 * @param {string | undefined} url
 * @returns {boolean}
 */
export function isSaveRoute(url) {
  if (!url) {
    return false;
  }
  return new URL(url, 'http://localhost').pathname === SAVE_ROUTE;
}

/**
 * Decide the response for one request. Pure apart from the injected store, so
 * the rules are testable without a server.
 *
 * @param {{ method: string, origin?: string, host?: string, body?: string }} request
 * @param {{ read: () => string | null, write: (text: string) => void }} store
 * @returns {{ status: number, body?: string }}
 */
export function handleSaveRequest(request, store) {
  if (!isSameOrigin(request.origin, request.host)) {
    return { status: 403 };
  }
  if (request.method === 'GET') {
    const saved = store.read();
    return saved === null ? { status: 204 } : { status: 200, body: saved };
  }
  if (request.method !== 'PUT') {
    return { status: 405 };
  }
  const body = request.body ?? '';
  if (Buffer.byteLength(body, 'utf8') > MAX_SAVE_BYTES) {
    return { status: 413 };
  }
  try {
    const parsed = JSON.parse(body);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { status: 400 };
    }
  } catch {
    return { status: 400 };
  }
  store.write(body);
  return { status: 204 };
}

/**
 * Environment variable that moves the save file elsewhere. The end-to-end
 * suite sets it so its runs never write into the player's own save.
 */
export const SAVE_FILE_ENV = 'CORE_DUMP_SAVE_FILE';

/**
 * The save file to use: the one the environment names, or `defaultPath`.
 *
 * @param {Record<string, string | undefined>} env usually process.env
 * @param {string} defaultPath the player's save file
 * @returns {string}
 */
export function resolveSaveFilePath(env, defaultPath) {
  const configured = env[SAVE_FILE_ENV]?.trim();
  return configured ? configured : defaultPath;
}

/**
 * File-backed store. The write goes to a sibling temp file and is renamed over
 * the save, so a crash or power loss mid-write leaves the previous save intact
 * instead of a truncated one.
 *
 * @param {string} filePath
 */
export function createFileStore(filePath) {
  return {
    read() {
      try {
        return readFileSync(filePath, 'utf8');
      } catch (error) {
        if (error && error.code === 'ENOENT') {
          return null;
        }
        throw error;
      }
    },
    write(text) {
      mkdirSync(dirname(filePath), { recursive: true });
      const temp = `${filePath}.tmp`;
      writeFileSync(temp, text, 'utf8');
      renameSync(temp, filePath);
    },
  };
}

/** Collect the request body, stopping as soon as it passes the size cap. */
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_SAVE_BYTES) {
        resolve(null);
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function createMiddleware(store) {
  return async (req, res, next) => {
    if (!isSaveRoute(req.url)) {
      next();
      return;
    }
    try {
      const body = req.method === 'PUT' ? await readBody(req) : undefined;
      const result =
        body === null
          ? { status: 413 }
          : handleSaveRequest(
              {
                method: req.method ?? '',
                origin: req.headers.origin,
                host: req.headers.host,
                body,
              },
              store,
            );
      res.writeHead(result.status, JSON_HEADERS);
      res.end(result.body);
    } catch (error) {
      console.error(`[save] ${req.method} ${SAVE_ROUTE} failed:`, error);
      res.writeHead(500, JSON_HEADERS);
      res.end();
    }
  };
}

/**
 * Vite plugin mounting the save route on both the preview server (what the
 * launcher runs) and the dev server.
 *
 * @param {string} filePath absolute path of the save file
 */
export function saveFilePlugin(filePath) {
  const store = createFileStore(filePath);
  return {
    name: 'core-dump-save-file',
    configureServer(server) {
      server.middlewares.use(createMiddleware(store));
    },
    configurePreviewServer(server) {
      server.middlewares.use(createMiddleware(store));
    },
  };
}
