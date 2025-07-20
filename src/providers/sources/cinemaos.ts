import { flags } from '@/entrypoint/utils/targets';
import { SourcererOutput, makeSourcerer } from '@/providers/base';
import { MovieScrapeContext, ShowScrapeContext } from '@/utils/context';

// const baseUrl = atob('aHR0cHM6Ly9jaW5lbWFvcy12My52ZXJjZWwuYXBwLw==');

const CINEMAOS_SERVERS = [
  //   'flowcast',
  'shadow',
  'asiacloud',
  //   'hindicast',
  //   'anime',
  //   'animez',
  //   'guard',
  //   'hq',
  //   'ninja',
  //   'alpha',
  //   'kaze',
  //   'zenith',
  //   'cast',
  //   'ghost',
  //   'halo',
  //   'kinoecho',
  //   'ee3',
  //   'volt',
  //   'putafilme',
  'ophim',
  //   'kage',
];

async function comboScraper(ctx: ShowScrapeContext | MovieScrapeContext): Promise<SourcererOutput> {
  const embeds = [];

  const query: any = {
    type: ctx.media.type,
    tmdbId: ctx.media.tmdbId,
  };

  if (ctx.media.type === 'show') {
    query.season = ctx.media.season.number;
    query.episode = ctx.media.episode.number;
  }

  //   // V2 Embeds / Hexa
  //   try {
  //     const hexaUrl = `api/hexa?type=${query.type}&tmdbId=${query.tmdbId}`;
  //     const hexaRes = await ctx.proxiedFetcher(hexaUrl, { baseUrl });
  //     const hexaData = typeof hexaRes === 'string' ? JSON.parse(hexaRes) : hexaRes;
  //     if (hexaData && hexaData.sources && typeof hexaData.sources === 'object') {
  //       for (const [key, value] of Object.entries<any>(hexaData.sources)) {
  //         if (value && value.url) {
  //           embeds.push({
  //             embedId: `cinemaos-hexa-${key}`,
  //             url: JSON.stringify({ ...query, service: `hexa-${key}`, directUrl: value.url }),
  //           });
  //         }
  //       }
  //     }
  //   } catch (e: any) {
  //     // eslint-disable-next-line no-console
  //     console.error('Failed to fetch hexa sources');
  //   }

  // V3 Embeds
  for (const server of CINEMAOS_SERVERS) {
    embeds.push({
      embedId: `cinemaos-${server}`,
      url: JSON.stringify({ ...query, service: server }),
    });
  }

  ctx.progress(50);

  return { embeds };
}

export const cinemaosScraper = makeSourcerer({
  id: 'cinemaos',
  name: 'CinemaOS',
  rank: 149,
  disabled: true,
  flags: [flags.CORS_ALLOWED],
  scrapeMovie: comboScraper,
  scrapeShow: comboScraper,
});
