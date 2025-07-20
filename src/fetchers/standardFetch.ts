import { serializeBody } from '@/fetchers/body';
import { makeFullUrl } from '@/fetchers/common';
import { FetchLike, FetchReply } from '@/fetchers/fetch';
import { Fetcher } from '@/fetchers/types';

function getHeaders(list: string[], res: FetchReply): Headers {
  const output = new Headers();
  list.forEach((header) => {
    const realHeader = header.toLowerCase();
    const realValue = res.headers.get(realHeader);
    const extraValue = res.extraHeaders?.get(realHeader);
    const value = extraValue ?? realValue;
    if (!value) return;
    output.set(realHeader, value);
  });
  return output;
}

export function makeStandardFetcher(f: FetchLike): Fetcher {
  const normalFetch: Fetcher = async (url, ops) => {
    const fullUrl = makeFullUrl(url, ops);
    const seralizedBody = serializeBody(ops.body);

    // AbortController
    const controller = new AbortController();
    const timeout = 15000; // 15s timeout
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const requestHeaders = { ...seralizedBody.headers, ...ops.headers };
      const res = await f(fullUrl, {
        method: ops.method,
        headers: requestHeaders,
        body: seralizedBody.body,
        credentials: ops.credentials,
        signal: controller.signal, // Pass the signal to fetch
      });

      clearTimeout(timeoutId);

      let body: any;
      const isJson = res.headers.get('content-type')?.includes('application/json');
      if (isJson) body = await res.json();
      else body = await res.text();

      // If debug flag is set, include request info in the response
      if (ops && (ops as any).debug) {
        return {
          body,
          finalUrl: res.extraUrl ?? res.url,
          headers: getHeaders(ops.readHeaders, res),
          statusCode: res.status,
          debug: {
            requestUrl: fullUrl,
            requestHeaders,
          },
        };
      }

      return {
        body,
        finalUrl: res.extraUrl ?? res.url,
        headers: getHeaders(ops.readHeaders, res),
        statusCode: res.status,
      };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error(`Fetch request to ${fullUrl} timed out after ${timeout}ms`);
      }
      throw error;
    }
  };

  return normalFetch;
}
