import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Item = { id: string; title: string; kind: 'image' | 'video'; src: string; poster?: string; blurb?: string };
type Row = { title: string; items: Item[] };
type Hero = { type: 'image' | 'video'; src: string; poster?: string; fit?: 'cover' | 'contain' };

const CATEGORY_MAP: Record<string, string> = {
  moments: "Top Moments • Director's Cut",
  trips: 'Trips & Adventures',
  food: 'Food & Coffee Stories',
  jokes: 'Inside Jokes Playlist',
};

const SUPPORTED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg']);
const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.mov']);

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
      let items: Item[] = [];
      try {
        const files = fs.existsSync(categoryDir) ? fs.readdirSync(categoryDir) : [];

        // optional metadata file to override title/blurb per image
        let meta: Record<string, { title?: string; blurb?: string; date?: string }> = {};
        const metaPath = path.join(categoryDir, 'meta.json');
        if (fs.existsSync(metaPath)) {
          try {
            const raw = fs.readFileSync(metaPath, 'utf-8');
            meta = JSON.parse(raw) as Record<string, { title?: string; blurb?: string; date?: string }>;
          } catch {
            // ignore malformed meta
          }
        }

        items = files
          .filter((f) => {
            const ext = path.extname(f).toLowerCase();
            return SUPPORTED_EXTENSIONS.has(ext) || VIDEO_EXTENSIONS.has(ext);
          })
          .map((f, i) => {
            const keyBase = f.replace(path.extname(f), '');
            const m = meta[f] || meta[keyBase] || {};
            const abs = path.join(categoryDir, f);
            const overrideDateMs = m.date ? (() => {
              const s = m.date.trim();
              // Try ISO first
              const iso = new Date(s);
              if (!isNaN(iso.getTime())) return iso.getTime();
              // yyyyMMdd
              const ymdCompact = s.match(/^(\d{4})(\d{2})(\d{2})$/);
              if (ymdCompact) {
                const [_, y, mm, dd] = ymdCompact;
                const dt = new Date(Number(y), Number(mm) - 1, Number(dd));
                if (!isNaN(dt.getTime())) return dt.getTime();
              }
              // dd-MM-yyyy or dd/MM/yyyy
              const dmy = s.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})$/);
              if (dmy) {
                const [_, dd, mm, y] = dmy;
                const dt = new Date(Number(y), Number(mm) - 1, Number(dd));
                if (!isNaN(dt.getTime())) return dt.getTime();
              }
              // yyyy-MM-dd or yyyy/MM/dd
              const ymd = s.match(/^(\d{4})[\/-](\d{2})[\/-](\d{2})$/);
              if (ymd) {
                const [_, y, mm, dd] = ymd;
                const dt = new Date(Number(y), Number(mm) - 1, Number(dd));
                if (!isNaN(dt.getTime())) return dt.getTime();
              }
              return NaN;
            })() : NaN;
            const dateMs = Number.isFinite(overrideDateMs) ? overrideDateMs : deriveDateMsFromFile(f, abs);
            // Prefer showing the date as the visible title if we have one
            const title = dateMs ? formatDate(new Date(dateMs)) : (m.title || deriveTitleFromFile(f, abs));
            const blurb = m.blurb;
            const ext = path.extname(f).toLowerCase();
            if (VIDEO_EXTENSIONS.has(ext)) {
              const base = f.replace(ext, '');
              const posterName = ['.jpg', '.jpeg', '.png', '.webp']
                .map((e) => `${base}${e}`)
                .find((name) => files.includes(name));
              const poster = posterName ? `/gallery/${key}/${encodeURIComponent(posterName)}` : undefined;
              return {
                id: `${key}-${i}`,
                title,
                kind: 'video' as const,
                src: `/gallery/${key}/${encodeURIComponent(f)}`,
                poster,
                blurb,
                dateMs,
              };
            }
            return {
              id: `${key}-${i}`,
              title,
              kind: 'image' as const,
              src: `/gallery/${key}/${encodeURIComponent(f)}`,
              blurb,
              dateMs,
            };
          })
          .sort((a, b) => (b.dateMs ?? 0) - (a.dateMs ?? 0));
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


