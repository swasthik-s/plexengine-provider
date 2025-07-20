import { flags } from '@/entrypoint/utils/targets';
import { SourcererEmbed, SourcererOutput, makeSourcerer } from '@/providers/base';
import { MovieScrapeContext, ShowScrapeContext } from '@/utils/context';
import { NotFoundError } from '@/utils/errors';
import { createM3U8ProxyUrl, updateM3U8ProxyUrl } from '@/utils/proxy';

const baseUrl = 'https://rivestream.org';

function generateSecretKey(id: number | string) {
  const keyArray = [
    'I',
    '3LZu',
    'M2V3',
    '4EXX',
    's4',
    'yRy',
    'oqMz',
    'ysE',
    'RT',
    'iSI',
    'zlc',
    'H',
    'YNp',
    '5vR6',
    'h9S',
    'R',
    'jo',
    'F',
    'h2',
    'W8',
    'i',
    'sz09',
    'Xom',
    'gpU',
    'q',
    '6Qvg',
    'Cu',
    '5Zaz',
    'VK',
    'od',
    'FGY4',
    'eu',
    'D5Q',
    'smH',
    '11eq',
    'QrXs',
    '3',
    'L3',
    'YhlP',
    'c',
    'Z',
    'YT',
    'bnsy',
    '5',
    'fcL',
    'L22G',
    'r8',
    'J',
    '4',
    'gnK',
  ];

  // Handle undefined/null input
  if (typeof id === 'undefined' || id === null) {
    return 'rive';
  }

  // Convert to number and calculate array index
  const numericId = typeof id === 'string' ? parseInt(id, 10) : Number(id);
  const index = numericId % keyArray.length;

  // Handle NaN cases (invalid number conversion)
  if (Number.isNaN(index)) {
    return 'rive';
  }

  return keyArray[index];
}

function createProxyUrl(originalUrl: string, referer: string): string {
  const headers = {
    referer,
  };
  return createM3U8ProxyUrl(originalUrl, headers);
}

function processProxiedURL(url: string): string {
  // Handle orbitproxy URLs
  if (url.includes('orbitproxy')) {
    try {
      const urlParts = url.split(/orbitproxy\.[^/]+\//);
      if (urlParts.length >= 2) {
        const encryptedPart = urlParts[1].split('.m3u8')[0];
        try {
          const decodedData = Buffer.from(encryptedPart, 'base64').toString('utf-8');
          const jsonData = JSON.parse(decodedData);
          const originalUrl = jsonData.u;
          const referer = jsonData.r || '';

          return createProxyUrl(originalUrl, referer);
        } catch (jsonError) {
          console.error('Error decoding/parsing orbitproxy data:', jsonError);
        }
      }
    } catch (error) {
      console.error('Error processing orbitproxy URL:', error);
    }
  }

  // Handle other proxied URLs
  if (url.includes('/m3u8-proxy?url=')) {
    return updateM3U8ProxyUrl(url);
  }

  return url;
}

async function comboScraper(ctx: MovieScrapeContext | ShowScrapeContext): Promise<SourcererOutput> {
  const tmdbId = ctx.media.tmdbId;
  const secret = generateSecretKey(tmdbId);

  const servers = [
    'hydrax',
    'fastx',
    'filmecho',
    'nova',
    'guru',
    'g1',
    'g2',
    'ee3',
    'ghost',
    'putafilme',
    'asiacloud',
    'kage',
  ];

  const route =
    ctx.media.type === 'show'
      ? `/api/backendfetch?requestID=tvVideoProvider&id=${tmdbId}&season=${ctx.media.season.number}&episode=${ctx.media.episode.number}&secretKey=${secret}&service=`
      : `/api/backendfetch?requestID=movieVideoProvider&id=${tmdbId}&secretKey=${secret}&service=`;

  ctx.progress(20);

  const embeds: SourcererEmbed[] = [];
  const processedServers = new Set<string>();

  await Promise.all(
    servers.map(async (server) => {
      try {
        const url = baseUrl + route + server;

        const response = await ctx.proxiedFetcher(url, {
          headers: {
            Referer: baseUrl,
          },
        });

        const data = typeof response === 'string' ? JSON.parse(response) : response;

        if (!data?.data || !data?.data?.sources?.length) {
          return;
        }

        data.data.sources.forEach((source: any) => {
          const processedUrl = processProxiedURL(source.url);

          const serverKey = `rive-${server}`;

          if (!processedServers.has(serverKey)) {
            processedServers.add(serverKey);

            embeds.push({
              embedId: serverKey,
              url: processedUrl,
            });
          }
        });
      } catch (error) {
        console.error(`Error fetching Rive ${server}:`, error);
      }
    }),
  );

  ctx.progress(90);

  if (!embeds.length) {
    throw new NotFoundError('No embeds found from Rive');
  }

  return {
    embeds,
  };
}

export const riveScraper = makeSourcerer({
  id: 'rive',
  name: 'Rive',
  rank: 60,
  disabled: true,
  flags: [flags.CORS_ALLOWED],
  scrapeMovie: comboScraper,
  scrapeShow: comboScraper,
});
