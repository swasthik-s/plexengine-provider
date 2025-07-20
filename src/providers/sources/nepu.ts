import { flags } from '@/entrypoint/utils/targets';
import { SourcererOutput, makeSourcerer } from '@/providers/base';
import { MovieScrapeContext, ShowScrapeContext } from '@/utils/context';
import { NotFoundError } from '@/utils/errors';

const nepuBase = 'https://nscrape.andresdev.org/api';

async function scrape(ctx: MovieScrapeContext | ShowScrapeContext): Promise<SourcererOutput> {
  const tmdbId = ctx.media.tmdbId;

  let url: string;
  if (ctx.media.type === 'movie') {
    url = `${nepuBase}/get-stream?tmdbId=${tmdbId}`;
  } else {
    url = `${nepuBase}/get-show-stream?tmdbId=${tmdbId}&season=${ctx.media.season.number}&episode=${ctx.media.episode.number}`;
  }

  const response = await ctx.proxiedFetcher<any>(url);

  if (!response.success || !response.rurl) {
    throw new NotFoundError('No stream found');
  }

  return {
    stream: [
      {
        id: 'nepu',
        type: 'hls',
        playlist: response.rurl,
        flags: [flags.CORS_ALLOWED],
        captions: [],
      },
    ],
    embeds: [],
  };
}

export const nepuScraper = makeSourcerer({
  id: 'nepu',
  name: 'Nepu',
  rank: 201,
  flags: [flags.CORS_ALLOWED],
  scrapeMovie: scrape,
  scrapeShow: scrape,
});
