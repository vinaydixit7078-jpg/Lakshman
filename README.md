# EK LAKSHYA Athlete Portfolio

Responsive React + Vite athlete portfolio and private content dashboard for Laxman Chauhan. Public visitors see the built-in portfolio defaults immediately. When Supabase is configured, public pages read the published content document and authenticated admins can save drafts, publish edits, and upload images.

## Local development

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` after creating the Supabase project described below. Without those values, the public portfolio uses the bundled defaults and `/admin/login` displays the secure setup instructions; the dashboard does not pretend that local state is persistent.

```bash
npm run lint
npm run build
npm run preview
```

## Secure Supabase setup

The project uses Supabase Auth plus Postgres Row Level Security. The Supabase service-role key is never used in browser code. The public anon/publishable key is intended to be public; database and Storage policies still enforce admin authorization on the server.

1. Create a Supabase project and keep its project URL and anon/publishable key.
2. Open the Supabase SQL editor and run [`supabase/schema.sql`](./supabase/schema.sql). It creates the admin allowlist, content tables and policies, a view that exposes only the published content, a limited write-rate trigger, and the public-read/admin-write `portfolio-media` bucket.
3. In Supabase Authentication settings, disable public sign-ups. Configure the site URL as `https://lakshman-ten.vercel.app` and allow these redirect URLs: `https://lakshman-ten.vercel.app/admin/login` and `http://localhost:5173/admin/login`. Keep Supabase Auth's built-in request limits enabled; configure CAPTCHA or stronger protection there if the project is exposed to abuse.
4. Create Laxman's account from the trusted Supabase dashboard (for example, invite his email). Do not add a public registration form. Copy the created Auth user's UUID and allowlist only that account using the SQL editor:

   ```sql
   insert into public.admin_users (user_id)
   values ('AUTH_USER_UUID');
   ```

   Use the UUID displayed for the invited user. To revoke access, delete that row; the user will no longer pass the database authorization function and policies.
5. In Authentication → URL Configuration, set the Site URL to `https://lakshman-ten.vercel.app` and allow the redirect URLs `https://lakshman-ten.vercel.app/admin/login` and `http://localhost:5173/admin/login`. Password recovery links return to the admin sign-in page and open the password reset form automatically.
6. Copy `.env.example` to `.env.local` and fill in the project URL and anon/publishable key. Add the same two `VITE_` variables to the Vercel project's Production, Preview, and Development environments, then redeploy. `VITE_SUPABASE_ANON_KEY` is a public client key, not a secret. **Never add the Supabase service-role key to a `VITE_` variable or this repository.**
7. Visit `/admin/login`, sign in with the invited account, and manage draft content. Use **Publish** to make the saved draft visible to the public portfolio. A draft save alone does not replace public content.

The dashboard route is `/admin` and sign-in is at `/admin/login`. Vercel rewrites in [`vercel.json`](./vercel.json) make these client routes serve the existing Vite application. Supabase Auth verifies credentials; the database's `is_site_admin()` function and RLS policies independently authorize every content mutation and upload, including direct API requests. Passwords are not stored by this app. Supabase Auth persists its session token using the SDK; website content is stored in Postgres, not browser storage.

## Content, drafts, and image storage

- [`src/data/siteContent.js`](./src/data/siteContent.js) contains complete, truthful defaults used until the first published Supabase document exists.
- The dashboard edits a structured content document used by both the public page and admin preview.
- Public reads go through `published_site_content`, which projects only published JSON. Drafts are accessible only to an authenticated allowlisted administrator.
- Draft save and publish are separate actions. Publish copies the draft to the public column; changes are picked up on a page visit, focus, or within the public page's refresh interval.
- Gallery uploads go to the persistent Supabase Storage bucket. JPEG, PNG, WebP, and AVIF are accepted up to 5 MB each (up to 20 selected per batch). Image metadata, captions, alt text, visibility, and order are managed in the dashboard. An upload can be previewed before it is stored.
- The dashboard checks both draft and published references before allowing removal of stored files. Remove an image from the content and publish that change before deleting the now-unreferenced object.
- The SQL trigger limits content writes to 30 per authenticated administrator per minute. Supabase Auth request limiting applies to sign-in and token endpoints.
- Videos are regular validated YouTube or Shorts URLs; no YouTube API key is required. Video titles and thumbnails can be maintained manually.
- Unknown age, hometown, times, rankings, results, sponsors, email addresses, and social accounts are not fabricated. Achievements start empty.

## Routes and security boundaries

- `/` — public portfolio; reads only published data.
- `/admin/login` — Supabase Auth password sign-in only; no public sign-up.
- `/admin` — private editor, overview, content management, section ordering/visibility, appearance, SEO, site settings, and session/logout controls.
- Postgres RLS denies anonymous writes and denies authenticated non-admin writes. Storage write/delete policies use the same admin check. The public storage bucket allows image delivery only; uploaded objects are still limited by bucket MIME types and size.
- User-facing URLs are validated to HTTP(S) (or safe same-site anchors for buttons); YouTube video URLs are parsed against the supported YouTube host/path formats. Theme settings use predefined fonts/radii/spacing and validated color values; arbitrary CSS/HTML is not accepted.

## Deployment

The existing Vercel project can continue deploying this Vite application from GitHub. Configure the Supabase environment variables in Vercel before expecting login, persistent edits, or uploads to work in production. Until that setup is complete, the public page continues to display defaults and the admin route explains what is missing.

After setting the environment variables, deploy the branch and verify:

1. The public site loads published/default portfolio content.
2. `/admin/login` loads directly and unauthenticated `/admin` redirects to sign-in.
3. A non-allowlisted account cannot open the editor or write through Supabase APIs.
4. An allowlisted admin can save a draft, publish it, refresh the public page, and see the saved change.
5. Gallery upload, public image loading, draft removal, publish, and safe object cleanup work.

Google indexing is separate from Vercel deployment and is not guaranteed by publishing site changes.
