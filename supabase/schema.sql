-- Run once in the Supabase SQL editor for the project connected to this site.
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
revoke all on public.admin_users from anon, authenticated;

create or replace function public.is_site_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_site_admin() from public, anon;
grant execute on function public.is_site_admin() to authenticated;

create table if not exists public.site_content (
  id text primary key check (id = 'portfolio'),
  draft_content jsonb not null,
  published_content jsonb not null,
  updated_at timestamptz not null default now(),
  published_at timestamptz not null default now()
);

alter table public.site_content enable row level security;
revoke all on public.site_content from anon, authenticated;
grant select, insert, update on public.site_content to authenticated;

drop policy if exists "Only site admins can read content drafts" on public.site_content;
create policy "Only site admins can read content drafts"
  on public.site_content for select to authenticated
  using ((select public.is_site_admin()));

drop policy if exists "Only site admins can create site content" on public.site_content;
create policy "Only site admins can create site content"
  on public.site_content for insert to authenticated
  with check ((select public.is_site_admin()));

drop policy if exists "Only site admins can update site content" on public.site_content;
create policy "Only site admins can update site content"
  on public.site_content for update to authenticated
  using ((select public.is_site_admin()))
  with check ((select public.is_site_admin()));

create table if not exists public.content_write_events (
  user_id uuid not null,
  created_at timestamptz not null default now()
);

create index if not exists content_write_events_user_created_idx
  on public.content_write_events (user_id, created_at desc);

alter table public.content_write_events enable row level security;
revoke all on public.content_write_events from public, anon, authenticated;

create or replace function public.limit_site_content_writes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  recent_writes integer;
begin
  if current_user_id is null then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(current_user_id::text, 0));

  delete from public.content_write_events
  where created_at < now() - interval '1 day';

  select count(*) into recent_writes
  from public.content_write_events
  where user_id = current_user_id
    and created_at > now() - interval '1 minute';

  if recent_writes >= 30 then
    raise exception 'Content write rate limit exceeded. Try again in one minute.'
      using errcode = 'P0001';
  end if;

  insert into public.content_write_events (user_id) values (current_user_id);
  return new;
end;
$$;

drop trigger if exists limit_site_content_writes on public.site_content;
create trigger limit_site_content_writes
  before insert or update on public.site_content
  for each row execute function public.limit_site_content_writes();

drop view if exists public.published_site_content;
create view public.published_site_content
with (security_barrier = true)
as
  select published_content as content, published_at
  from public.site_content
  where id = 'portfolio';

revoke all on public.published_site_content from public;
grant select on public.published_site_content to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'portfolio-media',
  'portfolio-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Portfolio media is publicly readable" on storage.objects;
create policy "Portfolio media is publicly readable"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'portfolio-media');

drop policy if exists "Only site admins can upload portfolio media" on storage.objects;
create policy "Only site admins can upload portfolio media"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'portfolio-media'
    and (select public.is_site_admin())
  );

drop policy if exists "Only site admins can update portfolio media" on storage.objects;
create policy "Only site admins can update portfolio media"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'portfolio-media'
    and (select public.is_site_admin())
  )
  with check (
    bucket_id = 'portfolio-media'
    and (select public.is_site_admin())
  );

drop policy if exists "Only site admins can delete portfolio media" on storage.objects;
create policy "Only site admins can delete portfolio media"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'portfolio-media'
    and (select public.is_site_admin())
  );
