import { flags } from '@/entrypoint/utils/targets';
import { SourcererEmbed, SourcererOutput, makeSourcerer } from '@/providers/base';
import { MovieScrapeContext, ShowScrapeContext } from '@/utils/context';
import { NotFoundError } from '@/utils/errors';
import { createM3U8ProxyUrl } from '@/utils/proxy';

const baseUrl = 'https://api2.vidsrc.vip';

function digitToLetterMap(digit: string): string {
  const map = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
  return map[parseInt(digit, 10)];
}

function encodeTmdbId(tmdb: string, type: 'movie' | 'show', season?: number, episode?: number): string {
  let raw: string;
  if (type === 'show' && season && episode) {
    // For TV shows, use tmdbId-season-episode format directly
    raw = `${tmdb}-${season}-${episode}`;
  } else {
    // For movies, convert each digit to letter
    raw = tmdb.split('').map(digitToLetterMap).join('');
  }
  const reversed = raw.split('').reverse().join('');
  return btoa(btoa(reversed));
}

async function comboScraper(ctx: ShowScrapeContext | MovieScrapeContext): Promise<SourcererOutput> {
  const apiType = ctx.media.type === 'show' ? 'tv' : 'movie';
  const encodedId = encodeTmdbId(
    ctx.media.tmdbId,
    ctx.media.type,
    ctx.media.type === 'show' ? ctx.media.season.number : undefined,
    ctx.media.type === 'show' ? ctx.media.episode.number : undefined,
  );

  const url = `${baseUrl}/${apiType}/${encodedId}`;
  const data = await ctx.proxiedFetcher<any>(url);

  if (!data || !data.source1) throw new NotFoundError('No sources found');

  const embeds: SourcererEmbed[] = [];
  const embedIds = ['vidsrc-comet', 'vidsrc-pulsar', 'vidsrc-nova'];
  let sourceIndex = 0;
  for (let i = 1; data[`source${i}`]; i++) {
    const source = data[`source${i}`];
    if (source?.url) {
      // Use proper M3U8 proxy for HLS streams
      const proxyUrl =
        source.url.includes('.m3u8') || source.url.includes('hls')
          ? createM3U8ProxyUrl(source.url, {
            Referer: 'https://vidsrc.vip/',
            Origin: 'https://vidsrc.vip',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          })
          : source.url;

      embeds.push({
        embedId: embedIds[sourceIndex % embedIds.length],
        url: proxyUrl,
      });
      sourceIndex++;
    }
  }

  if (embeds.length === 0) throw new NotFoundError('No embeds found');

  return {
    embeds,
  };
}

export const vidsrcvipScraper = makeSourcerer({
  id: 'vidsrcvip',
  name: 'VidSrc.vip',
  rank: 150,
  flags: [flags.CORS_ALLOWED],
  scrapeMovie: comboScraper,
  scrapeShow: comboScraper,
});
