"use client";

import React, { useState, useEffect, useRef } from "react";

type Item = { id: string; title: string; kind: 'image' | 'video'; src: string; poster?: string; blurb?: string };
type Row = { title: string; items: Item[] };
type Hero = { type: 'image' | 'video'; src: string; poster?: string; fit?: 'cover' | 'contain' };
type Selected = { item: Item; rowTitle: string } | null;

function buildPlaceholderRows(): Row[] {
  return [
    {
      title: "Top Moments • Director's Cut",
      items: Array.from({ length: 14 }).map((_, i) => ({ id: `top-${i}`, title: `Scene ${i + 1}`.toUpperCase(), kind: 'image' as const, src: `https://picsum.photos/seed/top${i}/960/540`, blurb: "A frame we keep rewatching." }))
    },
    {
      title: "Trips & Adventures",
      items: Array.from({ length: 16 }).map((_, i) => ({ id: `trip-${i}`, title: `Stop ${i + 1}`.toUpperCase(), kind: 'image' as const, src: `https://picsum.photos/seed/trip${i}/960/540`, blurb: "Snacks + sunsets." }))
    },
    {
      title: "Food & Coffee Stories",
      items: Array.from({ length: 12 }).map((_, i) => ({ id: `food-${i}`, title: `Bite ${i + 1}`.toUpperCase(), kind: 'image' as const, src: `https://picsum.photos/seed/food${i}/960/540`, blurb: "Taste test: us." }))
    },
    {
      title: "Inside Jokes Playlist",
      items: Array.from({ length: 12 }).map((_, i) => ({ id: `joke-${i}`, title: `Episode ${i + 1}`.toUpperCase(), kind: 'image' as const, src: `https://picsum.photos/seed/joke${i}/960/540`, blurb: "Pauses for laughter." }))
    }
  ];
}

export default function NetflixBirthday() {
  const celebrantName = "Shiwangi";
  const [profilePicked, setProfilePicked] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<string | null>(null);
  const [splash, setSplash] = useState(false);
  const splashAudioRef = useRef<HTMLAudioElement | null>(null);
  const [rows, setRows] = useState<Row[]>(buildPlaceholderRows());
  const [hero, setHero] = useState<Hero | undefined>(undefined);
  const [loadedFromGallery, setLoadedFromGallery] = useState(false);
  const [selected, setSelected] = useState<Selected>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadGallery() {
      try {
        const res = await fetch('/api/gallery', { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as { rows?: Row[]; hero?: Hero };
        const incoming = Array.isArray(data.rows) ? data.rows : [];
        const hasAny = incoming.some(r => Array.isArray(r.items) && r.items.length > 0);
        if (!cancelled && hasAny) {
          setRows(incoming);
          setLoadedFromGallery(true);
        }
        if (!cancelled && data.hero) {
          setHero(data.hero);
        }
      } catch {
        // keep placeholders on error
      }
    }
    loadGallery();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!splash) return;
    if (splashAudioRef.current) {
      try { splashAudioRef.current.currentTime = 0; splashAudioRef.current.play().catch(() => {}); } catch {}
    }
    const t = setTimeout(() => setSplash(false), 1100);
    return () => clearTimeout(t);
  }, [splash]);

  if (splash) {
    return (
      <div className="fixed inset-0 grid place-items-center bg-black z-[100]">
        <div className="text-red-600 font-black" style={{ fontSize: "20vw", lineHeight: 1 }}>N</div>
        <audio ref={splashAudioRef} src="/ta-dum.mp3" preload="auto" />
      </div>
    );
  }

  if (!profilePicked) {
    const profiles = [celebrantName, "Nilesh"] as const;
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-6xl mx-auto flex flex-col items-center justify-center py-20 px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-12">Who's watching?</h1>
          <div className="grid grid-cols-2 gap-8 md:gap-12 place-items-center">
            {profiles.map((name) => (
              <button
                key={name}
                onClick={() => { setCurrentProfile(name); setSplash(true); setTimeout(() => setProfilePicked(true), 1100); }}
                className="group focus:outline-none"
              >
                <div className="w-28 h-28 md:w-44 md:h-44 rounded overflow-hidden bg-white/5 ring-2 ring-transparent group-hover:ring-white/80 transition duration-200">
                  <img src={`https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(name)}`} alt={name} className="w-full h-full object-cover" />
                </div>
                <div className="mt-4 text-sm md:text-base uppercase tracking-wider text-white/70 group-hover:text-white">{name}</div>
              </button>
            ))}
          </div>
          <div className="mt-10 text-xs md:text-sm text-white/40">Use your profile to personalize memories</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="fixed top-0 left-0 right-0 z-40 flex items-center gap-6 px-6 md:px-10 py-4 bg-gradient-to-b from-black/90 to-black/0">
        <Logo />
        <a className="text-sm md:text-base text-white hover:opacity-90" href="#">Home</a>
        <a className="text-sm md:text-base text-white/80 hover:text-white" href="#moments">Moments</a>
        <a className="text-sm md:text-base text-white/80 hover:text-white" href="#trips">Trips</a>
        <a className="text-sm md:text-base text-white/80 hover:text-white" href="#jokes">Inside Jokes</a>
        <div className="ml-auto flex items-center gap-3">
          {currentProfile && (
            <div className="flex items-center gap-2">
              <img src={`https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(currentProfile)}`} alt={currentProfile} className="w-7 h-7 md:w-8 md:h-8 rounded" />
              <span className="text-xs md:text-sm text-white/80">{currentProfile}</span>
            </div>
          )}
          <button
            onClick={() => { setProfilePicked(false); setSplash(true); setTimeout(() => { setCurrentProfile(null); }, 1100); }}
            className="text-xs md:text-sm bg-white/10 hover:bg-white/20 rounded px-3 py-1"
          >
            Switch Profile
          </button>
        </div>
      </nav>

      <header className="relative h-[72vh] md:h-[78vh] w-full overflow-hidden">
        {hero?.type === 'video' ? (
          <video
            className={`absolute inset-0 h-full w-full object-${hero.fit || 'cover'}`}
            src={hero.src}
            poster={hero.poster}
            autoPlay
            muted
            loop
            playsInline
          />
        ) : (
          <img
            src={hero?.src || (rows[0]?.items?.[0]?.src) || "https://picsum.photos/seed/heroMem/1920/1080"}
            alt="Featured Memory"
            className={`absolute inset-0 h-full w-full object-${hero?.fit || 'cover'}`}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="relative z-10 max-w-7xl pt-28 md:pt-40 px-6 md:px-10">
          <div className="flex items-center gap-3 mb-3">
            <span className="inline-block rounded bg-red-600 px-2 py-0.5 text-[10px] md:text-xs font-bold">{loadedFromGallery ? 'GALLERY' : 'MEMORIES'}</span>
            <span className="text-white/70 text-[10px] md:text-xs">A Nilesh × {celebrantName} Original</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-[1.05]">The Story of Us</h1>
          <p className="mt-4 max-w-2xl text-white/90 text-sm md:text-lg">A binge-worthy collection of our favorite scenes, trips, coffees, and the inside jokes that keep rolling through the credits.</p>
          <div className="mt-6 flex items-center gap-3">
            <a href="#moments" className="bg-red-600 hover:bg-red-500 rounded-md px-4 md:px-5 py-2 md:py-2.5 font-semibold text-sm md:text-base">Play Memories</a>
            <a href="#" className="bg-white/10 hover:bg-white/20 rounded-md px-4 md:px-5 py-2 md:py-2.5 font-semibold text-sm md:text-base">My List</a>
          </div>
        </div>
      </header>

      <main className="relative z-10 -mt-20 md:-mt-24">
        <Section id="moments" title="Because every frame is a feeling">
          {rows.slice(0, 1).map((row) => (
            <Row key={row.title} title={row.title}>
              {row.items.map((it) => (
                <Card key={it.id} item={it} onSelect={(item) => setSelected({ item, rowTitle: row.title })} />
              ))}
            </Row>
          ))}
        </Section>

        <Section id="trips" title="Trips & Adventures">
          {rows.slice(1, 2).map((row) => (
            <Row key={row.title} title={row.title}>
              {row.items.map((it) => (
                <Card key={it.id} item={it} onSelect={(item) => setSelected({ item, rowTitle: row.title })} />
              ))}
            </Row>
          ))}
        </Section>

        <Section id="food" title="Food & Coffee Stories">
          {rows.slice(2, 3).map((row) => (
            <Row key={row.title} title={row.title}>
              {row.items.map((it) => (
                <Card key={it.id} item={it} onSelect={(item) => setSelected({ item, rowTitle: row.title })} />
              ))}
            </Row>
          ))}
        </Section>

        <Section id="jokes" title="Inside Jokes Playlist">
          {rows.slice(3, 4).map((row) => (
            <Row key={row.title} title={row.title}>
              {row.items.map((it) => (
                <Card key={it.id} item={it} onSelect={(item) => setSelected({ item, rowTitle: row.title })} />
              ))}
            </Row>
          ))}
        </Section>
      </main>

      <footer className="mt-20 px-6 md:px-10 py-16 text-white/50 text-xs md:text-sm grid gap-2">
        <p>Made with popcorn by Nilesh · Not affiliated with Netflix.</p>
        <p>Tip: Add your photos to /public/shiwangi and swap image URLs for a perfect binge.</p>
      </footer>

      {selected && (
        <DetailModal
          item={selected.item}
          rowTitle={selected.rowTitle}
          onClose={() => setSelected(null)}
        />)
      }
    </div>
  );
}

function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  const scale = size === "lg" ? "text-3xl md:text-5xl" : "text-2xl";
  return (
    <div className={`font-black tracking-tight ${scale}`}>
      <span className="text-red-600">S</span><span className="text-white">tream</span><span className="text-red-600">F</span><span className="text-white">lix</span>
    </div>
  );
}

function Section({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="relative px-6 md:px-10 pt-8 md:pt-10">
      <h2 className="text-lg md:text-2xl font-extrabold mb-3 md:mb-4">{title}</h2>
      {children}
    </section>
  );
}

function Row({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 md:mb-8">
      <div className="flex items-end justify-between mb-2">
        <h3 className="text-base md:text-lg font-bold">{title}</h3>
      </div>
      <div className="flex gap-3 md:gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
        {children}
      </div>
    </div>
  );
}

function Card({ item, onSelect }: { item: Item; onSelect: (item: Item) => void }) {
  const vidRef = useRef<HTMLVideoElement | null>(null);
  const hoverTimerRef = useRef<number | null>(null);
  const HOVER_DELAY_MS = 450;

  function clearHoverTimer() {
    if (hoverTimerRef.current !== null) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }
  function handleEnter() {
    if (item.kind !== 'video' || !vidRef.current) return;
    clearHoverTimer();
    hoverTimerRef.current = window.setTimeout(() => {
      try {
        if (!vidRef.current) return;
        vidRef.current.currentTime = 0;
        vidRef.current.play().catch(() => {});
      } catch {}
    }, HOVER_DELAY_MS);
  }
  function handleLeave() {
    clearHoverTimer();
    if (item.kind === 'video' && vidRef.current) {
      try {
        vidRef.current.pause();
        vidRef.current.currentTime = 0;
      } catch {}
    }
  }
  return (
    <div
      className="group relative w-[200px] md:w-[260px] flex-shrink-0 snap-start transition-transform duration-200 ease-out hover:scale-[1.12] hover:translate-y-[-8px] hover:z-20"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onClick={() => onSelect(item)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(item); }}
    >
      <div className="rounded-md overflow-hidden bg-white/5 border border-white/10">
        {item.kind === 'video' ? (
          <video
            ref={vidRef}
            src={item.src}
            poster={item.poster}
            muted
            playsInline
            loop
            className="h-[112px] md:h-[146px] w-full object-cover group-hover:scale-105 transition duration-300"
          />
        ) : (
          <img src={item.src} alt={item.title} className="h-[112px] md:h-[146px] w-full object-cover group-hover:scale-105 transition duration-300" />
        )}
      </div>
      <div className="mt-2">
        <div className="text-[11px] md:text-sm font-semibold leading-tight line-clamp-1">{item.title}</div>
        {item.blurb && <div className="text-[10px] md:text-xs text-white/60 line-clamp-2">{item.blurb}</div>}
      </div>
    </div>
  );
}

function DetailModal({ item, rowTitle, onClose }: { item: Item; rowTitle: string; onClose: () => void }) {
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = original; };
  }, []);
  return (
    <div className="fixed inset-0 z-[200]">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="absolute inset-0 grid place-items-center px-4">
        <div className="w-full max-w-4xl">
          <div className="relative w-full overflow-hidden rounded-lg bg-black">
            {item.kind === 'video' ? (
              <video
                src={item.src}
                poster={item.poster}
                autoPlay
                controls
                playsInline
                className="w-full h-[50vh] md:h-[60vh] object-contain bg-black"
              />
            ) : (
              <img src={item.src} alt={item.title} className="w-full h-[50vh] md:h-[60vh] object-contain bg-black" />
            )}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 bg-white/10 hover:bg-white/20 text-white rounded-full w-9 h-9 grid place-items-center"
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <div className="bg-zinc-900 text-white p-4 rounded-b-lg space-y-1">
            <div className="text-sm text-white/60">{rowTitle}</div>
            <div className="text-xl md:text-2xl font-bold">{item.title}</div>
            {item.blurb && <div className="text-white/80 text-sm md:text-base">{item.blurb}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}


