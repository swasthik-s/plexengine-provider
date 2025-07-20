import { load } from 'cheerio';

import { flags } from '@/entrypoint/utils/targets';
import { SourcererEmbed, SourcererOutput, makeSourcerer } from '@/providers/base';
import { compareMedia } from '@/utils/compare';
import { MovieScrapeContext, ShowScrapeContext } from '@/utils/context';
import { NotFoundError } from '@/utils/errors';

const baseUrl = 'https://mp4hydra.org/';

async function comboScraper(ctx: ShowScrapeContext | MovieScrapeContext): Promise<SourcererOutput> {
  const searchPage = await ctx.proxiedFetcher('/search', {
    baseUrl,
    query: { q: ctx.media.title },
    ...(process.env.DEBUG_FETCH ? { debug: true } : {}),
  } as any);

  ctx.progress(40);

  const $search = load(searchPage);
  const searchResults: { title: string; year?: number | undefined; url: string }[] = [];

  $search('.search-details').each((_, element) => {
    const [, title, year] =
      $search(element)
        .find('a')
        .first()
        .text()
        .trim()
        .match(/^(.*?)\s*(?:\(?\s*(\d{4})(?:\s*-\s*\d{0,4})?\s*\)?)?\s*$/) || [];
    const url = $search(element).find('a').attr('href');

    if (!title || !url) return;

    searchResults.push({ title, year: year ? parseInt(year, 10) : undefined, url });
  });

  const selectedResult = searchResults.find((x) => x && compareMedia(ctx.media, x.title, x.year));
  if (!selectedResult) throw new NotFoundError('No watchable item found');

  // Extract the movie/show identifier from the URL path
  // For URL like "/movie/fight-club-1999", we want "fight-club-1999"
  const s = selectedResult.url.split('/').pop();
  if (!s) throw new NotFoundError('Invalid movie URL format');

  ctx.progress(60);

  const data: { playlist: { src: string; label: string }[]; servers: { [key: string]: string; auto: string } } =
    await ctx.proxiedFetcher('/info2?v=8', {
      method: 'POST',
      body: new URLSearchParams({ z: JSON.stringify([{ s, t: 'movie' }]) }),
      baseUrl,
    });
  if (!data.playlist[0].src || !data.servers) throw new NotFoundError('No watchable item found');

  ctx.progress(80);

  const embeds: SourcererEmbed[] = [];
  // rank the server as suggested by the api
  [
    data.servers[data.servers.auto],
    ...Object.values(data.servers).filter((x) => x !== data.servers[data.servers.auto] && x !== data.servers.auto),
  ].forEach((server, _) =>
    embeds.push({ embedId: `mp4hydra-${_ + 1}`, url: `${server}${data.playlist[0].src}|${data.playlist[0].label}` }),
  );

  ctx.progress(90);

  return {
    embeds,
  };
}

export const mp4hydraScraper = makeSourcerer({
  id: 'mp4hydra',
  name: 'Mp4Hydra',
  rank: 4,
  flags: [flags.CORS_ALLOWED],
  scrapeMovie: comboScraper,
  scrapeShow: comboScraper,
});
