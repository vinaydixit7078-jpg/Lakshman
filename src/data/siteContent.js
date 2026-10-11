import { athleteData } from './athleteData.js'

export const defaultContent = {
  site: {
    brand: athleteData.brand,
    fullName: athleteData.fullName,
    role: athleteData.role,
    channelUrl: athleteData.channelUrl,
    channelDescription: athleteData.channelDescription,
    hero: {
      headline: athleteData.hero.headline,
      subheadline: athleteData.hero.subheadline,
      accent: athleteData.hero.accent,
      portrait: athleteData.portrait,
      backgroundImage:
        'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1600&q=80',
      backgroundPosition: 'center',
      primaryLabel: 'EXPLORE MY JOURNEY',
      primaryHref: '#journey',
      secondaryLabel: 'WATCH ON YOUTUBE',
      secondaryHref: athleteData.channelUrl,
    },
    footerText: 'KEEP MOVING. KEEP GROWING.',
    showCopyright: true,
  },
  about: {
    heading: 'A runner’s mindset. A journey still in motion.',
    intro: athleteData.about.intro,
    quote: athleteData.about.quote,
    portrait: athleteData.portrait,
    details: [],
  },
  journey: {
    heading: 'Keep moving. Keep learning. Keep becoming.',
    intro: '',
    items: athleteData.journey.map((item, index) => ({
      id: `journey-${index + 1}`,
      title: item.title,
      description: item.description,
      date: '',
      image: '',
      published: true,
    })),
  },
  achievements: [],
  training: {
    heading: 'Strong foundations for every kind of progress.',
    intro: 'General running and fitness themes—not a description of Laxman’s personal training plan.',
    items: athleteData.training.map((item, index) => ({
      id: `training-${index + 1}`,
      category: 'Training theme',
      title: item.title,
      description: item.description,
      image: item.image,
      videoUrl: '',
      published: true,
    })),
  },
  videos: [],
  gallery: athleteData.gallery.map((item, index) => ({
    id: `gallery-${index + 1}`,
    image: item.image,
    alt: item.alt,
    caption: '',
    category: index === 0 ? 'Portrait' : 'Illustrative sports imagery',
    published: true,
  })),
  socials: [
    {
      id: 'social-youtube',
      label: 'YouTube',
      url: athleteData.channelUrl,
      enabled: true,
    },
  ],
  sections: [
    { id: 'about', label: 'About', heading: '', intro: '', visible: true, order: 1 },
    { id: 'journey', label: 'Journey', heading: '', intro: '', visible: true, order: 2 },
    { id: 'progress', label: 'Progress', heading: '', intro: '', visible: true, order: 3 },
    { id: 'training', label: 'Training', heading: '', intro: '', visible: true, order: 4 },
    { id: 'achievements', label: 'Achievements', heading: '', intro: '', visible: true, order: 5 },
    { id: 'videos', label: 'Videos', heading: '', intro: '', visible: true, order: 6 },
    { id: 'gallery', label: 'Gallery', heading: '', intro: '', visible: true, order: 7 },
    { id: 'contact', label: 'Contact', heading: '', intro: '', visible: true, order: 8 },
  ],
  progress: {
    heading: 'Not a finish line. A reason to go further.',
    intro:
      'No unverified race results or records here—just a commitment to discipline, steady effort, and personal growth. The next stride is always yours to take.',
  },
  seo: {
    title: 'EK LAKSHYA | Laxman Chauhan',
    description:
      'EK LAKSHYA — an athlete portfolio website for Laxman Chauhan featuring running storytelling, journey milestones, gallery, and YouTube updates.',
    openGraphTitle: 'EK LAKSHYA | Laxman Chauhan',
    openGraphDescription:
      'Premium athlete portfolio built around discipline, movement, and distance.',
    image: '/laxman-portrait.jpg',
    favicon: '/favicon.svg',
    siteUrl: 'https://lakshman-ten.vercel.app/',
  },
  appearance: {
    accent: '#d9ff5f',
    background: '#070707',
    surface: '#10110e',
    text: '#f5f5f5',
    radius: '1.25rem',
    font: 'Inter',
    spacing: 'comfortable',
  },
  updatedAt: null,
}

export function cloneDefaultContent() {
  return structuredClone(defaultContent)
}

export function createPublishedContent(content) {
  const published = structuredClone(content)
  const visibleSectionIds = new Set(published.sections.filter((section) => section.visible).map((section) => section.id))

  published.sections = published.sections.filter((section) => section.visible)
  published.about.details = published.about.details.filter((detail) => detail.visible && detail.value)
  published.journey.items = visibleSectionIds.has('journey')
    ? published.journey.items.filter((item) => item.published !== false)
    : []
  published.training.items = visibleSectionIds.has('training')
    ? published.training.items.filter((item) => item.published !== false)
    : []
  published.achievements = visibleSectionIds.has('achievements')
    ? published.achievements.filter((item) => item.published !== false)
    : []
  published.videos = visibleSectionIds.has('videos')
    ? published.videos.filter((item) => item.published !== false)
    : []
  published.gallery = visibleSectionIds.has('gallery')
    ? published.gallery.filter((item) => item.published !== false)
    : []
  published.socials = visibleSectionIds.has('contact')
    ? published.socials.filter((item) => item.enabled && item.url)
    : []
  published.sections = published.sections.filter((section) => {
    if (section.id === 'achievements') return published.achievements.length > 0
    if (section.id === 'journey') return published.journey.items.length > 0
    if (section.id === 'training') return published.training.items.length > 0
    if (section.id === 'gallery') return published.gallery.length > 0
    if (section.id === 'contact') return published.socials.length > 0
    return true
  })

  if (!visibleSectionIds.has('about')) {
    published.about = { heading: '', intro: '', quote: '', portrait: '', details: [] }
  }
  if (!visibleSectionIds.has('journey')) published.journey = { heading: '', intro: '', items: [] }
  if (!visibleSectionIds.has('progress')) published.progress = { heading: '', intro: '' }
  if (!visibleSectionIds.has('training')) published.training = { heading: '', intro: '', items: [] }
  if (!visibleSectionIds.has('achievements')) published.achievements = []
  if (!visibleSectionIds.has('videos')) published.videos = []
  if (!visibleSectionIds.has('gallery')) published.gallery = []
  if (!visibleSectionIds.has('contact')) published.socials = []

  return published
}

export function normalizeContent(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return cloneDefaultContent()
  }

  const base = cloneDefaultContent()
  const merge = (fallback, incoming) => {
    if (Array.isArray(fallback)) return Array.isArray(incoming) ? incoming : fallback
    if (fallback && typeof fallback === 'object') {
      const result = { ...fallback }
      if (incoming && typeof incoming === 'object' && !Array.isArray(incoming)) {
        for (const key of Object.keys(fallback)) {
          result[key] = merge(fallback[key], incoming[key])
        }
        for (const [key, item] of Object.entries(incoming)) {
          if (!(key in result)) result[key] = item
        }
      }
      return result
    }
    return incoming === undefined ? fallback : incoming
  }

  return merge(base, value)
}
