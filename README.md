# StreamFlix Birthday (Next.js + Tailwind)

A Netflix-style birthday microsite for Shiwangi × Nilesh. Built with Next.js (App Router) and Tailwind CSS. Deploy-ready for Vercel.

## Local development

```bash
npm install
npm run dev
# open http://localhost:3000
```

## Project structure

- `app/` App Router entry (`page.tsx`, `layout.tsx`)
- `components/NetflixBirthday.tsx` main client component
- `app/globals.css` Tailwind layers
- `public/ta-dum.mp3` splash sound (add your own file)

## Your images (configurable gallery)

Put images into these folders (create them if they don't exist):

- `public/gallery/moments/`
- `public/gallery/trips/`
- `public/gallery/food/`
- `public/gallery/jokes/`

Supported extensions: `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, `.svg`.

Optional: Add a `meta.json` file next to the images to customize titles and blurbs. Example:

```json
{
  "IMG_0001.jpg": { "title": "First Trip", "blurb": "Goa sunrise" },
  "IMG_0002.jpg": { "title": "Coffee Date" }
}
```

The app exposes an API at `/api/gallery` that reads these folders and powers the homepage rows. If folders are empty, it falls back to placeholder images.

## Hero media (image or video)

Place files in `public/hero/`:

- For an image hero: add one of `hero.jpg|png|webp` (any name works). It will be used as the banner.
- For a video hero (supports portrait or landscape): add an `.mp4|.webm|.mov` file. Optional poster image with the same base name.

Optional `public/hero/meta.json` to select a specific file and object-fit behavior:

```json
{
  "select": "intro.mp4",
  "fit": "cover"  
}
```

`fit` can be `cover` (fill, possibly cropping) or `contain` (letterbox). Portrait videos will be scaled appropriately within the banner area.

## Deploy to Vercel

- Push to GitHub → New Project on Vercel → import → deploy (defaults).

## Notes

- Tailwind `line-clamp` is enabled.
- Avatars: DiceBear; Images: Picsum placeholders.
