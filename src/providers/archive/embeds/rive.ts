import { flags } from '@/entrypoint/utils/targets';
import { makeEmbed } from '@/providers/base';

const providers = [
  {
    id: 'rive-guru',
    rank: 270,
    name: 'Guru (onionflixr/FlixHQ)',
  },
  {
    id: 'rive-ghost',
    rank: 269,
  },
  {
    id: 'rive-putafilme',
    rank: 268,
    name: 'Putafilme - Multi',
  },
  {
    id: 'rive-nova',
    rank: 267,
  },
  {
    id: 'rive-asiacloud',
    rank: 266,
  },
  {
    id: 'rive-hydrax',
    rank: 265,
  },
  {
    id: 'rive-filmecho',
    rank: 264,
    name: 'NfMirror',
  },
  {
    id: 'rive-fastx',
    rank: 263,
  },
  {
    id: 'rive-g1',
    rank: 262,
  },
  {
    id: 'rive-g2',
    rank: 261,
  },
  {
    id: 'rive-ee3',
    rank: 260,
  },
  {
    id: 'rive-kage',
    rank: 259,
  },
];

function embed(provider: { id: string; rank: number; name?: string; disabled?: boolean }) {
  return makeEmbed({
    id: provider.id,
    name:
      provider.name ||
      provider.id
        .split('-')
        .map((word) => word[0].toUpperCase() + word.slice(1))
        .join(' '),
    disabled: provider.disabled,
    rank: provider.rank,
    async scrape(ctx) {
      const isHLS = ctx.url.includes('.m3u8') || ctx.url.includes('hls') || ctx.url.includes('playlist');

      if (isHLS) {
        return {
          stream: [
            {
              id: 'primary',
              type: 'hls',
              playlist: ctx.url,
              flags: [flags.CORS_ALLOWED],
              captions: [],
            },
          ],
        };
      }
      return {
        stream: [
          {
            id: 'primary',
            type: 'file',
            qualities: {
              unknown: {
                type: 'mp4',
                url: ctx.url,
              },
            },
            flags: [flags.CORS_ALLOWED],
            captions: [],
          },
        ],
      };
    },
  });
}

export const [
  riveHydraxScraper,
  riveFastxScraper,
  riveFilmechoScraper,
  riveNovaScraper,
  riveGuruScraper,
  riveG1Scraper,
  riveG2Scraper,
  riveEe3Scraper,
  riveGhostScraper,
  rivePutafilmeScraper,
  riveAsiacloudScraper,
  riveKageScraper,
] = providers.map(embed);
