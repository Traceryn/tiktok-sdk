import type { ItemStruct, FormatEntry, BitrateEntry } from '../types.js';

function pickFormatId(entry: BitrateEntry, index: number): string {
  const gear = entry.GearName ?? '';
  const codec = entry.CodecType === 'h265_hvc1' ? 'bytevc1' : 'h264';
  const resolution = gear.includes('720') ? '720p' : gear.includes('540') ? '540p' : 'unknown';
  return `${codec}_${resolution}_${entry.Bitrate}-${index}`;
}

function pickFormatNote(entry: BitrateEntry): string {
  const codec = entry.CodecType === 'h265_hvc1' ? 'h265' : 'h264';
  const gear = entry.GearName ?? '';
  const resolution = gear.includes('720') ? '720x1280' : gear.includes('540') ? '576x1024' : 'unknown';
  return `${codec} ${resolution}`;
}

export function extractFormats(item: ItemStruct): FormatEntry[] {
  const formats: FormatEntry[] = [];

  const wmUrl = item.video?.downloadAddr || item.video?.playAddr || '';
  if (wmUrl) {
    formats.push({
      format_id: 'download',
      format: 'download - unknown (watermarked)',
      format_note: 'watermarked',
      ext: 'mp4',
      vcodec: 'h264', acodec: 'aac',
      width: 0, height: 0, resolution: 'unknown',
      tbr: 0, filesize: 0,
      url: wmUrl, urls: [wmUrl],
      quality: -2, dynamic_range: 'SDR', aspect_ratio: 0, protocol: 'https',
    });
  }

  const bitrateInfo = (item.video as any)?.bitrateInfo as BitrateEntry[] | undefined;
  if (!bitrateInfo?.length) return formats;

  const seen = new Set<string>();
  bitrateInfo.forEach((entry, i) => {
    if (!entry) return;
    const w = entry.PlayAddr?.Width ?? 0;
    const h = entry.PlayAddr?.Height ?? 0;
    const urlList = entry.PlayAddr?.UrlList ?? [];
    const url = urlList[0] ?? '';
    const filesize = parseInt(entry.PlayAddr?.DataSize ?? '0', 10) || 0;

    if (seen.has(entry.PlayAddr?.FileHash ?? '')) return;
    if (entry.PlayAddr?.FileHash) seen.add(entry.PlayAddr.FileHash);

    const formatId = pickFormatId(entry, i);
    const codec = entry.CodecType === 'h265_hvc1' ? 'h265' : entry.CodecType || 'h264';
    const tbr = Math.round(entry.Bitrate / 1000);

    formats.push({
      format_id: formatId,
      format: `${formatId} - ${w}x${h}`,
      format_note: pickFormatNote(entry),
      ext: entry.Format || 'mp4',
      vcodec: codec, acodec: 'aac',
      width: w, height: h,
      resolution: `${w}x${h}`,
      tbr, filesize,
      url, urls: urlList,
      quality: entry.QualityType,
      dynamic_range: 'SDR',
      aspect_ratio: w > 0 && h > 0 ? +(w / h).toFixed(2) : 0,
      protocol: 'https',
    });
  });

  return formats;
}

export function extractSubtitles(item: ItemStruct) {
  const infos = item.video?.subtitleInfos;
  if (!infos?.length) return {};

  const subtitles: Record<string, Array<{ url: string; ext: string }>> = {};
  for (const sub of infos) {
    const lang = sub.LanguageCodeName || 'unknown';
    if (!subtitles[lang]) subtitles[lang] = [];
    subtitles[lang].push({
      url: sub.Url,
      ext: sub.Format === 'webvtt' ? 'vtt' : sub.Format || 'vtt',
    });
  }
  return subtitles;
}

export function findBestQuality(item: ItemStruct) {
  const bitrateInfo = (item.video as any)?.bitrateInfo as BitrateEntry[] | undefined;
  if (!bitrateInfo?.length) return null;

  let best: BitrateEntry | null = null;
  for (const entry of bitrateInfo) {
    if (!entry) continue;
    if (!best) { best = entry; continue; }
    const entryArea = (entry.PlayAddr?.Width ?? 0) * (entry.PlayAddr?.Height ?? 0);
    const bestArea = (best.PlayAddr?.Width ?? 0) * (best.PlayAddr?.Height ?? 0);
    if (entryArea > bestArea || (entryArea === bestArea && entry.Bitrate > best.Bitrate)) {
      best = entry;
    }
  }
  if (!best) return null;
  return {
    width: best.PlayAddr?.Width ?? 0,
    height: best.PlayAddr?.Height ?? 0,
    url: best.PlayAddr?.UrlList?.[0] ?? '',
    codec: best.CodecType ?? '',
    bitrate: best.Bitrate ?? 0,
  };
}
