/* eslint-disable no-console */
import { ScrapeMedia } from '@/entrypoint/utils/media';
import { Caption, labelToLanguageCode } from '@/providers/captions';
import { IndividualEmbedRunnerOptions } from '@/runners/individualRunner';
import { ProviderRunnerOptions } from '@/runners/runner';

import { addWyzieCaptions } from './wyziesubs';

type CaptionOptions = (ProviderRunnerOptions | IndividualEmbedRunnerOptions) & {
  media?: ScrapeMedia;
};

const timeout = (ms: number, source: string) =>
  new Promise<null>((resolve) => {
    setTimeout(() => {
      console.error(`${source} captions request timed out after ${ms}ms`);
      resolve(null);
    }, ms);
  });

export async function addOpenSubtitlesCaptions(
  captions: Caption[],
  ops: CaptionOptions,
  media: string,
): Promise<Caption[]> {
  try {
    const [imdbId, season, episode] = atob(media)
      .split('.')
      .map((x, i) => (i === 0 ? x : Number(x) || null));
    if (!imdbId) return captions;

    const allCaptions = [...captions];

    // Fetch Wyzie captions with 2 second timeout
    const wyziePromise = addWyzieCaptions(
      [],
      ops.media?.tmdbId?.toString() || '',
      imdbId.toString(),
      typeof season === 'number' ? season : undefined,
      typeof episode === 'number' ? episode : undefined,
    )
      .then((wyzieCaptions) => {
        if (wyzieCaptions && wyzieCaptions.length > 0) {
          return wyzieCaptions.map((caption) => ({
            ...caption,
            opensubtitles: true,
          }));
        }
        return [];
      })
      .catch((error) => {
        console.error('Wyzie subtitles fetch failed:', error);
        return [];
      });

    // Fetch OpenSubtitles captions with 5 second timeout
    const openSubsPromise = ops
      .proxiedFetcher(
        `https://rest.opensubtitles.org/search/${
          season && episode ? `episode-${episode}/` : ''
        }imdbid-${(imdbId as string).slice(2)}${season && episode ? `/season-${season}` : ''}`,
        {
          headers: {
            'X-User-Agent': 'VLSub 0.10.2',
          },
        },
      )
      .then((Res) => {
        const openSubtilesCaptions: Caption[] = [];
        for (const caption of Res) {
          const url = caption.SubDownloadLink.replace('.gz', '').replace('download/', 'download/subencoding-utf8/');
          const language = labelToLanguageCode(caption.LanguageName);
          if (!url || !language) continue;
          else
            openSubtilesCaptions.push({
              id: url,
              opensubtitles: true,
              url,
              type: caption.SubFormat || 'srt',
              hasCorsRestrictions: false,
              language,
            });
        }
        return openSubtilesCaptions;
      })
      .catch((error) => {
        console.error('OpenSubtitles fetch failed:', error);
        return [];
      });

    // Wait for both promises with their respective timeouts
    const [wyzieCaptions, openSubsCaptions] = await Promise.all([
      Promise.race([wyziePromise, timeout(2000, 'Wyzie')]),
      Promise.race([openSubsPromise, timeout(5000, 'OpenSubtitles')]),
    ]);

    // Add any successful captions to our result
    if (wyzieCaptions) allCaptions.push(...wyzieCaptions);
    if (openSubsCaptions) allCaptions.push(...openSubsCaptions);

    return allCaptions;
  } catch (error) {
    console.error('Error in addOpenSubtitlesCaptions:', error);
    return captions;
  }
}
