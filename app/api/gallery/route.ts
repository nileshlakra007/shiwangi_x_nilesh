import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type MediaItem = { id: string; title: string; kind: 'image' | 'video'; src: string; poster?: string; blurb?: string; dateMs?: number };
type GroupedItem = { id: string; dateLabel: string; blurb?: string; items: MediaItem[]; dateMs: number };
type Row = { title: string; items: GroupedItem[] };
type Hero = { type: 'image' | 'video'; src: string; poster?: string; fit?: 'cover' | 'contain' };

const CATEGORY_MAP: Record<string, string> = {
  moments: "Top Moments • Director's Cut",
  trips: 'Trips & Adventures',
  food: 'Food & Coffee Stories',
  jokes: 'Inside Jokes Playlist',
};

const SUPPORTED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg']);
const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.mov']);

function loadMeta(metaPath: string): Record<string, { title?: string; blurb?: string; date?: string }> {
  try {
    if (fs.existsSync(metaPath)) {
      const raw = fs.readFileSync(metaPath, 'utf-8');
      return JSON.parse(raw) as Record<string, { title?: string; blurb?: string; date?: string }>;
    }
  } catch {
    // ignore malformed meta
  }
  return {};
}

function formatDate(d: Date): string {
  try {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

function extractDateFromName(name: string): Date | null {
  const nowMs = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const upperBound = nowMs + weekMs; // allow slight future skew
  const lowerBound = Date.UTC(2008, 0, 1); // ignore ancient timestamps

  // Prefer explicit date-like patterns first
  const ymd = name.match(/(?<!\d)(\d{4})[-_\.]?(\d{2})[-_\.]?(\d{2})(?!\d)/);
  if (ymd) {
    const [_, y, m, d] = ymd;
    const yy = Number(y), mm = Number(m), dd = Number(d);
    if (yy >= 2008 && yy <= 2100) {
      const dt = new Date(yy, mm - 1, dd);
      if (!isNaN(dt.getTime())) return dt;
    }
  }
  const dmy = name.match(/(?<!\d)(\d{2})[-_\.]?(\d{2})[-_\.]?(\d{4})(?!\d)/);
  if (dmy) {
    const [_, d, m, y] = dmy;
    const yy = Number(y), mm = Number(m), dd = Number(d);
    if (yy >= 2008 && yy <= 2100) {
      const dt = new Date(yy, mm - 1, dd);
      if (!isNaN(dt.getTime())) return dt;
    }
  }

  // Only accept 10-digit Unix timestamps if they are realistic (not far future/past)
  const unix = name.match(/(?<!\d)(\d{10})(?!\d)/);
  if (unix) {
    const ts = Number(unix[1]) * 1000;
    if (!Number.isNaN(ts) && ts >= lowerBound && ts <= upperBound) {
      return new Date(ts);
    }
  }
  return null;
}

function cleanBaseName(base: string): string {
  // remove common camera/app prefixes
  base = base.replace(/^(IMG|VID|PXL|Snapchat|WhatsApp|WA|DSC|PHOTO|VIDEO)[-_\s]*/i, '');
  base = base.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!base) return '';
  return base.replace(/\b\w/g, (c) => c.toUpperCase());
}

function parseDateMsFromString(input?: string | null): number {
  if (!input) return NaN;
  const s = input.trim();
  if (!s) return NaN;
  const iso = new Date(s);
  if (!isNaN(iso.getTime())) return iso.getTime();
  const ymdCompact = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (ymdCompact) {
    const [_, y, mm, dd] = ymdCompact;
    const dt = new Date(Number(y), Number(mm) - 1, Number(dd));
    if (!isNaN(dt.getTime())) return dt.getTime();
  }
  const dmy = s.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})$/);
  if (dmy) {
    const [_, dd, mm, y] = dmy;
    const dt = new Date(Number(y), Number(mm) - 1, Number(dd));
    if (!isNaN(dt.getTime())) return dt.getTime();
  }
  const ymd = s.match(/^(\d{4})[\/-](\d{2})[\/-](\d{2})$/);
  if (ymd) {
    const [_, y, mm, dd] = ymd;
    const dt = new Date(Number(y), Number(mm) - 1, Number(dd));
    if (!isNaN(dt.getTime())) return dt.getTime();
  }
  return NaN;
}

function deriveTitleFromFile(filename: string, absPath: string): string {
  const base = filename.replace(path.extname(filename), '');
  const fromName = extractDateFromName(base);
  if (fromName) return formatDate(fromName);
  try {
    const stat = fs.statSync(absPath);
    const dt = stat.birthtime || stat.mtime;
    if (dt && !isNaN(dt.getTime())) return formatDate(dt);
  } catch {}
  const cleaned = cleanBaseName(base);
  return cleaned || 'Untitled';
}

function deriveDateMsFromFile(filename: string, absPath: string): number {
  const base = filename.replace(path.extname(filename), '');
  const fromName = extractDateFromName(base);
  if (fromName) return fromName.getTime();
  try {
    const stat = fs.statSync(absPath);
    const ms = Number(stat.birthtimeMs || stat.mtimeMs || stat.ctimeMs);
    if (!Number.isNaN(ms)) return ms;
  } catch {}
  return 0;
}

function makeMediaItems(files: string[], baseDir: string, meta: Record<string, { title?: string; blurb?: string; date?: string }>, categoryKey: string, subfolder?: string): MediaItem[] {
  const urlPrefix = subfolder ? `/gallery/${categoryKey}/${encodeURIComponent(subfolder)}/` : `/gallery/${categoryKey}/`;

  return files
    .filter((f) => {
      const ext = path.extname(f).toLowerCase();
      return SUPPORTED_EXTENSIONS.has(ext) || VIDEO_EXTENSIONS.has(ext);
    })
    .map((f, i) => {
      const keyBase = f.replace(path.extname(f), '');
      const m = meta[f] || meta[keyBase] || {};
      const abs = path.join(baseDir, f);
      const overrideDateMs = parseDateMsFromString(m.date);
      const dateMs = Number.isFinite(overrideDateMs) ? overrideDateMs : deriveDateMsFromFile(f, abs);
      const title = m.title || deriveTitleFromFile(f, abs);
      const blurb = m.blurb;
      const ext = path.extname(f).toLowerCase();
      if (VIDEO_EXTENSIONS.has(ext)) {
        const base = f.replace(ext, '');
        const posterName = ['.jpg', '.jpeg', '.png', '.webp']
          .map((e) => `${base}${e}`)
          .find((name) => files.includes(name));
        const poster = posterName ? `${urlPrefix}${encodeURIComponent(posterName)}` : undefined;
        return {
          id: `${categoryKey}-${subfolder || 'root'}-${i}`,
          title,
          kind: 'video' as const,
          src: `${urlPrefix}${encodeURIComponent(f)}`,
          poster,
          blurb,
          dateMs,
        };
      }
      return {
        id: `${categoryKey}-${subfolder || 'root'}-${i}`,
        title,
        kind: 'image' as const,
        src: `${urlPrefix}${encodeURIComponent(f)}`,
        blurb,
        dateMs,
      };
    })
    .sort((a, b) => (b.dateMs ?? 0) - (a.dateMs ?? 0));
}

export async function GET() {
  try {
    const publicDir = path.join(process.cwd(), 'public', 'gallery');
    const rows: Row[] = [];

    // Hero detection from public/hero
    const heroDir = path.join(process.cwd(), 'public', 'hero');
    let hero: Hero | undefined = undefined;
    try {
      if (fs.existsSync(heroDir)) {
        const files = fs.readdirSync(heroDir);
        // optional meta.json
        let meta: { select?: string; fit?: 'cover' | 'contain' } = {};
        const metaPath = path.join(heroDir, 'meta.json');
        if (fs.existsSync(metaPath)) {
          try {
            meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8')) as typeof meta;
          } catch {}
        }

        let chosen: string | undefined = files.find((f) => f === meta.select);
        if (!chosen) {
          chosen = files.find((f) => VIDEO_EXTENSIONS.has(path.extname(f).toLowerCase()))
            || files.find((f) => SUPPORTED_EXTENSIONS.has(path.extname(f).toLowerCase()));
        }
        if (chosen) {
          const ext = path.extname(chosen).toLowerCase();
          if (VIDEO_EXTENSIONS.has(ext)) {
            const base = chosen.replace(ext, '');
            const posterCandidate = ['.jpg', '.jpeg', '.png', '.webp']
              .map((e) => path.join(heroDir, `${base}${e}`))
              .find((p) => fs.existsSync(p));
            const poster = posterCandidate ? `/hero/${encodeURIComponent(path.basename(posterCandidate))}` : undefined;
            hero = { type: 'video', src: `/hero/${encodeURIComponent(chosen)}`, poster, fit: meta.fit || 'cover' };
          } else if (SUPPORTED_EXTENSIONS.has(ext)) {
            hero = { type: 'image', src: `/hero/${encodeURIComponent(chosen)}`, fit: meta.fit || 'cover' };
          }
        }
      }
    } catch {}

    for (const key of Object.keys(CATEGORY_MAP)) {
      const categoryDir = path.join(publicDir, key);
      let items: GroupedItem[] = [];
      try {
        const dirents = fs.existsSync(categoryDir) ? fs.readdirSync(categoryDir, { withFileTypes: true }) : [];
        const hasSubdirs = dirents.some((d) => d.isDirectory());

        const rootMeta = loadMeta(path.join(categoryDir, 'meta.json'));

        if (hasSubdirs) {
          const rootFiles = dirents.filter((d) => d.isFile()).map((d) => d.name);
          const rootMedia = makeMediaItems(rootFiles, categoryDir, rootMeta, key);
          if (rootMedia.length) {
            const groupDateMs = rootMedia[0]?.dateMs ?? 0;
            const groupLabel = rootMedia[0]?.dateMs ? formatDate(new Date(rootMedia[0].dateMs!)) : 'More Memories';
            items.push({ id: `${key}-group-root`, dateLabel: groupLabel, blurb: rootMedia[0]?.blurb, items: rootMedia, dateMs: groupDateMs });
          }

          for (const dirent of dirents) {
            if (!dirent.isDirectory()) continue;
            const subdir = path.join(categoryDir, dirent.name);
            const subFiles = fs.readdirSync(subdir);
            const subMeta = loadMeta(path.join(subdir, 'meta.json'));
            const mediaItems = makeMediaItems(subFiles, subdir, subMeta, key, dirent.name);
            if (!mediaItems.length) continue;
            const dateFromFolder = extractDateFromName(dirent.name);
            const folderDateMs = dateFromFolder?.getTime() ?? mediaItems[0]?.dateMs ?? 0;
            const label = dateFromFolder ? formatDate(dateFromFolder) : (cleanBaseName(dirent.name) || dirent.name);
            items.push({ id: `${key}-group-${items.length}`, dateLabel: label, blurb: mediaItems[0]?.blurb, items: mediaItems, dateMs: folderDateMs });
          }
          items = items.sort((a, b) => (b.dateMs ?? 0) - (a.dateMs ?? 0));
        } else {
          const grouped = makeMediaItems(dirents.filter((d) => d.isFile()).map((d) => d.name), categoryDir, rootMeta, key)
            .reduce((acc, item, idx) => {
              const dateValue = Number.isFinite(item.dateMs) ? item.dateMs as number : 0;
              const label = dateValue ? formatDate(new Date(dateValue)) : (item.title || `Memory ${idx + 1}`);
              const keyLabel = dateValue ? `date-${new Date(dateValue).toISOString().slice(0, 10)}` : `untitled-${label}-${idx}`;
              if (!acc.has(keyLabel)) {
                acc.set(keyLabel, { id: `${key}-group-${acc.size}`, dateLabel: label, items: [], blurb: item.blurb, dateMs: dateValue });
              }
              const group = acc.get(keyLabel)!;
              group.items.push(item);
              if (!group.blurb && item.blurb) group.blurb = item.blurb;
              return acc;
            }, new Map<string, GroupedItem>());

          items = Array.from(grouped.values()).sort((a, b) => (b.dateMs ?? 0) - (a.dateMs ?? 0));
        }
      } catch {
        items = [];
      }

      rows.push({ title: CATEGORY_MAP[key], items });
    }

    return NextResponse.json({ rows, hero });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to read gallery' }, { status: 500 });
  }
}
