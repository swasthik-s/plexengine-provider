// src/providers/sources/vidlink.ts
import { load } from 'cheerio';
import { makeSourcerer } from '@/providers/base';
import { NotFoundError } from '@/utils/errors';
import { MovieScrapeContext } from '@/utils/context';

const baseUrl = 'https://vidlink.pro';

async function scrapeVidlink(ctx: MovieScrapeContext) {
  const movieId = ctx.media.tmdbId;
  const url = `${baseUrl}/movie/${movieId}`;

  ctx.progress(50);

  const html = await ctx.proxiedFetcher(url);
  const $ = load(html);

  const videoSrc = $('video').attr('src');
  if (!videoSrc || !videoSrc.includes('hurricane.vidlvod.store')) {
    throw new NotFoundError('Video source not found in <video> tag');
  }

  ctx.progress(90);

  return {
    embeds: [
      {
        embedId: 'vidlink-proxy',
        url: videoSrc,
      },
    ],
  };
}

export const vidlinkSourcerer = makeSourcerer({
  id: 'vidlink',
  name: 'VidLink',
  rank: 100,
  disabled: false,
  flags: [],
  scrapeMovie: scrapeVidlink,
  scrapeShow: async () => {
    throw new Error('Shows not supported on VidLink');
  },
});
