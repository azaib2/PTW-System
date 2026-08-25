const RELOAD_FLAG = 'hse_ptw_reload_after_chunk_error';

function isStaleChunkError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /Failed to fetch dynamically imported module|Loading chunk|error loading dynamically imported module/i.test(msg);
}

export async function safeDynamicImport<T>(importer: () => Promise<T>): Promise<T> {
  try {
    return await importer();
  } catch (err) {
    if (isStaleChunkError(err) && !sessionStorage.getItem(RELOAD_FLAG)) {
      sessionStorage.setItem(RELOAD_FLAG, '1');
      window.location.reload();
      return new Promise<T>(() => {});
    }
    throw err;
  }
}

export function clearStaleChunkReloadFlag() {
  sessionStorage.removeItem(RELOAD_FLAG);
}
