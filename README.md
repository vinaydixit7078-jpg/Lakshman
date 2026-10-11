# EK LAKSHYA Athlete Portfolio

Premium single-page portfolio for Laxman Chauhan under the athlete brand EK LAKSHYA. This project uses React + Vite and is structured so the athlete content, achievements, gallery, and social/video links remain easy to edit from one central configuration file.

## Tech stack

- React
- Vite
- Tailwind CSS
- Framer Motion
- Lucide React

## Local development

```bash
npm install
npm run dev -- --host 0.0.0.0
```

Then open the local Vite URL shown in the terminal, usually:

```text
http://localhost:5173/
```

## Production build

```bash
npm run build
```

## Deployment

### Vercel

1. Push the project to GitHub.
2. Import the repository in Vercel.
3. Use the default Vite settings and deploy.
4. Set the framework preset to Vite if prompted.

### Netlify or other static hosts

1. Run `npm run build`.
2. Upload the generated `dist` folder as a static site.
3. Ensure the host is configured to serve `index.html` for SPA routing.

## Editable portfolio data

The central content file is:

```text
src/data/athleteData.js
```

This file stores the verified athlete identity, channel link, editorial journey, general training themes, and gallery assets. Update it with verified details only. Personal records and video cards are intentionally omitted until verified results or real video links are available.

## Design notes

- Dark cinematic sports aesthetic with lime accents
- Responsive sections for mobile, tablet, and desktop
- Laxman's supplied portrait is used locally; other sports photography is illustrative and is not presented as his
- No profile form, dashboard, account, or database is required to view the site
- No fabricated records, medals, dates, or personal details are displayed
- The official YouTube channel is linked directly; public channel copy describes Speed, Strength, and Fitness
