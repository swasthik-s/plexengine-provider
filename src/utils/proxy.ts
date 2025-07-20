import { flags } from '@/entrypoint/utils/targets';
import { Stream } from '@/providers/streams';

// Default proxy URL for general purpose proxying
const DEFAULT_PROXY_URL = process.env.MOVIE_WEB_PROXY_URL || 'https://simple-proxy-v1.swasthikshetty101.workers.dev/';
// Default M3U8 proxy URL for HLS stream proxying - use the same proxy for both
let CONFIGURED_M3U8_PROXY_URL = (
  process.env.MOVIE_WEB_PROXY_URL || 'https://simple-proxy-v1.swasthikshetty101.workers.dev'
).replace(/\/$/, '');

/**
 * Set a custom M3U8 proxy URL to use for all M3U8 proxy requests
 * @param proxyUrl - The base URL of the M3U8 proxy
 */
export function setM3U8ProxyUrl(proxyUrl: string): void {
  CONFIGURED_M3U8_PROXY_URL = proxyUrl;
}

/**
 * Get the currently configured M3U8 proxy URL
 * @returns The configured M3U8 proxy URL
 */
export function getM3U8ProxyUrl(): string {
  return CONFIGURED_M3U8_PROXY_URL;
}

export function requiresProxy(_stream: Stream): boolean {
  // Always require proxy for all streams
  return true;
}

export function setupProxy(stream: Stream): Stream {
  const headers = stream.headers && Object.keys(stream.headers).length > 0 ? stream.headers : undefined;

  const options = {
    ...(stream.type === 'hls' && { depth: stream.proxyDepth ?? 0 }),
  };

  const payload: {
    type?: 'hls' | 'mp4';
    url?: string;
    headers?: Record<string, string>;
    options?: { depth?: 0 | 1 | 2 };
  } = {
    headers,
    options,
  };

  if (stream.type === 'hls') {
    payload.type = 'hls';
    payload.url = stream.playlist;
    stream.playlist = `${DEFAULT_PROXY_URL}?${new URLSearchParams({ payload: Buffer.from(JSON.stringify(payload)).toString('base64url') })}`;
  }

  if (stream.type === 'file') {
    payload.type = 'mp4';
    Object.entries(stream.qualities).forEach((entry) => {
      payload.url = entry[1].url;
      entry[1].url = `${DEFAULT_PROXY_URL}?${new URLSearchParams({ payload: Buffer.from(JSON.stringify(payload)).toString('base64url') })}`;
    });
  }

  stream.headers = {};
  stream.flags = [flags.CORS_ALLOWED];
  return stream;
}

/**
 * Creates a proxied M3U8 URL using the configured M3U8 proxy
 * @param url - The original M3U8 URL to proxy
 * @param headers - Headers to include with the request
 * @returns The proxied M3U8 URL
 */
export function createM3U8ProxyUrl(url: string, headers: Record<string, string> = {}): string {
  const encodedUrl = encodeURIComponent(url);
  const encodedHeaders = encodeURIComponent(JSON.stringify(headers));
  return `${CONFIGURED_M3U8_PROXY_URL}/m3u8-proxy?url=${encodedUrl}${headers ? `&headers=${encodedHeaders}` : ''}`;
}

/**
 * Updates an existing M3U8 proxy URL to use the currently configured proxy
 * @param url - The M3U8 proxy URL to update
 * @returns The updated M3U8 proxy URL
 */
export function updateM3U8ProxyUrl(url: string): string {
  if (url.includes('/m3u8-proxy?url=')) {
    return url.replace(/https:\/\/[^/]+\/m3u8-proxy/, `${CONFIGURED_M3U8_PROXY_URL}/m3u8-proxy`);
  }
  return url;
}
