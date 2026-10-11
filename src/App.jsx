import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, ArrowUpRight, Menu, Play, PlayCircle, X } from 'lucide-react'
import { athleteData } from './data/athleteData'
import './App.css'

const reveal = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

const currentYear = new Date().getFullYear()

function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const reduceMotion = useReducedMotion()
  const motionTransition = {
    duration: reduceMotion ? 0 : 0.65,
    ease: 'easeOut',
  }

  return (
    <div className="page-shell">
      <header className="topbar">
        <nav
          className="nav container"
          aria-label="Main navigation"
          onKeyDown={(event) => {
            if (event.key === 'Escape') setMenuOpen(false)
          }}
        >
          <a href="#home" className="brand" aria-label="EK LAKSHYA home">
            <span className="brand-mark" aria-hidden="true">EK</span>
            <span>{athleteData.brand}</span>
          </a>

          <div id="nav-menu" className={`nav-links ${menuOpen ? 'open' : ''}`}>
            {athleteData.navigation.map((item) => (
              <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)}>
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
            <ArrowUpRight size={18} aria-hidden="true" />
          </a>

          <button
            type="button"
            className="menu-toggle"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-controls="nav-menu"
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
              initial={reduceMotion ? false : 'hidden'}
              animate="visible"
              transition={motionTransition}
              className="hero-copy"
            >
              <p className="eyebrow">{athleteData.brand} / ATHLETE PORTFOLIO</p>
              <h1>{athleteData.fullName}</h1>
              <p className="hero-role">{athleteData.role}</p>
              <p className="hero-headline">{athleteData.hero.headline}</p>
              <p className="supporting-copy">{athleteData.hero.subheadline}</p>

              <div className="cta-row">
                <a href="#journey" className="primary-button">
                  EXPLORE MY JOURNEY
                  <ArrowRight size={18} aria-hidden="true" />
                </a>
                <a
                  href={athleteData.channelUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="secondary-button"
                >
                  WATCH ON YOUTUBE
                  <Play size={16} aria-hidden="true" />
                </a>
              </div>

              <div className="pill-row" aria-label="Athlete values">
                <span>DISCIPLINE</span>
                <span>CONSISTENCY</span>
                <span>GROWTH</span>
              </div>
            </motion.div>

            <motion.figure
              variants={reveal}
              initial={reduceMotion ? false : 'hidden'}
              animate="visible"
              transition={{ ...motionTransition, delay: reduceMotion ? 0 : 0.12 }}
              className="hero-portrait"
            >
              <img
                src={athleteData.portrait}
                alt="Laxman Chauhan outdoors in athletic clothing"
                fetchPriority="high"
              />
              <figcaption>
                <span>{athleteData.brand}</span>
                <strong>{athleteData.hero.accent}</strong>
              </figcaption>
            </motion.figure>
          </div>
        </section>

        <section id="about" className="section">
          <div className="container">
            <div className="section-heading">
              <p className="section-kicker">01 / About</p>
              <h2>A runner’s mindset. A journey still in motion.</h2>
            </div>

            <div className="about-grid">
              <div className="about-copy">
                <p>{athleteData.about.intro}</p>
                <blockquote>{athleteData.about.quote}</blockquote>
              </div>

              <aside className="signature-panel">
                <span className="eyebrow dark">{athleteData.brand}</span>
                <p>
                  Running is a practice in patience: focus on the next stride, stay
                  consistent, and keep moving forward.
                </p>
              </aside>
            </div>
          </div>
        </section>

        <section id="journey" className="section neutral-section">
          <div className="container">
            <div className="section-heading">
              <p className="section-kicker">02 / The journey</p>
              <h2>Keep moving. Keep learning. Keep becoming.</h2>
            </div>

            <div className="journey-grid">
              {athleteData.journey.map((item, index) => (
                <article key={item.title} className="journey-card">
                  <span className="journey-index" aria-hidden="true">
                    0{index + 1}
                  </span>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="progress" className="progress-section">
          <div className="container progress-layout">
            <div className="progress-mark" aria-hidden="true">
              EK
            </div>
            <div className="progress-copy">
              <p className="section-kicker">03 / The pursuit of progress</p>
              <h2>Not a finish line. A reason to go further.</h2>
              <p>
                No unverified race results or records here—just a commitment to
                discipline, steady effort, and personal growth. The next stride is
                always yours to take.
              </p>
            </div>
          </div>
        </section>

        <section id="training" className="section">
          <div className="container">
            <div className="section-heading">
              <p className="section-kicker">04 / Training mindset</p>
              <h2>Strong foundations for every kind of progress.</h2>
              <p className="section-intro">
                General running and fitness themes—not a description of Laxman’s
                personal training plan.
              </p>
            </div>

            <div className="training-grid">
              {athleteData.training.map((item) => (
                <article key={item.title} className="training-card">
                  <img src={item.image} alt="" loading="lazy" />
                  <div className="training-copy">
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="videos" className="section neutral-section">
          <div className="container">
            <div className="section-heading">
              <p className="section-kicker">05 / YouTube</p>
              <h2>EK LAKSHYA, straight from the source.</h2>
            </div>

            <div className="channel-feature">
              <div className="channel-icon" aria-hidden="true">
                <PlayCircle size={40} />
              </div>
              <div className="channel-copy">
                <p className="channel-label">THE OFFICIAL CHANNEL</p>
                <h3>EK LAKSHYA SPORTS</h3>
                <p>{athleteData.channelDescription}</p>
                <a
                  href={athleteData.channelUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="primary-button"
                >
                  WATCH ON YOUTUBE
                  <ArrowUpRight size={18} aria-hidden="true" />
                </a>
              </div>
              <div className="channel-wordmark" aria-hidden="true">
                EK<br />LAKSHYA
              </div>
            </div>
          </div>
        </section>

        <section id="gallery" className="section">
          <div className="container">
            <div className="section-heading">
              <p className="section-kicker">06 / Gallery</p>
              <h2>A face to the journey. A focus on what’s next.</h2>
              <p className="section-intro">
                Laxman’s portrait is shown first. The remaining campaign images are
                illustrative sports photography, not personal photos.
              </p>
            </div>

            <div className="gallery-grid">
              {athleteData.gallery.map((image, index) => (
                <figure
                  key={image.image}
                  className={`gallery-item item-${index + 1}`}
                >
                  <img
                    src={image.image}
                    alt={image.alt}
                    loading="lazy"
                    decoding="async"
                  />
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section className="philosophy-banner" aria-label="EK LAKSHYA philosophy">
          <div className="container philosophy-wrapper">
            <p>THE FINISH LINE IS NOT THE LIMIT. IT IS THE NEXT BEGINNING.</p>
          </div>
        </section>

        <section id="contact" className="section">
          <div className="container contact-layout">
            <div className="contact-copy">
              <p className="section-kicker">07 / Follow along</p>
              <h2>One channel. Every new chapter.</h2>
              <p>
                Follow Laxman’s public sports content on the official EK LAKSHYA
                YouTube channel.
              </p>
            </div>

            <div className="contact-panel">
              <div className="contact-item">
                <span>YOUTUBE CHANNEL</span>
                <strong>{athleteData.brand}</strong>
              </div>
              <a
                href={athleteData.channelUrl}
                target="_blank"
                rel="noreferrer"
                className="primary-button small"
              >
                VISIT THE CHANNEL
                <ArrowUpRight size={18} aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container footer-wrapper">
          <div>
            <a href="#home" className="brand footer-brand">
              <span className="brand-mark" aria-hidden="true">EK</span>
              <span>{athleteData.brand}</span>
            </a>
            <p>KEEP MOVING. KEEP GROWING.</p>
          </div>

          <div className="footer-links">
            {athleteData.navigation.map((item) => (
              <a key={item.href} href={item.href}>
                {item.label}
              </a>
            ))}
          </div>

          <div className="footer-copy">
            © {currentYear} {athleteData.brand}
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
