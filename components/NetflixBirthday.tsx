"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { siteConfig } from "@/app/site-config";

type Media = { id: string; title: string; kind: 'image' | 'video'; src: string; poster?: string; blurb?: string };
type GroupedItem = { id: string; dateLabel: string; blurb?: string; items: Media[] };
type Row = { title: string; items: GroupedItem[] };
type Hero = { type: 'image' | 'video'; src: string; poster?: string; fit?: 'cover' | 'contain' };
type Selected = { group: GroupedItem; index: number; rowTitle: string } | null;

function buildPlaceholderRows(): Row[] {
  return [
    {
      title: "Top Moments • Director's Cut",
      items: Array.from({ length: 7 }).map((_, i) => ({
        id: `top-${i}`,
        dateLabel: `May ${i + 1}, 2025`,
        items: [
          { id: `top-${i}-a`, title: `Scene ${i + 1}`.toUpperCase(), kind: 'image' as const, src: `https://picsum.photos/seed/top${i}a/960/540`, blurb: "A frame we keep rewatching." },
          { id: `top-${i}-b`, title: `Scene ${i + 1}B`.toUpperCase(), kind: 'image' as const, src: `https://picsum.photos/seed/top${i}b/960/540`, blurb: "Second take." }
        ]
      }))
    },
    {
      title: "Trips & Adventures",
      items: Array.from({ length: 6 }).map((_, i) => ({
        id: `trip-${i}`,
        dateLabel: `June ${i + 2}, 2025`,
        items: [
          { id: `trip-${i}-a`, title: `Stop ${i + 1}`.toUpperCase(), kind: 'image' as const, src: `https://picsum.photos/seed/trip${i}/960/540`, blurb: "Snacks + sunsets." }
        ]
      }))
    },
    {
      title: "Food & Coffee Stories",
      items: Array.from({ length: 5 }).map((_, i) => ({
        id: `food-${i}`,
        dateLabel: `July ${i + 3}, 2025`,
        items: [
          { id: `food-${i}-a`, title: `Bite ${i + 1}`.toUpperCase(), kind: 'image' as const, src: `https://picsum.photos/seed/food${i}/960/540`, blurb: "Taste test: us." }
        ]
      }))
    },
    {
      title: "Inside Jokes Playlist",
      items: Array.from({ length: 5 }).map((_, i) => ({
        id: `joke-${i}`,
        dateLabel: `August ${i + 4}, 2025`,
        items: [
          { id: `joke-${i}-a`, title: `Episode ${i + 1}`.toUpperCase(), kind: 'image' as const, src: `https://picsum.photos/seed/joke${i}/960/540`, blurb: "Pauses for laughter." }
        ]
      }))
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
  const [intro, setIntro] = useState(false);

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
                onClick={() => { setCurrentProfile(name); setSplash(true); setTimeout(() => setProfilePicked(true), 1100); setTimeout(() => setIntro(true), 1150); setTimeout(() => setIntro(false), 2300); }}
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
      <nav className={`fixed top-0 left-0 right-0 z-40 flex items-center gap-6 px-6 md:px-10 py-4 bg-gradient-to-b from-black/90 to-black/0 ${intro ? 'lift-in' : ''}`}>
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

      <header className={`relative h-[72vh] md:h-[78vh] w-full overflow-hidden ${intro ? 'overlay-zoom' : ''}`}>
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
            src={hero?.src || (rows[0]?.items?.[0]?.items?.[0]?.src) || "https://picsum.photos/seed/heroMem/1920/1080"}
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

      <main className={`relative z-10 -mt-20 md:-mt-24 ${intro ? 'lift-in' : ''}`}>
        <Section id="moments" title="Because every frame is a feeling">
          {rows.slice(0, 1).map((row) => (
            <Row key={row.title} title={row.title}>
              {row.items.map((group) => (
                <Card key={group.id} group={group} onSelect={(index) => setSelected({ group, index, rowTitle: row.title })} />
              ))}
            </Row>
          ))}
        </Section>

        <Section id="trips" title="Trips & Adventures">
          {rows.slice(1, 2).map((row) => (
            <Row key={row.title} title={row.title}>
              {row.items.map((group) => (
                <Card key={group.id} group={group} onSelect={(index) => setSelected({ group, index, rowTitle: row.title })} />
              ))}
            </Row>
          ))}
        </Section>

        <Section id="food" title="Food & Coffee Stories">
          {rows.slice(2, 3).map((row) => (
            <Row key={row.title} title={row.title}>
              {row.items.map((group) => (
                <Card key={group.id} group={group} onSelect={(index) => setSelected({ group, index, rowTitle: row.title })} />
              ))}
            </Row>
          ))}
        </Section>

        <Section id="jokes" title="Inside Jokes Playlist">
          {rows.slice(3, 4).map((row) => (
            <Row key={row.title} title={row.title}>
              {row.items.map((group) => (
                <Card key={group.id} group={group} onSelect={(index) => setSelected({ group, index, rowTitle: row.title })} />
              ))}
            </Row>
          ))}
        </Section>
      </main>

      <footer className="mt-20 px-6 md:px-10 py-16 text-white/50 text-xs md:text-sm grid gap-2">
        <p>Made with popcorn by Nilesh · Not affiliated with Netflix.</p>
      </footer>

      {selected && (
        <DetailModal
          group={selected.group}
          startIndex={selected.index}
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
      <span className="text-white">{siteConfig.appName}</span>
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

function Card({ group, onSelect }: { group: GroupedItem; onSelect: (index: number) => void }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const autoCycleMs = 2800;
  const slides = group.items;

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slides.length);
    }, autoCycleMs);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  const active = useMemo(() => slides[activeIndex] || slides[0], [slides, activeIndex]);

  function handleSelect() {
    onSelect(activeIndex);
  }

  return (
    <div
      className="group relative w-[200px] md:w-[260px] flex-shrink-0 snap-start transition-transform duration-200 ease-out hover:scale-[1.12] hover:translate-y-[-8px] hover:z-20"
      onClick={handleSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSelect(); }}
    >
      <div className="rounded-md overflow-hidden bg-white/5 border border-white/10 relative h-[112px] md:h-[146px]">
        {slides.map((slide, idx) => (
          <Slide
            key={slide.id}
            item={slide}
            isActive={idx === activeIndex}
          />
        ))}
        {slides.length > 1 && (
          <div className="absolute bottom-1.5 left-0 right-0 flex justify-center gap-1.5">
            {slides.map((_, i) => (
              <span
                key={i}
                className={`h-1 w-4 rounded-full transition-all duration-200 ${i === activeIndex ? 'bg-white' : 'bg-white/40'}`}
              />
            ))}
          </div>
        )}
      </div>
      <div className="mt-2">
        <div className="text-[11px] md:text-sm font-semibold leading-tight line-clamp-1">{group.dateLabel}</div>
        {active.blurb && <div className="text-[10px] md:text-xs text-white/60 line-clamp-2">{active.blurb}</div>}
        {slides.length > 1 && <div className="text-[9px] md:text-[10px] text-white/50 mt-0.5">{slides.length} memories</div>}
      </div>
    </div>
  );
}

function Slide({ item, isActive }: { item: Media; isActive: boolean }) {
  const vidRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (item.kind !== 'video' || !vidRef.current) return;
    if (isActive) {
      try {
        vidRef.current.currentTime = 0;
        vidRef.current.play().catch(() => {});
      } catch {}
    } else {
      try {
        vidRef.current.pause();
        vidRef.current.currentTime = 0;
      } catch {}
    }
  }, [isActive, item.kind]);

  return (
    <div className={`absolute inset-0 transition-opacity duration-500 ease-out ${isActive ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      {item.kind === 'video' ? (
        <video
          ref={vidRef}
          src={item.src}
          poster={item.poster}
          muted
          playsInline
          loop
          className="h-full w-full object-cover"
        />
      ) : (
        <img src={item.src} alt={item.title} className="h-full w-full object-cover" />
      )}
    </div>
  );
}

function DetailModal({ group, startIndex, rowTitle, onClose }: { group: GroupedItem; startIndex: number; rowTitle: string; onClose: () => void }) {
  const [activeIndex, setActiveIndex] = useState(Math.max(0, Math.min(startIndex, group.items.length - 1)));
  const touchStartX = useRef<number | null>(null);
  const AUTO_MS = 3200;

  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = original; };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % group.items.length);
    }, AUTO_MS);
    return () => window.clearInterval(timer);
  }, [group.items.length]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setActiveIndex((prev) => (prev + 1) % group.items.length);
      if (e.key === 'ArrowLeft') setActiveIndex((prev) => (prev - 1 + group.items.length) % group.items.length);
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [group.items.length, onClose]);

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 40) return;
    if (delta < 0) {
      setActiveIndex((prev) => (prev + 1) % group.items.length);
    } else {
      setActiveIndex((prev) => (prev - 1 + group.items.length) % group.items.length);
    }
  }

  const item = group.items[activeIndex];
  return (
    <div className="fixed inset-0 z-[200]">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="absolute inset-0 grid place-items-center px-4">
        <div className="w-full max-w-4xl" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <div className="relative w-full overflow-hidden rounded-lg bg-black h-[55vh] md:h-[65vh]">
            {group.items.map((media, idx) => (
              <div
                key={media.id}
                className={`absolute inset-0 transition-opacity duration-500 ${idx === activeIndex ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
              >
                {media.kind === 'video' ? (
                  <video
                    src={media.src}
                    poster={media.poster}
                    autoPlay={idx === activeIndex}
                    muted
                    loop
                    controls
                    playsInline
                    className="w-full h-[50vh] md:h-[60vh] object-contain bg-black"
                  />
                ) : (
                  <img src={media.src} alt={media.title} className="w-full h-[50vh] md:h-[60vh] object-contain bg-black" />
                )}
              </div>
            ))}
            {group.items.length > 1 && (
              <>
                <button
                  onClick={() => setActiveIndex((prev) => (prev - 1 + group.items.length) % group.items.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white rounded-full w-10 h-10 grid place-items-center"
                  aria-label="Previous"
                >
                  ‹
                </button>
                <button
                  onClick={() => setActiveIndex((prev) => (prev + 1) % group.items.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white rounded-full w-10 h-10 grid place-items-center"
                  aria-label="Next"
                >
                  ›
                </button>
              </>
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
            <div className="text-xs text-white/40">{group.dateLabel}</div>
            <div className="text-xl md:text-2xl font-bold">{item.title}</div>
            {item.blurb && <div className="text-white/80 text-sm md:text-base">{item.blurb}</div>}
            {group.items.length > 1 && (
              <div className="flex gap-1 mt-2">
                {group.items.map((_, idx) => (
                  <span key={idx} className={`h-1.5 w-6 rounded-full ${idx === activeIndex ? 'bg-white' : 'bg-white/30'}`} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
