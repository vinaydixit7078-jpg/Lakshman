import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, ArrowUpRight, Menu, Play, PlayCircle, X } from 'lucide-react'
import { athleteData } from './data/athleteData'
import './App.css'

const navItems = [
  { label: 'Home', href: '#home' },
  { label: 'About', href: '#about' },
  { label: 'Journey', href: '#journey' },
  { label: 'Achievements', href: '#achievements' },
  { label: 'Gallery', href: '#gallery' },
  { label: 'Videos', href: '#videos' },
  { label: 'Contact', href: '#contact' },
]

const reveal = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
}

const currentYear = new Date().getFullYear()

function App() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="page-shell">
      <header className="topbar">
        <nav className="nav container" aria-label="Main navigation">
          <a href="#home" className="brand" aria-label="EK LAKSHYA home">
            <span className="brand-mark">EK</span>
            <span>LAKSHYA</span>
          </a>

          <div className={`nav-links ${menuOpen ? 'open' : ''}`}>
            {navItems.map((item) => (
              <a key={item.label} href={item.href} onClick={() => setMenuOpen(false)}>
                {item.label}
              </a>
            ))}
          </div>

          <a
            href={athleteData.channelUrl}
            target="_blank"
            rel="noreferrer"
            className="follow-button"
          >
            FOLLOW THE JOURNEY
            <ArrowUpRight size={18} />
          </a>

          <button
            type="button"
            className="menu-toggle"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </nav>
      </header>

      <main>
        <section id="home" className="hero-section">
          <div className="hero-image" aria-hidden="true" />
          <div className="hero-overlay" aria-hidden="true" />

          <div className="container hero-grid">
            <motion.div
              variants={reveal}
              initial="hidden"
              animate="visible"
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="hero-copy"
            >
              <p className="eyebrow">{athleteData.hero.label}</p>
              <h1>{athleteData.hero.headline}</h1>
              <p className="supporting-copy">{athleteData.hero.subheadline}</p>

              <div className="cta-row">
                <a href="#journey" className="primary-button">
                  EXPLORE MY JOURNEY
                  <ArrowRight size={18} />
                </a>
                <a
                  href={athleteData.channelUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="secondary-button"
                >
                  WATCH ON YOUTUBE
                  <Play size={16} />
                </a>
              </div>

              <div className="pill-row" aria-label="Core values">
                <span>CONSISTENCY</span>
                <span>STRENGTH</span>
                <span>FOCUS</span>
              </div>
            </motion.div>

            <motion.div
              variants={reveal}
              initial="hidden"
              animate="visible"
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
              className="hero-spotlight"
            >
              <div className="spotlight-card">
                <div className="card-kicker">{athleteData.brand}</div>
                <p>{athleteData.hero.accent}</p>
                <div className="card-meta">
                  <span>
                    <PlayCircle size={16} />
                    Available on YouTube
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section id="about" className="section">
          <div className="container">
            <div className="section-heading">
              <p className="section-kicker">About</p>
              <h2>Built on discipline, motion, and steady growth.</h2>
            </div>

            <div className="about-grid">
              <div className="about-copy">
                <p>{athleteData.about.intro}</p>
                <blockquote>{athleteData.about.quote}</blockquote>
              </div>

              <div className="signature-panel">
                <span className="eyebrow dark">EK LAKSHYA</span>
                <p>
                  Running is more than pace. It is rhythm, resilience, and a commitment to
                  become stronger with every session.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="journey" className="section neutral-section">
          <div className="container">
            <div className="section-heading split-heading">
              <p className="section-kicker">Journey</p>
              <h2>Progress shaped through consistent effort.</h2>
            </div>

            <div className="timeline">
              {athleteData.journey.map((item) => (
                <div key={item.title} className="timeline-item">
                  <div className="timeline-year">{item.year}</div>
                  <div className="timeline-line" aria-hidden="true" />
                  <div className="timeline-card">
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="achievements" className="section">
          <div className="container">
            <div className="section-heading">
              <p className="section-kicker">Achievements</p>
              <h2>Results worth tracking.</h2>
            </div>

            <div className="stats-grid">
              {athleteData.achievements.map((item) => (
                <div
                  key={item.label}
                  className={`stat-card ${item.placeholder ? 'placeholder' : ''}`}
                >
                  <span className="stat-value">{item.value}</span>
                  <span className="stat-label">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section neutral-section">
          <div className="container">
            <div className="section-heading">
              <p className="section-kicker">Training & lifestyle</p>
              <h2>Movement, recovery, and daily discipline.</h2>
            </div>

            <div className="training-grid">
              {athleteData.training.map((item) => (
                <article key={item.title} className="training-card">
                  <img src={item.image} alt={item.title} />
                  <div className="training-copy">
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="videos" className="section">
          <div className="container">
            <div className="section-heading split-heading">
              <p className="section-kicker">Videos</p>
              <h2>Public updates, stories, and training moments.</h2>
              <a
                href={athleteData.channelUrl}
                target="_blank"
                rel="noreferrer"
                className="text-link"
              >
                WATCH ON YOUTUBE
              </a>
            </div>

            <div className="video-grid">
              {athleteData.videos.map((video) => (
                <a
                  key={video.videoId}
                  href={video.url}
                  target="_blank"
                  rel="noreferrer"
                  className="video-card"
                >
                  <img src={video.thumbnail} alt={video.title} />
                  <div className="video-overlay">
                    <span className="play-badge">
                      <Play size={16} />
                    </span>
                  </div>
                  <div className="video-meta">
                    <h3>{video.title}</h3>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section id="gallery" className="section neutral-section">
          <div className="container">
            <div className="section-heading">
              <p className="section-kicker">Gallery</p>
              <h2>Moments in motion.</h2>
            </div>

            <div className="gallery-grid">
              {athleteData.gallery.map((image, index) => (
                <figure key={`${image.alt}-${index}`} className={`gallery-item item-${index + 1}`}>
                  <img src={image.image} alt={image.alt} />
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section className="philosophy-banner" aria-label="Philosophy banner">
          <div className="container philosophy-wrapper">
            <p>THE FINISH LINE IS NOT THE LIMIT. IT IS THE NEXT BEGINNING.</p>
          </div>
        </section>

        <section id="contact" className="section">
          <div className="container contact-layout">
            <div className="contact-copy">
              <p className="section-kicker">Contact</p>
              <h2>Stay connected and keep moving forward.</h2>
              <p>
                Update the contact details in the athlete data file as verified links and
                enquiries become available.
              </p>
            </div>

            <div className="contact-panel">
              <div className="contact-item">
                <span>{athleteData.contact.emailLabel}</span>
                <strong>{athleteData.contact.emailValue}</strong>
              </div>
              <div className="contact-item">
                <span>{athleteData.contact.instagramLabel}</span>
                <strong>{athleteData.contact.instagramValue}</strong>
              </div>
              <div className="contact-item">
                <span>{athleteData.contact.sponsorshipLabel}</span>
                <strong>{athleteData.contact.sponsorshipValue}</strong>
              </div>
              <div className="contact-actions">
                <a href={athleteData.channelUrl} target="_blank" rel="noreferrer" className="primary-button small">
                  WATCH ON YOUTUBE
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container footer-wrapper">
          <div>
            <a href="#home" className="brand footer-brand">
              <span className="brand-mark">EK</span>
              <span>LAKSHYA</span>
            </a>
            <p>KEEP MOVING. KEEP GROWING.</p>
          </div>

          <div className="footer-links">
            {navItems.map((item) => (
              <a key={item.label} href={item.href}>
                {item.label}
              </a>
            ))}
          </div>

          <div className="footer-copy">© {currentYear} EK LAKSHYA</div>
        </div>
      </footer>
    </div>
  )
}

export default App
