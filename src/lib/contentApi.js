import {
  cloneDefaultContent,
  createPublishedContent,
  defaultContent,
  normalizeContent,
} from '../data/siteContent'
import { isSupabaseConfigured, supabase } from './supabase'

function requireSupabase() {
  if (!supabase) {
    throw new Error('Connect Supabase by setting VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
  }
  return supabase
}

export async function fetchPublishedContent() {
  if (!isSupabaseConfigured) return { content: cloneDefaultContent(), error: null }

  const client = requireSupabase()
  const { data, error } = await client
    .from('published_site_content')
    .select('content')
    .maybeSingle()

  if (error) {
    return { content: cloneDefaultContent(), error: error.message }
  }

  return { content: normalizeContent(data?.content), error: null }
}

export async function fetchAdminContent() {
  const client = requireSupabase()
  const { data, error } = await client
    .from('site_content')
    .select('draft_content,published_content,updated_at,published_at')
    .eq('id', 'portfolio')
    .maybeSingle()

  if (error) throw new Error(`Could not load saved website content: ${error.message}`)

  return data
    ? {
        draft: normalizeContent(data.draft_content),
        published: normalizeContent(data.published_content),
        updatedAt: data.updated_at,
        publishedAt: data.published_at,
      }
    : {
        draft: cloneDefaultContent(),
        published: cloneDefaultContent(),
        updatedAt: null,
        publishedAt: null,
      }
}

export async function saveDraft(content) {
  const client = requireSupabase()
  const now = new Date().toISOString()
  const { data, error: readError } = await client
    .from('site_content')
    .select('id')
    .eq('id', 'portfolio')
    .maybeSingle()
  if (readError) throw new Error(`Could not check saved website content: ${readError.message}`)

  const result = data
    ? await client
        .from('site_content')
        .update({ draft_content: content, updated_at: now })
        .eq('id', 'portfolio')
    : await client.from('site_content').insert({
        id: 'portfolio',
        draft_content: content,
        published_content: defaultContent,
        updated_at: now,
      })

  if (result.error?.code === '23505') return saveDraft(content)
  if (result.error) throw new Error(`Could not save website content: ${result.error.message}`)
  return now
}

export async function publishContent(content) {
  const client = requireSupabase()
  const now = new Date().toISOString()
  const publishedContent = createPublishedContent(content)
  const { error } = await client.from('site_content').upsert(
    {
      id: 'portfolio',
      draft_content: content,
      published_content: publishedContent,
      updated_at: now,
      published_at: now,
    },
    { onConflict: 'id' },
  )

  if (error) throw new Error(`Could not publish website content: ${error.message}`)
  return now
}

export async function uploadMedia(file) {
  const client = requireSupabase()
  const extensionByType = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/avif': 'avif',
  }
  const extension = extensionByType[file.type]
  if (!extension) throw new Error('Unsupported image type.')
  const path = `${crypto.randomUUID()}.${extension}`
  const { error } = await client.storage.from('portfolio-media').upload(path, file, {
    cacheControl: '3600',
    contentType: file.type,
    upsert: false,
  })

  if (error) throw new Error(`Image upload failed: ${error.message}`)
  const { data } = client.storage.from('portfolio-media').getPublicUrl(path)
  return { path, url: data.publicUrl }
}

export async function deleteMedia(path) {
  const client = requireSupabase()
  const { error } = await client.storage.from('portfolio-media').remove([path])
  if (error) throw new Error(`Image deletion failed: ${error.message}`)
}

export async function listMedia() {
  const client = requireSupabase()
  const { data, error } = await client.storage.from('portfolio-media').list('', {
    limit: 200,
    sortBy: { column: 'name', order: 'asc' },
  })
  if (error) throw new Error(`Could not load stored images: ${error.message}`)
  return (data || []).filter((item) => item.id).map((item) => ({
    path: item.name,
    url: client.storage.from('portfolio-media').getPublicUrl(item.name).data.publicUrl,
  }))
}
