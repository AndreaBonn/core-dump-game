import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  flushSaveFile,
  isSaveFileAvailable,
  loadSaveFile,
  resetSaveFileForTests,
  writeSaveFile,
} from '@/services/saveFileService';

function reply(status: number, body: string | null, contentType = 'application/json'): Response {
  return new Response(body, { status, headers: { 'Content-Type': contentType } });
}

describe('saveFileService', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    resetSaveFileForTests();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns the saved text and enables writes', async () => {
    fetchMock.mockResolvedValueOnce(reply(200, '{"earned":[]}'));

    expect(await loadSaveFile()).toBe('{"earned":[]}');
    expect(isSaveFileAvailable()).toBe(true);
  });

  it('enables writes when the launcher has no save yet', async () => {
    fetchMock.mockResolvedValueOnce(reply(204, null));

    expect(await loadSaveFile()).toBeNull();
    expect(isSaveFileAvailable()).toBe(true);
  });

  it('treats an HTML answer from a static host as no launcher', async () => {
    fetchMock.mockResolvedValueOnce(reply(200, '<!doctype html>', 'text/html'));

    expect(await loadSaveFile()).toBeNull();
    expect(isSaveFileAvailable()).toBe(false);
  });

  it('treats a network error as no launcher', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    expect(await loadSaveFile()).toBeNull();
    expect(isSaveFileAvailable()).toBe(false);
  });

  it('does not write before the save file has been read', async () => {
    writeSaveFile('{"a":1}');
    await flushSaveFile();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('writes with PUT once the save file has been read, in order', async () => {
    fetchMock.mockResolvedValueOnce(reply(204, null));
    await loadSaveFile();
    fetchMock.mockResolvedValue(reply(204, null));

    writeSaveFile('{"n":1}');
    writeSaveFile('{"n":2}');
    await flushSaveFile();

    const puts = fetchMock.mock.calls.slice(1);
    expect(puts.map(([, init]) => init.method)).toEqual(['PUT', 'PUT']);
    expect(puts.map(([, init]) => init.body)).toEqual(['{"n":1}', '{"n":2}']);
  });

  it('warns with the status when the launcher refuses a write, then keeps writing', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    fetchMock.mockResolvedValueOnce(reply(204, null));
    await loadSaveFile();
    fetchMock.mockResolvedValueOnce(reply(413, null));
    fetchMock.mockResolvedValueOnce(reply(204, null));

    writeSaveFile('{"n":1}');
    writeSaveFile('{"n":2}');
    await flushSaveFile();

    expect(warn).toHaveBeenCalledWith('Save file write refused with status 413');
    expect(fetchMock.mock.calls[2]?.[1].body).toBe('{"n":2}');
  });

  it('keeps writing after a failed write', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    fetchMock.mockResolvedValueOnce(reply(204, null));
    await loadSaveFile();
    fetchMock.mockRejectedValueOnce(new TypeError('offline'));
    fetchMock.mockResolvedValueOnce(reply(204, null));

    writeSaveFile('{"n":1}');
    writeSaveFile('{"n":2}');
    await flushSaveFile();

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[2]?.[1].body).toBe('{"n":2}');
  });
});
