import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

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
  const unix = name.match(/(?<!\d)(\d{10})(?!\d)/);
  if (unix) {
    const ts = Number(unix[1]);
    if (!Number.isNaN(ts)) {
      const dt = new Date(ts * 1000);
      if (dt.getFullYear() > 2005) return dt;
    }
  }
  const ymd = name.match(/(?<!\d)(\d{4})[-_\.]?(\d{2})[-_\.]?(\d{2})(?!\d)/);
  if (ymd) {
    const [_, y, m, d] = ymd;
    const dt = new Date(Number(y), Number(m) - 1, Number(d));
    if (!isNaN(dt.getTime())) return dt;
  }
  const dmy = name.match(/(?<!\d)(\d{2})[-_\.]?(\d{2})[-_\.]?(\d{4})(?!\d)/);
  if (dmy) {
    const [_, d, m, y] = dmy;
    const dt = new Date(Number(y), Number(m) - 1, Number(d));
    if (!isNaN(dt.getTime())) return dt;
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
        let meta: Record<string, { title?: string; blurb?: string }> = {};
        const metaPath = path.join(categoryDir, 'meta.json');
        if (fs.existsSync(metaPath)) {
          try {
            const raw = fs.readFileSync(metaPath, 'utf-8');
            meta = JSON.parse(raw) as Record<string, { title?: string; blurb?: string }>;
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
            const m = meta[f] || meta[f.replace(path.extname(f), '')] || {};
            const abs = path.join(categoryDir, f);
            const title = m.title || deriveTitleFromFile(f, abs);
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
              };
            }
            return {
              id: `${key}-${i}`,
              title,
              kind: 'image' as const,
              src: `/gallery/${key}/${encodeURIComponent(f)}`,
              blurb,
            };
          });
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


