const MAX_IMAGE_SIZE = 5 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif'])

export function validateExternalUrl(value, { allowRelative = false } = {}) {
  const input = value.trim()
  if (allowRelative && input.startsWith('/') && !input.startsWith('//')) return input
  if (allowRelative && input.startsWith('#')) return input

  let url
  try {
    url = new URL(input)
  } catch {
    throw new Error('Enter a complete URL starting with https://.')
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('Only HTTP and HTTPS links are allowed.')
  }
  if (url.username || url.password) {
    throw new Error('Links with embedded credentials are not allowed.')
  }

  return url.toString()
}

export function validateYouTubeUrl(value) {
  const url = new URL(validateExternalUrl(value))
  const host = url.hostname.toLowerCase().replace(/^www\./, '')
  let id = ''

  if (host === 'youtu.be') {
    id = url.pathname.split('/').filter(Boolean)[0] || ''
  } else if (host === 'youtube.com' || host === 'm.youtube.com') {
    if (url.pathname === '/watch') id = url.searchParams.get('v') || ''
    else if (/^\/(shorts|embed)\/[A-Za-z0-9_-]+/.test(url.pathname)) {
      id = url.pathname.split('/')[2]
    }
  }

  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) {
    throw new Error('Enter a valid YouTube video or Shorts URL.')
  }
  return { id, url: `https://www.youtube.com/watch?v=${id}` }
}

export async function validateImageFile(file) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error('Choose a JPEG, PNG, WebP, or AVIF image.')
  }
  if (file.size <= 0 || file.size > MAX_IMAGE_SIZE) {
    throw new Error('Images must be 5 MB or smaller.')
  }

  const bytes = new Uint8Array(await file.slice(0, 32).arrayBuffer())
  const signatureMatches = {
    'image/jpeg': bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
    'image/png': bytes.subarray(0, 8).join(',') === '137,80,78,71,13,10,26,10',
    'image/webp': String.fromCharCode(...bytes.subarray(0, 4)) === 'RIFF'
      && String.fromCharCode(...bytes.subarray(8, 12)) === 'WEBP',
    'image/avif': String.fromCharCode(...bytes.subarray(4, 8)) === 'ftyp'
      && ['avif', 'avis'].includes(String.fromCharCode(...bytes.subarray(8, 12))),
  }[file.type]

  if (!signatureMatches) throw new Error('The selected file contents do not match a supported image format.')
}

export function validateContent(content, requireComplete = false) {
  if (!content || typeof content !== 'object' || Array.isArray(content)) {
    throw new Error('Content must be a valid object.')
  }
  if (JSON.stringify(content).length > 1_000_000) {
    throw new Error('Website content is too large. Reduce the text or media list before saving.')
  }
  for (const collection of [content.about.details, content.journey.items, content.achievements, content.training.items, content.videos, content.gallery, content.socials]) {
    if (collection.length > 200) throw new Error('A content collection cannot contain more than 200 entries.')
  }
  const textValues = JSON.stringify(content).match(/"(?:[^"\\]|\\.)*"/g) || []
  if (textValues.some((value) => value.length > 20_000)) {
    throw new Error('A content field is too long. Keep individual fields under 20,000 characters.')
  }

  if (requireComplete && (!content.site?.fullName?.trim() || !content.site?.brand?.trim())) {
    throw new Error('Athlete name and brand cannot be empty.')
  }

  const optionalUrl = (value, options) => {
    if (typeof value === 'string' && value.trim()) validateExternalUrl(value, options)
  }
  optionalUrl(content.site.channelUrl)
  optionalUrl(content.site.hero.portrait, { allowRelative: true })
  optionalUrl(content.site.hero.backgroundImage, { allowRelative: true })
  optionalUrl(content.about.portrait, { allowRelative: true })
  optionalUrl(content.site.hero.primaryHref, { allowRelative: true })
  optionalUrl(content.site.hero.secondaryHref, { allowRelative: true })
  optionalUrl(content.seo.image, { allowRelative: true })
  optionalUrl(content.seo.favicon, { allowRelative: true })
  optionalUrl(content.seo.siteUrl)
  if (requireComplete && (!content.site.channelUrl?.trim() || !content.site.hero.headline?.trim() || !content.site.hero.subheadline?.trim() || !content.site.hero.primaryLabel?.trim() || !content.site.hero.secondaryLabel?.trim())) {
    throw new Error('Complete the hero headline, description, YouTube channel, and button labels before publishing.')
  }
  if (!['center', 'center top', 'center bottom', 'left center', 'right center'].includes(content.site.hero.backgroundPosition)) {
    throw new Error('Choose a supported hero image position.')
  }
  const visibleSections = content.sections.filter((section) => section.visible)
  if (requireComplete && (visibleSections.length === 0 || visibleSections.some((section) => !section.label?.trim()))) {
    throw new Error('Keep at least one public section and give each visible section a navigation label.')
  }
  const validAnchors = new Set(['home', ...visibleSections.map((section) => section.id)])
  for (const destination of [content.site.hero.primaryHref, content.site.hero.secondaryHref]) {
    if (typeof destination === 'string' && destination.startsWith('#') && !validAnchors.has(destination.slice(1))) {
      throw new Error(`The hero button destination ${destination} does not match a visible section.`)
    }
  }

  for (const item of [...content.gallery, ...content.training.items, ...content.journey.items]) {
    optionalUrl(item.image, { allowRelative: true })
  }
  for (const item of content.achievements) {
    optionalUrl(item.image, { allowRelative: true })
    if (requireComplete && item.published !== false && !item.title?.trim()) {
      throw new Error('Published achievements need a title.')
    }
    optionalUrl(item.evidenceUrl)
  }
  for (const item of content.journey.items) {
    if (requireComplete && item.published !== false && (!item.title?.trim() || !item.description?.trim())) {
      throw new Error('Published journey entries need a title and description.')
    }
  }
  for (const item of content.training.items) {
    optionalUrl(item.videoUrl)
    if (requireComplete && item.published !== false && !item.title?.trim()) {
      throw new Error('Published training entries need a title.')
    }
  }
  for (const item of content.videos) {
    if (item.url?.trim()) validateYouTubeUrl(item.url)
    else if (requireComplete && item.published !== false) throw new Error('Published videos need a valid YouTube URL.')
    optionalUrl(item.thumbnail)
    if (requireComplete && item.published !== false && !item.title?.trim()) {
      throw new Error('Published videos need a title.')
    }
  }
  for (const item of content.socials) {
    if (!item.url?.trim()) {
      if (requireComplete && item.enabled) throw new Error('Enabled social links need a URL.')
      continue
    }
    const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.url.trim())
    if (!email) validateExternalUrl(item.url)
    if (requireComplete && item.enabled && !item.label?.trim()) throw new Error('Enabled social links need a label.')
  }
  for (const item of content.gallery) {
    if (requireComplete && item.published !== false && (!item.image?.trim() || !item.alt?.trim())) {
      throw new Error('Published gallery images need an image URL and alternative text.')
    }
  }
  if (requireComplete && visibleSections.some((section) => section.id === 'about') && !content.about.intro?.trim()) {
    throw new Error('Add an introduction or hide the About section before publishing.')
  }

  for (const color of [content.appearance.accent, content.appearance.background, content.appearance.surface, content.appearance.text]) {
    if (!/^#[\da-f]{3}(?:[\da-f]{3})?$/i.test(color)) throw new Error(`Invalid color value: ${color}`)
  }
  if (!['Inter', 'Arial', 'Georgia', 'system-ui'].includes(content.appearance.font)) throw new Error('Choose a font from the safe list.')
  if (!['0.5rem', '1rem', '1.25rem', '1.75rem'].includes(content.appearance.radius)) throw new Error('Choose a supported card radius.')
  if (!['compact', 'comfortable', 'spacious'].includes(content.appearance.spacing)) throw new Error('Choose a supported section spacing.')
}
