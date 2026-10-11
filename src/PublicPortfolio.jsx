import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  ArrowRight,
  ArrowUpRight,
  Menu,
  Play,
  PlayCircle,
  X,
} from 'lucide-react'
import { defaultContent } from './data/siteContent'
import { fetchPublishedContent } from './lib/contentApi'
import './App.css'

const reveal = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

const currentYear = new Date().getFullYear()
const safeFonts = new Set(['Inter', 'Arial', 'Georgia', 'system-ui'])
const safeRadii = new Set(['0.5rem', '1rem', '1.25rem', '1.75rem'])
const safePositions = new Set(['center', 'center top', 'center bottom', 'left center', 'right center'])

function safeColor(value, fallback) {
  return typeof value === 'string' && /^#[\da-f]{3}(?:[\da-f]{3})?$/i.test(value) ? value : fallback
}

function safeHref(value, fallback = '#') {
  if (typeof value !== 'string') return fallback
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return `mailto:${value.trim()}`
  if (value.startsWith('#') || (value.startsWith('/') && !value.startsWith('//'))) return value
  try {
    const url = new URL(value)
    return ['http:', 'https:', 'mailto:'].includes(url.protocol) ? url.toString() : fallback
  } catch {
    return fallback
  }
}

function safeCssImage(value) {
  const safe = safeHref(value, '')
  if (!safe) return 'none'
  try {
    const url = new URL(safe, window.location.origin)
    return `url("${url.href}")`
  } catch {
    return 'none'
  }
}

function videoId(value) {
  try {
    const url = new URL(safeHref(value, 'https://invalid.local'))
    if (url.hostname.endsWith('youtu.be')) return url.pathname.split('/').filter(Boolean)[0]
    if (url.hostname.endsWith('youtube.com')) {
      return url.searchParams.get('v') || url.pathname.split('/').filter(Boolean)[1]
    }
  } catch {
    return ''
  }
  return ''
}

function SectionHeading({ number, kicker, title, intro }) {
  return (
    <div className="section-heading">
      <p className="section-kicker">{number} / {kicker}</p>
      <h2>{title}</h2>
      {intro && <p className="section-intro">{intro}</p>}
    </div>
  )
}

function PublicPortfolio() {
  const [content, setContent] = useState(defaultContent)
  const [loadError, setLoadError] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const reduceMotion = useReducedMotion()
  const motionTransition = { duration: reduceMotion ? 0 : 0.65, ease: 'easeOut' }
  const { site, about, journey, training, gallery, sections, appearance } = content
  const publishedJourney = journey.items.filter((item) => item.published !== false)
  const publishedTraining = training.items.filter((item) => item.published !== false)
  const publishedGallery = gallery.filter((item) => item.published !== false)
  const publishedVideos = content.videos.filter((item) => item.published !== false)
    .sort((first, second) => Number(Boolean(second.featured)) - Number(Boolean(first.featured)))
  const featuredVideo = publishedVideos.find((item) => item.featured)
  const publishedAchievements = content.achievements.filter((item) => item.published !== false)
  const visibleSections = [...sections]
    .filter((section) => section.visible)
    .sort((a, b) => a.order - b.order)
    .filter((section) => section.id !== 'achievements' || publishedAchievements.length > 0)
    .filter((section) => section.id !== 'journey' || publishedJourney.length > 0)
    .filter((section) => section.id !== 'training' || publishedTraining.length > 0)
    .filter((section) => section.id !== 'gallery' || publishedGallery.length > 0)
    .filter((section) => section.id !== 'contact' || content.socials.some((item) => item.enabled && item.url))
  const sectionMeta = (id, title, intro = '') => {
    const section = sections.find((item) => item.id === id)
    return { title: section?.heading || title, intro: section?.intro || intro }
  }

  useEffect(() => {
    let cancelled = false
    fetchPublishedContent().then(({ content: saved, error }) => {
      if (cancelled) return
      if (saved) setContent(saved)
      if (error) setLoadError('Could not load published content; the available portfolio content is still displayed.')
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const refreshPublished = async () => {
      const { content: saved, error } = await fetchPublishedContent()
      if (error) {
        setLoadError('Could not refresh published content; the previously loaded portfolio remains displayed.')
      } else {
        setContent(saved)
        setLoadError('')
      }
    }
    const refreshOnFocus = () => {
      if (document.visibilityState === 'visible') refreshPublished()
    }
    const timer = window.setInterval(refreshPublished, 30000)
    window.addEventListener('focus', refreshOnFocus)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', refreshOnFocus)
    }
  }, [])

  useEffect(() => {
    document.title = content.seo.title || `${site.brand} | ${site.fullName}`
    const description = document.querySelector('meta[name="description"]')
    if (description) description.content = content.seo.description
    const ogTitle = document.querySelector('meta[property="og:title"]')
    if (ogTitle) ogTitle.content = content.seo.openGraphTitle
    const ogDescription = document.querySelector('meta[property="og:description"]')
    if (ogDescription) ogDescription.content = content.seo.openGraphDescription
    const ogImage = document.querySelector('meta[property="og:image"]')
    if (ogImage) ogImage.content = safeHref(content.seo.image, '/laxman-portrait.jpg')
    const ogUrl = document.querySelector('meta[property="og:url"]')
    if (ogUrl) ogUrl.content = safeHref(content.seo.siteUrl)
    const canonical = document.querySelector('link[rel="canonical"]')
    if (canonical) canonical.href = safeHref(content.seo.siteUrl)
    const favicon = document.querySelector('link[rel="icon"]')
    if (favicon) favicon.href = safeHref(content.seo.favicon, '/favicon.svg')
  }, [content, site.brand, site.fullName])

  const socialIcon = (label) => {
    if (/youtube/i.test(label)) return <PlayCircle size={18} aria-hidden="true" />
    return <ArrowUpRight size={18} aria-hidden="true" />
  }

  const sectionContent = {
    about: (
      <section id="about" className="section" key="about">
        <div className="container">
          <SectionHeading number="01" kicker="ABOUT THE ATHLETE" {...sectionMeta('about', about.heading)} />
          <div className="about-grid">
            <div className="about-copy">
              <p>{about.intro}</p>
              {about.quote && <blockquote>{about.quote}</blockquote>}
              {about.details.filter((detail) => detail.visible && detail.value).map((detail) => (
                <p className="personal-detail" key={detail.id}>
                  <strong>{detail.label}</strong> {detail.value}
                </p>
              ))}
            </div>
            <aside className="signature-panel">
              <span className="eyebrow dark">{site.brand}</span>
              <img src={safeHref(about.portrait, '/laxman-portrait.jpg')} alt={`Portrait of ${site.fullName}`} loading="lazy" />
              <p>Running is a practice in patience: focus on the next stride, stay consistent, and keep moving forward.</p>
            </aside>
          </div>
        </div>
      </section>
    ),
    journey: (
      <section id="journey" className="section neutral-section" key="journey">
        <div className="container">
          <SectionHeading number="02" kicker="THE JOURNEY" {...sectionMeta('journey', journey.heading, journey.intro)} />
          <div className="journey-grid">
            {publishedJourney.map((item, index) => (
              <article key={item.id} className="journey-card">
                <span className="journey-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                {item.image && <img src={safeHref(item.image)} alt="" loading="lazy" />}
                {item.date && <p className="journey-date">{item.date}</p>}
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    ),
    progress: (
      <section id="progress" className="progress-section" key="progress">
        <div className="container progress-layout">
          <div className="progress-mark" aria-hidden="true">EK</div>
          <div className="progress-copy">
            <p className="section-kicker">03 / The pursuit of progress</p>
            <h2>{sectionMeta('progress', content.progress.heading).title}</h2>
            <p>{sectionMeta('progress', content.progress.heading, content.progress.intro).intro}</p>
          </div>
        </div>
      </section>
    ),
    achievements: (
      <section id="achievements" className="section" key="achievements">
        <div className="container">
          <SectionHeading number="04" kicker="VERIFIED RECORDS" {...sectionMeta('achievements', 'Verified achievements', 'Results and records are shown only when they are confirmed and shared.')} />
          <div className="achievement-grid">
            {publishedAchievements.map((item) => (
              <article className="journey-card" key={item.id}>
                {item.image && <img src={safeHref(item.image)} alt="" loading="lazy" />}
                {item.result && <p className="achievement-result">{item.result}</p>}
                <h3>{item.title}</h3>
                <p>{[item.event, item.competition, item.date, item.location].filter(Boolean).join(' · ')}</p>
                {item.description && <p>{item.description}</p>}
                {item.evidenceUrl && <a href={safeHref(item.evidenceUrl)} target="_blank" rel="noreferrer">View evidence</a>}
              </article>
            ))}
          </div>
        </div>
      </section>
    ),
    training: (
      <section id="training" className="section" key="training">
        <div className="container">
          <SectionHeading number="05" kicker="TRAINING MINDSET" {...sectionMeta('training', training.heading, training.intro)} />
          <div className="training-grid">
            {publishedTraining.map((item) => (
              <article key={item.id} className="training-card">
                {item.image && <img src={safeHref(item.image)} alt="" loading="lazy" />}
                <div className="training-copy">
                  <p className="section-kicker">{item.category}</p>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                  {item.videoUrl && <a href={safeHref(item.videoUrl)} target="_blank" rel="noreferrer">Watch related video</a>}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    ),
    videos: (
      <section id="videos" className="section neutral-section" key="videos">
        <div className="container">
          <SectionHeading number="06" kicker="YOUTUBE" {...sectionMeta('videos', 'EK LAKSHYA, straight from the source.', site.channelDescription)} />
          {publishedVideos.length > 0 && (
            <div className="video-grid">
              {publishedVideos.map((item) => {
                const id = videoId(item.url)
                const thumbnail = item.thumbnail || (id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : '')
                return (
                  <article className="video-card" key={item.id}>
                    <a href={safeHref(item.url)} target="_blank" rel="noreferrer" aria-label={`Watch ${item.title} on YouTube`}>
                      {thumbnail && <img src={safeHref(thumbnail)} alt="" loading="lazy" />}
                      <PlayCircle size={42} aria-hidden="true" />
                    </a>
                    <div className="training-copy">
                      <h3>{item.title}</h3>
                      {item.description && <p>{item.description}</p>}
                      <a href={safeHref(item.url)} target="_blank" rel="noreferrer">Open on YouTube</a>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
          <div className="channel-feature">
            <div className="channel-icon" aria-hidden="true"><PlayCircle size={40} /></div>
            <div className="channel-copy">
              <p className="channel-label">THE OFFICIAL CHANNEL</p>
              <h3>EK LAKSHYA SPORTS</h3>
              <p>{site.channelDescription}</p>
              <a href={safeHref(site.channelUrl)} target="_blank" rel="noreferrer" className="primary-button">
                WATCH ON YOUTUBE <ArrowUpRight size={18} aria-hidden="true" />
              </a>
            </div>
            <div className="channel-wordmark" aria-hidden="true">EK<br />LAKSHYA</div>
          </div>
        </div>
      </section>
    ),
    gallery: (
      <section id="gallery" className="section" key="gallery">
        <div className="container">
          <SectionHeading number="07" kicker="GALLERY" {...sectionMeta('gallery', 'A face to the journey. A focus on what’s next.', 'Laxman’s portrait is identified. Other campaign images are illustrative sports photography, not personal photos.')} />
          <div className="gallery-grid">
            {publishedGallery.map((image, index) => (
              <figure key={image.id} className={`gallery-item item-${index + 1}`}>
                <img src={safeHref(image.image)} alt={image.alt} loading="lazy" decoding="async" />
                {image.caption && <figcaption>{image.caption}</figcaption>}
              </figure>
            ))}
          </div>
        </div>
      </section>
    ),
    contact: (
      <section id="contact" className="section" key="contact">
        <div className="container contact-layout">
          <div className="contact-copy">
            <p className="section-kicker">08 / Follow along</p>
            <h2>{sectionMeta('contact', 'One channel. Every new chapter.').title}</h2>
            <p>{sectionMeta('contact', '', 'Follow Laxman’s public sports content and verified profiles.').intro}</p>
          </div>
          <div className="contact-panel">
            {content.socials.filter((item) => item.enabled && item.url).map((item) => (
              <a className="social-link" key={item.id} href={safeHref(item.url)} target="_blank" rel="noreferrer">
                {socialIcon(item.label)}<span>{item.label}</span><ArrowUpRight size={16} aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>
      </section>
    ),
  }

  return (
    <div
      className="page-shell"
      style={{
        '--accent': safeColor(appearance.accent, '#d9ff5f'),
        '--page-background': safeColor(appearance.background, '#070707'),
        '--surface': safeColor(appearance.surface, '#10110e'),
        '--page-text': safeColor(appearance.text, '#f5f5f5'),
        '--card-radius': safeRadii.has(appearance.radius) ? appearance.radius : '1.25rem',
        '--page-font': safeFonts.has(appearance.font) ? appearance.font : 'Inter',
        '--section-spacing': appearance.spacing === 'compact' ? '4rem' : appearance.spacing === 'spacious' ? '8rem' : '6rem',
        '--hero-background': safeCssImage(site.hero.backgroundImage),
        '--hero-position': safePositions.has(site.hero.backgroundPosition) ? site.hero.backgroundPosition : 'center',
      }}
    >
      {loadError && <p className="content-load-warning" role="status">{loadError}</p>}
      <header className="topbar">
        <nav className="nav container" aria-label="Main navigation" onKeyDown={(event) => event.key === 'Escape' && setMenuOpen(false)}>
          <a href="#home" className="brand" aria-label={`${site.brand} home`}>
            <span className="brand-mark" aria-hidden="true">EK</span><span>{site.brand}</span>
          </a>
          <div id="nav-menu" className={`nav-links ${menuOpen ? 'open' : ''}`}>
            {visibleSections.map((section) => (
              <a key={section.id} href={`#${section.id}`} onClick={() => setMenuOpen(false)}>{section.label}</a>
            ))}
          </div>
          <a href={safeHref(site.channelUrl)} target="_blank" rel="noreferrer" className="follow-button">
            FOLLOW THE JOURNEY <ArrowUpRight size={18} aria-hidden="true" />
          </a>
          <button type="button" className="menu-toggle" onClick={() => setMenuOpen((open) => !open)} aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-controls="nav-menu" aria-expanded={menuOpen}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </nav>
      </header>
      <main>
        <section id="home" className="hero-section">
          <div className="hero-image" aria-hidden="true" />
          <div className="hero-overlay" aria-hidden="true" />
          <div className="container hero-grid">
            <motion.div variants={reveal} initial={reduceMotion ? false : 'hidden'} animate="visible" transition={motionTransition} className="hero-copy">
              <p className="eyebrow">{site.brand} / ATHLETE PORTFOLIO</p>
              <h1>{site.fullName}</h1>
              <p className="hero-role">{site.role}</p>
              <p className="hero-headline">{site.hero.headline}</p>
              <p className="supporting-copy">{site.hero.subheadline}</p>
              <div className="cta-row">
                <a href={safeHref(site.hero.primaryHref)} className="primary-button">{site.hero.primaryLabel}<ArrowRight size={18} aria-hidden="true" /></a>
                <a href={safeHref(site.hero.secondaryHref)} target={site.hero.secondaryHref.startsWith('#') ? undefined : '_blank'} rel="noreferrer" className="secondary-button">{site.hero.secondaryLabel}<Play size={16} aria-hidden="true" /></a>
              </div>
              <div className="pill-row" aria-label="Athlete values"><span>DISCIPLINE</span><span>CONSISTENCY</span><span>GROWTH</span></div>
            </motion.div>
            <motion.figure variants={reveal} initial={reduceMotion ? false : 'hidden'} animate="visible" transition={{ ...motionTransition, delay: reduceMotion ? 0 : 0.12 }} className="hero-portrait">
              <img src={safeHref(site.hero.portrait, '/laxman-portrait.jpg')} alt={`${site.fullName} outdoors in athletic clothing`} fetchPriority="high" />
              <figcaption><span>{site.brand}</span><strong>{site.hero.accent}</strong></figcaption>
            </motion.figure>
          </div>
        </section>
        {featuredVideo && (
          <a className="featured-video-strip" href={safeHref(featuredVideo.url)} target="_blank" rel="noreferrer">
            <img src={safeHref(featuredVideo.thumbnail || `https://img.youtube.com/vi/${videoId(featuredVideo.url)}/hqdefault.jpg`)} alt="" />
            <span><strong>FEATURED FROM EK LAKSHYA</strong>{featuredVideo.title}</span>
            <ArrowUpRight size={20} aria-hidden="true" />
          </a>
        )}
        {visibleSections.map((section) => sectionContent[section.id])}
      </main>
      <footer className="site-footer">
        <div className="container footer-wrapper">
          <div>
            <a href="#home" className="brand footer-brand"><span className="brand-mark" aria-hidden="true">EK</span><span>{site.brand}</span></a>
            <p>{site.footerText}</p>
          </div>
          <div className="footer-links">
            {visibleSections.map((section) => <a key={section.id} href={`#${section.id}`}>{section.label}</a>)}
            {content.socials.filter((item) => item.enabled && item.url).map((item) => <a key={item.id} href={safeHref(item.url)} target="_blank" rel="noreferrer">{item.label}</a>)}
          </div>
          {site.showCopyright && <div className="footer-copy">© {currentYear} {site.brand}</div>}
        </div>
      </footer>
    </div>
  )
}

export default PublicPortfolio
