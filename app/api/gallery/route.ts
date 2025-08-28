import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

type Item = { id: string; title: string; img: string; blurb?: string };
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

function titleFromFilename(file: string): string {
  const base = file.replace(path.extname(file), '');
  return base
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
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
          .filter((f) => SUPPORTED_EXTENSIONS.has(path.extname(f).toLowerCase()))
          .map((f, i) => {
            const m = meta[f] || meta[f.replace(path.extname(f), '')] || {};
            const title = m.title || titleFromFilename(f);
            const blurb = m.blurb;
            return {
              id: `${key}-${i}`,
              title,
              img: `/gallery/${key}/${encodeURIComponent(f)}`,
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


