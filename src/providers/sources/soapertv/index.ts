import { load } from 'cheerio';

import { flags } from '@/entrypoint/utils/targets';
import { Caption, labelToLanguageCode } from '@/providers/captions';
import { Stream } from '@/providers/streams';
import { compareMedia } from '@/utils/compare';
import { MovieScrapeContext, ShowScrapeContext } from '@/utils/context';
import { NotFoundError } from '@/utils/errors';
import { createM3U8ProxyUrl } from '@/utils/proxy';

import { InfoResponse } from './types';
import { SourcererOutput, makeSourcerer } from '../../base';

const baseUrl = 'https://soaper.cc';

const universalScraper = async (ctx: MovieScrapeContext | ShowScrapeContext): Promise<SourcererOutput> => {
  const searchResult = await ctx.proxiedFetcher('/search.html', {
    baseUrl,
    query: {
      keyword: ctx.media.title,
    },
  });
  const search$ = load(searchResult);

  const searchResults: { title: string; year?: number | undefined; url: string }[] = [];

  search$('.thumbnail').each((_, element) => {
    const title = search$(element).find('h5').find('a').first().text().trim();
    const year = search$(element).find('.img-tip').first().text().trim();
    const url = search$(element).find('h5').find('a').first().attr('href');

    if (!title || !url) return;

    searchResults.push({ title, year: year ? parseInt(year, 10) : undefined, url });
  });

  let showLink = searchResults.find((x) => x && compareMedia(ctx.media, x.title, x.year))?.url;
  if (!showLink) throw new NotFoundError('Content not found');

  if (ctx.media.type === 'show') {
    const seasonNumber = ctx.media.season.number;
    const episodeNumber = ctx.media.episode.number;
    const showPage = await ctx.proxiedFetcher(showLink, { baseUrl });
    const showPage$ = load(showPage);
    const seasonBlock = showPage$('h4')
      .filter((_, el) => showPage$(el).text().trim().split(':')[0].trim() === `Season${seasonNumber}`)
      .parent();
    const episodes = seasonBlock.find('a').toArray();
    showLink = showPage$(
      episodes.find((el) => parseInt(showPage$(el).text().split('.')[0], 10) === episodeNumber),
    ).attr('href');
  }
  if (!showLink) throw new NotFoundError('Content not found');
  const contentPage = await ctx.proxiedFetcher(showLink, { baseUrl });
  const contentPage$ = load(contentPage);

  const pass = contentPage$('#hId').attr('value');

  if (!pass) throw new NotFoundError('Content not found');
  ctx.progress(50);

  const formData = new URLSearchParams();
  formData.append('pass', pass);
  formData.append('e2', '0');
  formData.append('server', '0');

  const infoEndpoint = ctx.media.type === 'show' ? '/home/index/getEInfoAjax' : '/home/index/getMInfoAjax';
  const streamRes = await ctx.proxiedFetcher<string>(infoEndpoint, {
    baseUrl,
    method: 'POST',
    body: formData,
    headers: {
      referer: `${baseUrl}${showLink}`,
      'User-Agent':
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
      'Viewport-Width': '375',
    },
  });

  const streamResJson: InfoResponse = JSON.parse(streamRes);

  const languageMap: Record<string, string> = {
    'chinese - hong kong': 'zh',
    'chinese - traditional': 'zh',
    czech: 'cs',
    danish: 'da',
    dutch: 'nl',
    english: 'en',
    'english - sdh': 'en',
    finnish: 'fi',
    french: 'fr',
    german: 'de',
    greek: 'el',
    hungarian: 'hu',
    italian: 'it',
    korean: 'ko',
    norwegian: 'no',
    polish: 'pl',
    portuguese: 'pt',
    'portuguese - brazilian': 'pt',
    romanian: 'ro',
    'spanish - european': 'es',
    'spanish - latin american': 'es',
    swedish: 'sv',
    turkish: 'tr',
    اَلْعَرَبِيَّةُ: 'ar',
    বাংলা: 'bn',
    filipino: 'tl',
    indonesia: 'id',
    اردو: 'ur',
    English: 'en',
    Arabic: 'ar',
    Bosnian: 'bs',
    Bulgarian: 'bg',
    Croatian: 'hr',
    Czech: 'cs',
    Danish: 'da',
    Dutch: 'nl',
    Estonian: 'et',
    Finnish: 'fi',
    French: 'fr',
    German: 'de',
    Greek: 'el',
    Hebrew: 'he',
    Hungarian: 'hu',
    Indonesian: 'id',
    Italian: 'it',
    Norwegian: 'no',
    Persian: 'fa',
    Polish: 'pl',
    Portuguese: 'pt',
    'Protuguese (BR)': 'pt-br',
    Romanian: 'ro',
    Russian: 'ru',
    Serbian: 'sr',
    Slovenian: 'sl',
    Spanish: 'es',
    Swedish: 'sv',
    Thai: 'th',
    Turkish: 'tr',
  };

  const captions: Caption[] = [];
  if (Array.isArray(streamResJson.subs)) {
    for (const sub of streamResJson.subs) {
      // Some subtitles are named <Language>.srt, some are named <LanguageCode>:hi, or just <LanguageCode>
      let language: string | null = '';
      if (sub.name.includes('.srt')) {
        const langName = sub.name.split('.srt')[0].toLowerCase().trim();
        language = languageMap[langName] || labelToLanguageCode(langName);
      } else if (sub.name.includes(':')) {
        const langName = sub.name.split(':')[0].toLowerCase().trim();
        language = languageMap[langName] || labelToLanguageCode(langName);
      } else {
        const langName = sub.name.toLowerCase().trim();
        language = languageMap[langName] || labelToLanguageCode(langName);
      }
      if (!language) continue;

      captions.push({
        id: sub.path,
        url: `${baseUrl}${sub.path}`,
        type: 'srt',
        hasCorsRestrictions: false,
        language,
      });
    }
  }
  ctx.progress(90);

  // Headers needed for the M3U8 proxy
  const headers = {
    referer: `${baseUrl}${showLink}`,
    'User-Agent':
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    'Viewport-Width': '375',
  };

  return {
    embeds: [],
    stream: [
      {
        id: 'primary',
        playlist: createM3U8ProxyUrl(`${baseUrl}/${streamResJson.val}`, headers),
        type: 'hls',
        proxyDepth: 2,
        flags: [flags.CORS_ALLOWED],
        captions,
      },
      ...(streamResJson.val_bak
        ? [
            {
              id: 'backup',
              playlist: createM3U8ProxyUrl(`${baseUrl}/${streamResJson.val_bak}`, headers),
              type: 'hls',
              flags: [flags.CORS_ALLOWED],
              proxyDepth: 2,
              captions,
            } as Stream,
          ]
        : []),
    ],
  };
};

export const soaperTvScraper = makeSourcerer({
  id: 'soapertv',
  name: 'SoaperTV',
  rank: 130,
  disabled: true,
  flags: [flags.CORS_ALLOWED],
  scrapeMovie: universalScraper,
  scrapeShow: universalScraper,
});

// playlist: await convertPlaylistsToDataUrls(ctx.proxiedFetcher, `${baseUrl}/${streamResJson.val_bak}`, {
//   'User-Agent':
//     'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
//   'Viewport-Width': '375',
// }),
