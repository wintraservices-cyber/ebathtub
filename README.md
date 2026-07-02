# eBathtub.com — Vercel Deployment

## Folder structure

```
ebathtub-vercel/
├── index.html          ← the full site (single file)
├── vercel.json         ← routing config
├── .env.example        ← copy to .env.local for local dev
├── .gitignore
└── api/
    ├── generate-article.js      ← Gemini API proxy (AI Studio)
    └── get-amazon-products.js   ← Amazon Creators API proxy
```

## Deploy to Vercel

1. Push this folder to a GitHub repo
2. Vercel dashboard → "Add New Project" → import that repo
3. Add environment variable in Vercel dashboard → Settings → Environment Variables:
   - `GEMINI_API_KEY` — get free key at https://aistudio.google.com/app/apikey
4. Deploy — Vercel auto-detects `api/` functions and `vercel.json` routing

## Environment variables

| Variable | Required | Where to get it |
|---|---|---|
| `GEMINI_API_KEY` | Yes — Studio won't generate without it | aistudio.google.com (free, no card) |
| `AMAZON_CREATORS_CLIENT_ID` | No — safe to leave blank | Amazon Associates Central → Tools → Creators API |
| `AMAZON_CREATORS_CLIENT_SECRET` | No | Same as above |
| `AMAZON_PARTNER_TAG` | No | Your Associates tracking ID (e.g. ebathtub-20) |

Amazon vars only needed once you have 10 qualifying sales/30 days. Site falls back to styled placeholders without them.

## Access the AI Studio

Once deployed, go to:
```
https://your-project.vercel.app/?studio=hIEwAXKCbcoJ
```
Password: `D8FbIIKZtakX`

Then navigate to **Journal** in the site nav. Studio panel appears there only.

**Save these credentials somewhere safe** — they're not in the UI anywhere.

## Pre-launch checklist

- [ ] `GEMINI_API_KEY` added in Vercel environment variables
- [ ] Studio tested on live Vercel URL (generate a test draft)
- [ ] Apply for Amazon Associates at affiliate-program.amazon.com
- [ ] Wire real affiliate links into PRODUCTS (search `PASTE_AFFILIATE_LINK_HERE`)
- [ ] Set up privacy@ebathtub.com as a real inbox
- [ ] Confirm legal entity name (search `placeholder — confirm real entity name`)
- [ ] Connect real domain (ebathtub.com) in Vercel dashboard
- [ ] Remove `<meta name="robots" content="noindex, nofollow">` from index.html `<head>` when ready for public traffic
- [ ] Submit sitemap to Google Search Console

## Local dev (optional)

```bash
npm install -g vercel
cp .env.example .env.local   # add your real GEMINI_API_KEY
vercel dev                   # runs at http://localhost:3000
```
