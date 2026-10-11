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

This file stores the athlete profile, journey timeline, achievement placeholders, gallery images, videos, and contact fields. Update it with verified public details only.

## Design notes

- Dark cinematic sports aesthetic with lime accents
- Responsive sections for mobile, tablet, and desktop
- YouTube placeholders remain easy to replace with real public video links
- No fabricated records, medals, personal data, or sports claims are included
