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

## Deploy to Vercel

- Push to GitHub → New Project on Vercel → import → deploy (defaults).

## Notes

- Tailwind `line-clamp` is enabled.
- Avatars: DiceBear; Images: Picsum placeholders.
