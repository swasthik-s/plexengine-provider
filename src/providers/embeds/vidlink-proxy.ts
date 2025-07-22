// src/providers/embeds/vidlink-proxy.ts
import { makeEmbed } from '@/providers/base';
import { createM3U8ProxyUrl } from '@/utils/proxy';

export const vidlinkEmbed = makeEmbed({
  id: 'vidlink-proxy',
  name: 'VidLink Proxy',
  rank: 110,
  async scrape(ctx) {
    ctx.progress(40);

    const streamHeaders = {
      referer: 'https://videostr.net/',
      origin: 'https://videostr.net',
    };

    ctx.progress(80);

    return {
      stream: [
        {
          type: 'hls',
          id: 'primary',
          playlist: createM3U8ProxyUrl(ctx.url, streamHeaders),
          flags: [],
          captions: [],
        },
      ],
    };
  },
});
