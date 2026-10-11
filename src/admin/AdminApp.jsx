import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import {
  Activity,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  ChevronRight,
  Eye,
  ImagePlus,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Save,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react'
import {
  deleteMedia,
  fetchAdminContent,
  listMedia,
  publishContent,
  saveDraft,
  uploadMedia,
} from '../lib/contentApi'
import { cloneDefaultContent, createPublishedContent } from '../data/siteContent'
import { validateContent, validateExternalUrl, validateImageFile, validateYouTubeUrl } from '../lib/contentValidation'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import './admin.css'

const sections = [
  ['overview', 'Overview', LayoutDashboard],
  ['homepage', 'Homepage', Activity],
  ['about', 'About Me', Activity],
  ['journey', 'Running Journey', Activity],
  ['achievements', 'Achievements', Check],
  ['training', 'Training', Activity],
  ['videos', 'Videos', Activity],
  ['gallery', 'Gallery', ImagePlus],
  ['socials', 'Social Links', Activity],
  ['appearance', 'Appearance', Activity],
  ['sections', 'Section Manager', Activity],
  ['seo', 'SEO & Site Settings', Activity],
  ['security', 'Security', ShieldCheck],
]

const makeId = () => crypto.randomUUID()
const initialSection = () => new URLSearchParams(window.location.search).get('section') || 'overview'
const isPasswordRecoveryRoute = () => (
  window.location.pathname.replace(/\/+$/, '') === '/admin/reset-password'
  || new URLSearchParams(window.location.hash.slice(1)).get('type') === 'recovery'
  || new URLSearchParams(window.location.hash.slice(1)).has('error_code')
  || new URLSearchParams(window.location.search).has('error_code')
)

function safeImagePreview(value) {
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) ? url.toString() : ''
  } catch {
    return ''
  }
}

function getValue(object, path) {
  return path.split('.').reduce((value, key) => value?.[key], object) ?? ''
}

function setValue(object, path, value) {
  const keys = path.split('.')
  const next = structuredClone(object)
  let cursor = next
  for (const key of keys.slice(0, -1)) cursor = cursor[key]
  cursor[keys.at(-1)] = value
  return next
}

function Field({ label, value, onChange, type = 'text', placeholder = '', options = [], help = '' }) {
  const reactId = useId()
  const id = `${reactId}-field-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  return (
    <label className={`admin-field ${type === 'checkbox' ? 'check-field' : ''}`} htmlFor={id}>
      {type === 'checkbox' ? (
        <>
          <input id={id} type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} />
          <span>{label}</span>
        </>
      ) : (
        <>
          <span className="field-label">{label}</span>
          {type === 'textarea' ? (
            <textarea id={id} value={value ?? ''} placeholder={placeholder} rows={4} onChange={(event) => onChange(event.target.value)} />
          ) : type === 'select' ? (
            <select id={id} value={value ?? ''} onChange={(event) => onChange(event.target.value)}>
              {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          ) : (
            <input id={id} type={type} value={value ?? ''} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
          )}
          {help && <small>{help}</small>}
        </>
      )}
    </label>
  )
}

function TextField({ content, path, ...props }) {
  return <Field value={getValue(content, path)} onChange={(value) => props.onChange(path, value)} {...props} />
}

function ArrayEditor({ items, schema, onChange, emptyText, addLabel }) {
  const updateItem = (index, path, value) => {
    onChange(items.map((item, itemIndex) => itemIndex === index ? setValue(item, path, value) : item))
  }
  const moveItem = (index, direction) => {
    const target = index + direction
    if (target < 0 || target >= items.length) return
    const next = [...items]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  return (
    <div className="array-editor">
      {items.length === 0 && <div className="empty-state">{emptyText}</div>}
      {items.map((item, index) => (
        <article className="admin-item-card" key={item.id || index}>
          <div className="admin-item-head">
            <strong>{item.title || item.label || `${addLabel} ${index + 1}`}</strong>
            <div className="admin-item-actions">
              <button type="button" className="icon-button" aria-label="Move up" disabled={index === 0} onClick={() => moveItem(index, -1)}><ArrowUp size={16} /></button>
              <button type="button" className="icon-button" aria-label="Move down" disabled={index === items.length - 1} onClick={() => moveItem(index, 1)}><ArrowDown size={16} /></button>
              <button type="button" className="icon-button danger-icon" aria-label={`Delete ${item.title || addLabel}`} onClick={() => {
                if (window.confirm(`Delete this ${addLabel.toLowerCase()}? This will be reflected after saving or publishing.`)) {
                  onChange(items.filter((_, itemIndex) => itemIndex !== index))
                }
              }}><X size={16} /></button>
            </div>
          </div>
          <div className="admin-form-grid">
            {schema.map((field) => (
              <Field
                key={`${item.id || index}-${field.path}`}
                label={field.label}
                type={field.type}
                value={getValue(item, field.path)}
                placeholder={field.placeholder}
                options={field.options}
                help={field.help}
                onChange={(value) => updateItem(index, field.path, value)}
              />
            ))}
          </div>
        </article>
      ))}
      <button type="button" className="admin-secondary-button" onClick={() => onChange([...items, schema.reduce((result, field) => setValue(result, field.path, field.defaultValue ?? ''), { id: makeId(), published: true, enabled: true })])}>
        <Plus size={16} /> Add {addLabel}
      </button>
    </div>
  )
}

function SectionTitle({ eyebrow, title, children }) {
  return (
    <div className="admin-section-title">
      <div><p className="admin-eyebrow">{eyebrow}</p><h2>{title}</h2></div>
      {children}
    </div>
  )
}

function AdminLogin({ onSignedIn }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [recovering, setRecovering] = useState(() => new URLSearchParams(window.location.search).get('mode') === 'recovery')

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (recovering) {
        const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/admin/login`,
        })
        if (recoveryError) throw recoveryError
        setNotice('If an account exists for that email, a password recovery link has been sent.')
        return
      }
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) throw new Error('Login failed. Check the email and password, then try again.')
      const { data: authorized, error: accessError } = await supabase.rpc('is_site_admin')
      if (accessError || authorized !== true) {
        await supabase.auth.signOut()
        throw new Error('This account is not authorized to manage the site.')
      }
      const dashboardReady = await onSignedIn(data.session)
      if (!dashboardReady) throw new Error('Could not open the admin account. Verify that the database schema and admin allowlist are set up.')
    } catch (cause) {
      setError(cause.message || 'Unable to sign in. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="admin-login-page">
      <a className="admin-back-link" href="/"><ArrowLeft size={16} /> Back to portfolio</a>
      <form className="admin-login-card" onSubmit={submit}>
        <span className="admin-logo">EK</span>
        <p className="admin-eyebrow">PRIVATE SITE MANAGEMENT</p>
        <h1>{recovering ? 'Reset your password' : 'Admin sign in'}</h1>
        <p>{recovering ? 'Enter your admin email to receive a secure password reset link.' : 'Sign in with the authorized account created for this portfolio.'}</p>
        <Field label="Email" type="email" value={email} onChange={setEmail} />
        {!recovering && <Field label="Password" type="password" value={password} onChange={setPassword} />}
        {error && <p className="admin-form-error" role="alert">{error}</p>}
        {notice && <p className="admin-form-notice" role="status">{notice}</p>}
        <button className="admin-primary-button full-button" type="submit" disabled={busy}>
          {busy ? 'Please wait…' : recovering ? 'Send recovery link' : 'Sign in securely'}
        </button>
        <button type="button" className="text-action" onClick={() => {
          setRecovering((value) => !value)
          setError('')
          setNotice('')
        }}>{recovering ? 'Back to sign in' : 'Forgot password? Send a recovery link'}</button>
        <small>There is no public registration or password setup form.</small>
      </form>
    </main>
  )
}

function PasswordRecovery() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [ready, setReady] = useState(false)
  const [hasRecoverySession, setHasRecoverySession] = useState(false)
  const [complete, setComplete] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return
      if (sessionError) setError(`Could not verify the recovery link: ${sessionError.message}`)
      else if (!data.session) setError('This recovery link is invalid or expired. Request a new link and open it within 60 minutes.')
      else setHasRecoverySession(true)
      setReady(true)
    })
    return () => { active = false }
  }, [])

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('Choose a password with at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('The passwords do not match.')
      return
    }

    setBusy(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      const { error: signOutError } = await supabase.auth.signOut()
      if (signOutError) throw signOutError
      setComplete(true)
    } catch (cause) {
      setError(cause.message || 'Could not update the password. Request a new recovery link and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="admin-login-page">
      <a className="admin-back-link" href="/"><ArrowLeft size={16} /> Back to portfolio</a>
      <form className="admin-login-card" onSubmit={submit}>
        <span className="admin-logo">EK</span>
        <p className="admin-eyebrow">SECURE ACCOUNT RECOVERY</p>
        <h1>{complete ? 'Password updated' : 'Set a new password'}</h1>
        <p>{complete ? 'Your password has been changed. Sign in with your new password to manage the site.' : 'Choose a new password for your authorized admin account.'}</p>
        {!ready ? <span className="admin-help">Verifying your secure recovery link…</span> : complete ? (
          <a className="admin-primary-button full-button" href="/admin/login">Continue to sign in</a>
        ) : !hasRecoverySession ? (
          <>
            {error && <p className="admin-form-error" role="alert">{error}</p>}
            <a className="admin-primary-button full-button" href="/admin/login?mode=recovery">Request another recovery link</a>
          </>
        ) : (
          <>
            <Field label="New password" type="password" value={password} onChange={setPassword} />
            <Field label="Confirm new password" type="password" value={confirmPassword} onChange={setConfirmPassword} />
            {error && <p className="admin-form-error" role="alert">{error}</p>}
            <button className="admin-primary-button full-button" type="submit" disabled={busy}>
              {busy ? 'Updating password…' : 'Update password'}
            </button>
          </>
        )}
      </form>
    </main>
  )
}

function AdminApp() {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(() => Boolean(isSupabaseConfigured && window.location.pathname !== '/admin/login' && !isPasswordRecoveryRoute()))
  const [content, setContent] = useState(cloneDefaultContent)
  const [savedContent, setSavedContent] = useState(null)
  const [publishedContent, setPublishedContent] = useState(null)
  const [updatedAt, setUpdatedAt] = useState(null)
  const [publishedAt, setPublishedAt] = useState(null)
  const [section, setSection] = useState(initialSection)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [galleryUrl, setGalleryUrl] = useState('')
  const [galleryCaption, setGalleryCaption] = useState('')
  const [galleryAlt, setGalleryAlt] = useState('')
  const [storedMedia, setStoredMedia] = useState([])
  const [pendingFiles, setPendingFiles] = useState([])
  const [pendingPreviews, setPendingPreviews] = useState([])
  const [videoUrlInput, setVideoUrlInput] = useState('')
  const hasChanges = savedContent ? JSON.stringify(content) !== JSON.stringify(savedContent) : false

  const currentSection = sections.find((item) => item[0] === section) || sections[0]
  const publishedItems = useMemo(() => {
    const published = publishedContent || content
    return {
      videos: published.videos.filter((item) => item.published !== false).length,
      gallery: published.gallery.filter((item) => item.published !== false).length,
      achievements: published.achievements.filter((item) => item.published !== false).length,
      sections: published.sections.filter((item) => item.visible).length,
    }
  }, [content, publishedContent])

  const notify = useCallback((message, kind = 'success') => {
    setToast({ message, kind })
    window.setTimeout(() => setToast(null), 4500)
  }, [])

  const changePath = useCallback((path, value) => {
    setContent((current) => setValue(current, path, value))
  }, [])

  const verifyAdmin = useCallback(async (activeSession) => {
    if (!activeSession) {
      setSession(null)
      setAuthLoading(false)
      return false
    }
    const { data, error } = await supabase.rpc('is_site_admin')
    if (error || data !== true) {
      await supabase.auth.signOut()
      setSession(null)
      setAuthLoading(false)
      return false
    }
    const saved = await fetchAdminContent()
    setContent(saved.draft)
    setSavedContent(saved.draft)
    setPublishedContent(saved.published)
    setUpdatedAt(saved.updatedAt)
    setPublishedAt(saved.publishedAt)
    setSession(activeSession)
    setAuthLoading(false)
    return true
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return undefined
    }
    if (window.location.pathname === '/admin/login' || isPasswordRecoveryRoute()) {
      return undefined
    }
    let active = true
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) {
        setAuthLoading(false)
        notify(`Could not restore your session: ${error.message}`, 'error')
      } else {
        verifyAdmin(data.session).catch((cause) => {
          if (active) {
            setAuthLoading(false)
            notify(cause.message, 'error')
          }
        })
      }
    })
    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return
      if (!nextSession) {
        setSession(null)
        setAuthLoading(false)
      } else if (event === 'TOKEN_REFRESHED') {
        setSession(nextSession)
      }
    })
    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [notify, verifyAdmin])

  useEffect(() => {
    const onPopState = () => setSection(initialSection())
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    const beforeUnload = (event) => {
      if (hasChanges) {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [hasChanges])

  useEffect(() => () => pendingPreviews.forEach((preview) => URL.revokeObjectURL(preview.url)), [pendingPreviews])

  function navigate(next) {
    setSection(next)
    setMobileNavOpen(false)
    const url = next === 'overview' ? '/admin' : `/admin?section=${encodeURIComponent(next)}`
    window.history.pushState({}, '', url)
  }

  async function persist(publish) {
    setBusy(true)
    try {
      validateContent(content, publish)
      const timestamp = publish ? await publishContent(content) : await saveDraft(content)
      setSavedContent(structuredClone(content))
      setUpdatedAt(timestamp)
      if (publish) {
        setPublishedAt(timestamp)
        setPublishedContent(createPublishedContent(content))
        notify('Changes published. The public portfolio will now show this version.')
      } else {
        notify('Draft saved. Publish it when you are ready for visitors to see it.')
      }
    } catch (cause) {
      notify(cause.message || 'Could not save your changes.', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function logout() {
    if (hasChanges && !window.confirm('You have unsaved changes. Log out and discard them?')) return
    setBusy(true)
    const { error } = await supabase.auth.signOut()
    setBusy(false)
    if (error) notify(`Logout failed: ${error.message}`, 'error')
    else {
      setSession(null)
      window.history.pushState({}, '', '/admin/login')
    }
  }

  function addGalleryUrl() {
    try {
      const image = validateExternalUrl(galleryUrl)
      setContent((current) => ({
        ...current,
        gallery: [...current.gallery, { id: makeId(), image, alt: galleryAlt, caption: galleryCaption, category: '', published: true }],
      }))
      setGalleryUrl('')
      setGalleryAlt('')
      setGalleryCaption('')
      notify('Image added to your draft. Save or publish to keep it.')
    } catch (cause) {
      notify(cause.message, 'error')
    }
  }

  async function chooseGalleryFiles(files) {
    try {
      if (files.length > 20) throw new Error('Upload up to 20 images at a time.')
      await Promise.all(files.map(validateImageFile))
      setPendingFiles(files)
      setPendingPreviews(files.map((file) => ({ name: file.name, url: URL.createObjectURL(file) })))
    } catch (cause) {
      notify(cause.message, 'error')
    }
  }

  function cancelGalleryUpload() {
    setPendingFiles([])
    setPendingPreviews([])
  }

  async function uploadGalleryFiles(files) {
    setBusy(true)
    const uploaded = []
    try {
      await Promise.all(files.map(validateImageFile))
      const uploads = []
      for (const file of files) {
        const asset = await uploadMedia(file)
        uploaded.push(asset.path)
        uploads.push({
          id: makeId(),
          image: asset.url,
          storagePath: asset.path,
          alt: file.name.replace(/\.[^.]+$/, ''),
          caption: '',
          category: '',
          published: true,
        })
      }
      setContent((current) => ({ ...current, gallery: [...current.gallery, ...uploads] }))
      notify(`${uploads.length} image${uploads.length === 1 ? '' : 's'} uploaded to your draft.`)
      return true
    } catch (cause) {
      const cleanupErrors = []
      for (const path of uploaded) {
        try {
          await deleteMedia(path)
        } catch (cleanupError) {
          cleanupErrors.push(cleanupError.message)
        }
      }
      notify([cause.message, ...cleanupErrors].join(' '), 'error')
      return false
    } finally {
      setBusy(false)
    }

  }

  async function confirmGalleryUpload() {
    if (await uploadGalleryFiles(pendingFiles)) cancelGalleryUpload()
  }

  async function removeGalleryAsset(item) {
    if (!item.storagePath) {
      setContent((current) => ({ ...current, gallery: current.gallery.filter((image) => image.id !== item.id) }))
      return
    }
    if (!window.confirm('Remove this image from the current draft? The stored file will remain until it is no longer used by published content.')) return
    setContent((current) => ({
      ...current,
      gallery: current.gallery.filter((image) => image.id !== item.id),
    }))
    notify('Image removed from this draft. Publish the change before cleaning up the stored file.')
  }

  async function refreshStoredMedia() {
    setBusy(true)
    try {
      setStoredMedia(await listMedia())
    } catch (cause) {
      notify(cause.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  async function deleteUnusedMedia(item) {
    const serializedContent = [content, publishedContent].filter(Boolean).map((document) => JSON.stringify(document))
    if (serializedContent.some((document) => document.includes(item.path) || document.includes(item.url))) {
      notify('This image is still referenced by a draft or published page. Remove all references and publish that change before deleting it.', 'error')
      return
    }
    if (!window.confirm('Permanently delete this unreferenced image from storage?')) return
    setBusy(true)
    try {
      await deleteMedia(item.path)
      setStoredMedia((current) => current.filter((asset) => asset.path !== item.path))
      notify('Unreferenced image deleted from storage.')
    } catch (cause) {
      notify(cause.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  function discardChanges() {
    if (!window.confirm('Discard all unsaved changes?')) return
    if (savedContent) setContent(structuredClone(savedContent))
    else setContent(cloneDefaultContent())
  }

  function addVideo() {
    try {
      const parsed = validateYouTubeUrl(videoUrlInput)
      const duplicate = content.videos.some((video) => video.url === parsed.url)
      if (duplicate) throw new Error('That video is already in your list.')
      const video = {
        id: makeId(),
        url: parsed.url,
        title: '',
        description: '',
        thumbnail: `https://img.youtube.com/vi/${parsed.id}/hqdefault.jpg`,
        featured: false,
        published: true,
      }
      setContent((current) => ({ ...current, videos: [...current.videos, video] }))
      setVideoUrlInput('')
      notify('Video added. Enter a title before publishing.')
    } catch (cause) {
      notify(cause.message, 'error')
    }
  }

  if (!isSupabaseConfigured) {
    return (
      <main className="admin-login-page">
        <a className="admin-back-link" href="/"><ArrowLeft size={16} /> Back to portfolio</a>
        <section className="admin-login-card setup-notice">
          <span className="admin-logo">EK</span><p className="admin-eyebrow">SECURE DASHBOARD SETUP</p>
          <h1>Connect persistent storage</h1>
          <p>The admin dashboard uses Supabase Auth, database row-level security, and Supabase Storage. No local-only persistence is enabled.</p>
          <ol>
            <li>Create a Supabase project.</li>
            <li>Run <code>supabase/schema.sql</code> in the project SQL editor.</li>
            <li>Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in Vercel and local <code>.env.local</code>.</li>
          </ol>
          <a className="admin-secondary-button" href="https://github.com/vinaydixit7078-jpg/Lakshman#secure-supabase-setup" target="_blank" rel="noreferrer">Read secure setup instructions <ChevronRight size={16} /></a>
        </section>
      </main>
    )
  }

  if (isPasswordRecoveryRoute()) return <PasswordRecovery />

  if (authLoading) return <main className="admin-loading"><span className="admin-spinner" />Checking your secure session…</main>

  if (!session) {
    if (window.location.pathname !== '/admin/login') window.history.replaceState({}, '', '/admin/login')
    return <AdminLogin onSignedIn={verifyAdmin} />
  }

  function renderPanel() {
    switch (section) {
      case 'homepage':
        return (
          <>
            <SectionTitle eyebrow="01 / FRONT PAGE" title="Homepage content"><button type="button" className="admin-secondary-button" onClick={() => setPreviewOpen(true)}><Eye size={16} /> Preview draft</button></SectionTitle>
            <div className="admin-form-grid">
              {[['Athlete name', 'site.fullName'], ['Brand name', 'site.brand'], ['Profession and tagline', 'site.role'], ['YouTube channel URL', 'site.channelUrl', 'url'], ['Channel description', 'site.channelDescription', 'textarea'], ['Main headline', 'site.hero.headline', 'textarea'], ['Hero description', 'site.hero.subheadline', 'textarea'], ['Hero accent text', 'site.hero.accent'], ['Portrait image URL', 'site.hero.portrait', 'url'], ['Background image URL', 'site.hero.backgroundImage', 'url'], ['Primary button label', 'site.hero.primaryLabel'], ['Primary button destination', 'site.hero.primaryHref'], ['Secondary button label', 'site.hero.secondaryLabel'], ['Secondary button destination', 'site.hero.secondaryHref']].map(([label, path, type]) => <TextField key={path} content={content} path={path} label={label} type={type || 'text'} onChange={changePath} />)}
              <TextField content={content} path="site.hero.backgroundPosition" label="Background image position" type="select" options={[{ value: 'center', label: 'Center' }, { value: 'center top', label: 'Top' }, { value: 'center bottom', label: 'Bottom' }, { value: 'left center', label: 'Left' }, { value: 'right center', label: 'Right' }]} onChange={changePath} />
            </div>
            <div className="draft-preview"><p className="admin-eyebrow">LIVE DRAFT PREVIEW</p><strong>{content.site.fullName}</strong><span>{content.site.hero.headline}</span><p>{content.site.hero.subheadline}</p></div>
          </>
        )
      case 'about':
        return (
          <>
            <SectionTitle eyebrow="02 / ATHLETE PROFILE" title="About me" />
            <div className="admin-form-grid">
              {[['Section heading', 'about.heading'], ['Biography / introduction', 'about.intro', 'textarea'], ['Philosophy or quote', 'about.quote', 'textarea'], ['Portrait image URL', 'about.portrait', 'url']].map(([label, path, type]) => <TextField key={path} content={content} path={path} label={label} type={type || 'text'} onChange={changePath} />)}
            </div>
            <h3 className="subsection-title">Optional personal details</h3>
            <ArrayEditor items={content.about.details} onChange={(items) => changePath('about.details', items)} addLabel="detail" emptyText="No optional details are published." schema={[{ path: 'label', label: 'Label' }, { path: 'value', label: 'Value' }, { path: 'visible', label: 'Show publicly', type: 'checkbox', defaultValue: true }]} />
          </>
        )
      case 'journey':
        return (
          <>
            <SectionTitle eyebrow="03 / MILESTONES" title="Running journey" />
            <div className="admin-form-grid">{[['Section heading', 'journey.heading'], ['Introduction', 'journey.intro', 'textarea']].map(([label, path, type]) => <TextField key={path} content={content} path={path} label={label} type={type || 'text'} onChange={changePath} />)}</div>
            <ArrayEditor items={content.journey.items} onChange={(items) => changePath('journey.items', items)} addLabel="milestone" emptyText="No milestones yet. Add only verified or clearly editorial entries." schema={[{ path: 'title', label: 'Title' }, { path: 'description', label: 'Description', type: 'textarea' }, { path: 'date', label: 'Date (optional)' }, { path: 'image', label: 'Image URL (optional)', type: 'url' }, { path: 'published', label: 'Published', type: 'checkbox', defaultValue: true }]} />
          </>
        )
      case 'achievements':
        return <><SectionTitle eyebrow="04 / VERIFIED RECORDS" title="Achievements and personal records" /><p className="admin-help">All fields are optional. Do not add an achievement, time, ranking, or competition unless verified.</p><ArrayEditor items={content.achievements} onChange={(items) => changePath('achievements', items)} addLabel="achievement" emptyText="No verified achievements are published. The public site will not show empty statistic cards." schema={[{ path: 'title', label: 'Achievement title' }, { path: 'event', label: 'Event / distance (optional)' }, { path: 'result', label: 'Result or time (optional)' }, { path: 'competition', label: 'Competition (optional)' }, { path: 'date', label: 'Date (optional)' }, { path: 'location', label: 'Location (optional)' }, { path: 'image', label: 'Image URL (optional)', type: 'url' }, { path: 'description', label: 'Description', type: 'textarea' }, { path: 'evidenceUrl', label: 'Evidence link (optional)', type: 'url' }, { path: 'published', label: 'Published', type: 'checkbox', defaultValue: true }]} /></>
      case 'training':
        return <><SectionTitle eyebrow="05 / SPORTS CONTENT" title="Training themes" /><p className="admin-help">Make clear whether a post describes general fitness themes or Laxman’s own verified practice.</p><div className="admin-form-grid">{[['Section heading', 'training.heading'], ['Section introduction', 'training.intro', 'textarea']].map(([label, path, type]) => <TextField key={path} content={content} path={path} label={label} type={type || 'text'} onChange={changePath} />)}</div><ArrayEditor items={content.training.items} onChange={(items) => changePath('training.items', items)} addLabel="training item" emptyText="No training content yet." schema={[{ path: 'category', label: 'Category' }, { path: 'title', label: 'Title' }, { path: 'description', label: 'Description', type: 'textarea' }, { path: 'image', label: 'Image URL (optional)', type: 'url' }, { path: 'videoUrl', label: 'Video URL (optional)', type: 'url' }, { path: 'published', label: 'Published', type: 'checkbox', defaultValue: true }]} /></>
      case 'videos':
        return (
          <>
            <SectionTitle eyebrow="06 / YOUTUBE CHANNEL" title="Video manager" />
            <div className="add-inline">
              <Field label="YouTube video or Shorts URL" value={videoUrlInput} onChange={setVideoUrlInput} placeholder="https://youtu.be/…" />
              <button type="button" className="admin-primary-button" onClick={addVideo}><Plus size={16} /> Add video</button>
            </div>
            <p className="admin-help">A valid URL is required. Enter the title yourself if the public metadata cannot be retrieved. The channel API key is not required.</p>
            {content.videos.length > 0 && (
              <div className="video-admin-grid">
                {content.videos.map((video) => {
                  const thumbnail = safeImagePreview(video.thumbnail)
                  return (
                    <a className="video-admin-preview" key={video.id} href={video.url} target="_blank" rel="noreferrer">
                      {thumbnail ? <img src={thumbnail} alt="" /> : <span>Thumbnail preview unavailable</span>}
                      <strong>{video.title || 'Add a title below'}</strong>
                    </a>
                  )
                })}
              </div>
            )}
            <ArrayEditor items={content.videos} onChange={(items) => changePath('videos', items)} addLabel="video" emptyText="No videos are added yet. Add an actual public video or Short URL." schema={[{ path: 'title', label: 'Video title' }, { path: 'url', label: 'YouTube URL', type: 'url' }, { path: 'description', label: 'Description', type: 'textarea' }, { path: 'thumbnail', label: 'Thumbnail URL (optional)', type: 'url' }, { path: 'featured', label: 'Feature on homepage', type: 'checkbox' }, { path: 'published', label: 'Published', type: 'checkbox', defaultValue: true }]} />
          </>
        )
      case 'gallery':
        return (
          <>
            <SectionTitle eyebrow="07 / MEDIA LIBRARY" title="Gallery manager">
              <button type="button" className="admin-secondary-button" onClick={refreshStoredMedia} disabled={busy}><Activity size={16} /> Scan storage</button>
            </SectionTitle>
            <label className="upload-drop">
              <Upload size={22} /><strong>Upload images</strong>
              <span>JPEG, PNG, WebP, or AVIF · max 5 MB per image</span>
              <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple disabled={busy} onChange={(event) => { if (event.target.files?.length) chooseGalleryFiles(Array.from(event.target.files)); event.target.value = '' }} />
            </label>
            {pendingPreviews.length > 0 && (
              <div className="upload-preview-panel">
                <div className="admin-item-head"><strong>Preview selected images ({pendingPreviews.length})</strong><div className="admin-item-actions"><button type="button" className="admin-secondary-button" onClick={cancelGalleryUpload}>Cancel</button><button type="button" className="admin-primary-button" disabled={busy} onClick={confirmGalleryUpload}><Upload size={15} /> {busy ? 'Uploading…' : 'Upload selected'}</button></div></div>
                <div className="media-admin-grid">{pendingPreviews.map((preview) => <figure className="media-admin-card" key={preview.url}><img src={preview.url} alt="" /><figcaption>{preview.name}</figcaption></figure>)}</div>
              </div>
            )}
            <div className="gallery-url-form">
              <h3>Add image by URL</h3>
              <div className="admin-form-grid">
                <Field label="Image URL" type="url" value={galleryUrl} onChange={setGalleryUrl} />
                <Field label="Alternative text" value={galleryAlt} onChange={setGalleryAlt} />
                <Field label="Caption (optional)" value={galleryCaption} onChange={setGalleryCaption} />
              </div>
              {safeImagePreview(galleryUrl) && <img className="url-image-preview" src={safeImagePreview(galleryUrl)} alt="Preview of the image URL" />}
              <button type="button" className="admin-secondary-button" onClick={addGalleryUrl}><Plus size={16} /> Add URL to gallery</button>
            </div>
            <div className="media-admin-grid">
              {content.gallery.map((item, index) => (
                <article className="media-admin-card" key={item.id}>
                  <img src={item.image} alt="" />
                  <div>
                    <strong>{item.caption || item.alt || `Image ${index + 1}`}</strong>
                    <span>{item.storagePath ? 'Stored in Supabase Storage' : 'External / bundled image'}</span>
                    <button type="button" className="text-action" onClick={() => {
                      changePath('site.hero.portrait', item.image)
                      changePath('about.portrait', item.image)
                    }}>Set as portrait</button>
                    <button type="button" className="text-action" onClick={() => changePath('site.hero.backgroundImage', item.image)}>Set as hero background</button>
                    <button type="button" className="text-action" onClick={() => removeGalleryAsset(item)}>Remove from gallery</button>
                  </div>
                </article>
              ))}
            </div>
            <h3 className="subsection-title">Gallery details and order</h3>
            <ArrayEditor items={content.gallery} onChange={(items) => changePath('gallery', items)} addLabel="gallery item" emptyText="No images in the gallery." schema={[{ path: 'alt', label: 'Alternative text' }, { path: 'caption', label: 'Caption' }, { path: 'category', label: 'Category' }, { path: 'published', label: 'Published', type: 'checkbox', defaultValue: true }]} />
            {storedMedia.length > 0 && (
              <>
                <h3 className="subsection-title">Stored files and unreferenced uploads</h3>
                <div className="media-admin-grid">
                  {storedMedia.map((item) => {
                    const referenced = [content, publishedContent].filter(Boolean)
                      .some((document) => JSON.stringify(document).includes(item.path) || JSON.stringify(document).includes(item.url))
                    return (
                      <article className="media-admin-card" key={item.path}>
                        <img src={item.url} alt="" />
                        <div>
                          <strong>{item.path}</strong>
                          <span>{referenced ? 'In use by draft or published content' : 'Not referenced'}</span>
                          {!referenced && <button type="button" className="text-danger" onClick={() => deleteUnusedMedia(item)}>Delete unused file</button>}
                        </div>
                      </article>
                    )
                  })}
                </div>
              </>
            )}
          </>
        )
      case 'socials':
        return <><SectionTitle eyebrow="08 / CONTACT" title="Social links" /><p className="admin-help">Only add verified profiles or contact details. Empty or disabled links are hidden from visitors.</p><ArrayEditor items={content.socials} onChange={(items) => changePath('socials', items)} addLabel="social link" emptyText="No social links are listed." schema={[{ path: 'label', label: 'Label' }, { path: 'url', label: 'URL or email address' }, { path: 'enabled', label: 'Enabled publicly', type: 'checkbox', defaultValue: true }]} /></>
      case 'appearance':
        return <><SectionTitle eyebrow="09 / DESIGN SYSTEM" title="Appearance" /><div className="admin-form-grid">{[['Accent color', 'appearance.accent', 'color'], ['Background color', 'appearance.background', 'color'], ['Surface color', 'appearance.surface', 'color'], ['Text color', 'appearance.text', 'color']].map(([label, path, type]) => <TextField key={path} content={content} path={path} label={label} type={type} onChange={changePath} />)}<TextField content={content} path="appearance.font" label="Font" type="select" options={['Inter', 'Arial', 'Georgia', 'system-ui'].map((value) => ({ value, label: value }))} onChange={changePath} /><TextField content={content} path="appearance.radius" label="Card radius" type="select" options={['0.5rem', '1rem', '1.25rem', '1.75rem'].map((value) => ({ value, label: value }))} onChange={changePath} /><TextField content={content} path="appearance.spacing" label="Section spacing" type="select" options={['compact', 'comfortable', 'spacious'].map((value) => ({ value, label: value }))} onChange={changePath} /></div><div className="appearance-preview" style={{ background: content.appearance.background, color: content.appearance.text, borderRadius: content.appearance.radius, fontFamily: content.appearance.font }}><span>Theme preview</span><button type="button" style={{ background: content.appearance.accent }}>EK LAKSHYA</button></div><button type="button" className="admin-secondary-button" onClick={() => changePath('appearance', cloneDefaultContent().appearance)}>Reset appearance to defaults</button></>
      case 'sections':
        return (
          <>
            <SectionTitle eyebrow="10 / PAGE STRUCTURE" title="Section visibility and order" />
            <p className="admin-help">Home is always present. Keep at least one useful public section visible.</p>
            <div className="section-manager-list">
              {content.sections.map((item, index) => (
                <div className="section-manager-row" key={item.id}>
                  <div className="section-row-order">
                    <button type="button" className="icon-button" aria-label={`Move ${item.label} up`} disabled={index === 0} onClick={() => {
                      const list = [...content.sections]
                      ;[list[index - 1], list[index]] = [list[index], list[index - 1]]
                      changePath('sections', list.map((entry, order) => ({ ...entry, order: order + 1 })))
                    }}><ArrowUp size={16} /></button>
                    <button type="button" className="icon-button" aria-label={`Move ${item.label} down`} disabled={index === content.sections.length - 1} onClick={() => {
                      const list = [...content.sections]
                      ;[list[index], list[index + 1]] = [list[index + 1], list[index]]
                      changePath('sections', list.map((entry, order) => ({ ...entry, order: order + 1 })))
                    }}><ArrowDown size={16} /></button>
                  </div>
                  <div className="section-manager-fields">
                    <Field label="Navigation label" value={item.label} onChange={(value) => changePath('sections', content.sections.map((entry) => entry.id === item.id ? { ...entry, label: value } : entry))} />
                    <Field label="Section heading" value={item.heading} onChange={(value) => changePath('sections', content.sections.map((entry) => entry.id === item.id ? { ...entry, heading: value } : entry))} />
                    <Field label="Section intro / subtitle" type="textarea" value={item.intro} onChange={(value) => changePath('sections', content.sections.map((entry) => entry.id === item.id ? { ...entry, intro: value } : entry))} />
                    <Field label={`Show ${item.label} publicly`} type="checkbox" value={item.visible} onChange={(value) => {
                      if (!value && content.sections.filter((entry) => entry.visible).length <= 1) {
                        notify('Keep at least one public section visible.', 'error')
                        return
                      }
                      changePath('sections', content.sections.map((entry) => entry.id === item.id ? { ...entry, visible: value } : entry))
                    }} />
                  </div>
                </div>
              ))}
              <button type="button" className="admin-secondary-button" onClick={() => changePath('sections', cloneDefaultContent().sections)}>Restore default section order and headings</button>
            </div>
          </>
        )
      case 'seo':
        return <><SectionTitle eyebrow="11 / SEARCH AND SITE DETAILS" title="SEO and site settings" /><div className="admin-form-grid">{[['Page title', 'seo.title'], ['Meta description', 'seo.description', 'textarea'], ['Open Graph title', 'seo.openGraphTitle'], ['Open Graph description', 'seo.openGraphDescription', 'textarea'], ['Social sharing image URL', 'seo.image', 'url'], ['Favicon URL', 'seo.favicon', 'url'], ['Public site URL', 'seo.siteUrl', 'url'], ['Footer text', 'site.footerText'], ['Show copyright', 'site.showCopyright', 'checkbox']].map(([label, path, type]) => <TextField key={path} content={content} path={path} label={label} type={type || 'text'} onChange={changePath} />)}</div><p className="admin-help">Authentication, database, and deployment configuration are intentionally not editable here.</p></>
      case 'security':
        return <><SectionTitle eyebrow="12 / ACCESS CONTROL" title="Security and sessions" /><div className="security-card"><ShieldCheck size={24} /><div><strong>Authenticated admin session</strong><p>{session.user.email}</p><p>Database write access is enforced by Supabase Row Level Security. There is no public registration route.</p></div></div><div className="security-card"><Activity size={24} /><div><strong>Persistent storage</strong><p>Website content is stored in the Supabase database. Gallery uploads use the restricted portfolio-media storage bucket.</p></div></div><button type="button" className="admin-danger-button" onClick={logout} disabled={busy}><LogOut size={16} /> Log out securely</button></>
      default:
        return <><SectionTitle eyebrow="SITE CONTROL CENTER" title="Overview" /><div className="overview-grid">{[['Published videos', publishedItems.videos], ['Gallery images', publishedItems.gallery], ['Published achievements', publishedItems.achievements], ['Visible sections', publishedItems.sections]].map(([label, value]) => <article className="overview-card" key={label}><span>{label}</span><strong>{value}</strong></article>)}</div><div className="overview-status"><div><span>Publishing status</span><strong>{publishedAt ? 'Published' : 'Using professional defaults'}</strong></div><div><span>Last content update</span><strong>{updatedAt ? new Date(updatedAt).toLocaleString() : 'No changes saved yet'}</strong></div><div><span>Last published</span><strong>{publishedAt ? new Date(publishedAt).toLocaleString() : 'Defaults currently live'}</strong></div></div><h3 className="subsection-title">Quick actions</h3><div className="quick-actions">{[['homepage', 'Edit Homepage'], ['videos', 'Add Video'], ['gallery', 'Upload Photo'], ['achievements', 'Add Achievement']].map(([target, label]) => <button key={target} type="button" onClick={() => navigate(target)}>{label}<ChevronRight size={16} /></button>)}<button type="button" onClick={() => setPreviewOpen(true)}>Preview draft<Eye size={16} /></button><a href="/" target="_blank" rel="noreferrer">Open Public Website<ArrowUp size={16} /></a></div><p className="admin-help">Counts reflect content marked published in your current draft. The public site updates only after you publish.</p></>
    }
  }

  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar ${mobileNavOpen ? 'mobile-open' : ''}`}>
        <a href="/" className="admin-brand"><span className="admin-logo">EK</span><span><strong>EK LAKSHYA</strong><small>SITE MANAGEMENT</small></span></a>
        <nav aria-label="Admin sections">
          {sections.map(([id, label, Icon]) => <button type="button" key={id} className={section === id ? 'active' : ''} onClick={() => navigate(id)}><Icon size={17} /><span>{label}</span></button>)}
        </nav>
        <button type="button" className="admin-logout" onClick={logout}><LogOut size={17} /><span>Log out</span></button>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <button type="button" className="admin-mobile-menu" onClick={() => setMobileNavOpen((open) => !open)} aria-label="Toggle admin navigation">{mobileNavOpen ? <X /> : <Menu />}</button>
          <div><span className={`save-indicator ${hasChanges ? 'unsaved' : ''}`}><span />{hasChanges ? 'Unsaved changes' : 'All changes saved'}</span></div>
          <div className="admin-top-actions">
            <a href="/" target="_blank" rel="noreferrer">View site <ArrowUp size={15} /></a>
            <button type="button" className="admin-secondary-button" onClick={() => setPreviewOpen(true)}><Eye size={15} /> Preview</button>
            {hasChanges && <button type="button" className="admin-secondary-button" disabled={busy} onClick={discardChanges}>Discard</button>}
            <button type="button" className="admin-primary-button" disabled={busy || !hasChanges} onClick={() => persist(false)}><Save size={15} /> {busy ? 'Saving…' : 'Save draft'}</button>
            <button type="button" className="admin-primary-button publish-button" disabled={busy || !hasChanges} onClick={() => persist(true)}><Check size={15} /> Publish</button>
          </div>
        </header>
        <main className="admin-content">
          <div className="admin-breadcrumb"><span>Dashboard</span><ChevronRight size={15} /><strong>{currentSection[1]}</strong></div>
          {renderPanel()}
        </main>
      </div>
      {toast && <div className={`admin-toast ${toast.kind}`} role="status">{toast.message}<button type="button" aria-label="Dismiss notification" onClick={() => setToast(null)}><X size={16} /></button></div>}
      {previewOpen && (
        <div className="preview-backdrop" role="presentation" onClick={(event) => event.target === event.currentTarget && setPreviewOpen(false)}>
          <section className="draft-preview-modal" role="dialog" aria-modal="true" aria-labelledby="draft-preview-title">
            <button type="button" className="preview-close icon-button" aria-label="Close preview" onClick={() => setPreviewOpen(false)}><X size={18} /></button>
            <p className="admin-eyebrow">LOCAL PREVIEW · NOT PUBLISHED</p>
            <h2 id="draft-preview-title">{content.site.fullName}</h2>
            <p className="preview-brand">{content.site.brand} · {content.site.role}</p>
            <h3>{content.site.hero.headline}</h3>
            <p>{content.site.hero.subheadline}</p>
            <img src={safeImagePreview(content.site.hero.portrait) || '/laxman-portrait.jpg'} alt="" />
            <div className="preview-section">
              <span>ABOUT</span><strong>{content.about.heading}</strong><p>{content.about.intro}</p>
            </div>
            {content.sections.filter((item) => item.visible).sort((a, b) => a.order - b.order).map((item) => (
              <div className="preview-section" key={item.id}>
                <span>{item.label.toUpperCase()}</span>
                <strong>{item.heading || ({
                  journey: content.journey.heading,
                  progress: content.progress.heading,
                  training: content.training.heading,
                  videos: 'EK LAKSHYA, straight from the source.',
                  achievements: 'Verified achievements',
                  gallery: 'Photo gallery',
                  contact: 'Follow along',
                })[item.id]}</strong>
                <p>{item.intro || ({
                  journey: `${content.journey.items.filter((entry) => entry.published !== false).length} published journey entries`,
                  training: `${content.training.items.filter((entry) => entry.published !== false).length} published training items`,
                  videos: `${content.videos.filter((entry) => entry.published !== false).length} published videos`,
                  achievements: `${content.achievements.filter((entry) => entry.published !== false).length} published achievements`,
                  gallery: `${content.gallery.filter((entry) => entry.published !== false).length} published images`,
                  contact: `${content.socials.filter((entry) => entry.enabled && entry.url).length} enabled social links`,
                })[item.id] || ''}</p>
              </div>
            ))}
            <div className="preview-note">Save your draft, then choose Publish to make it visible on the public site.</div>
            <button type="button" className="admin-secondary-button" onClick={() => setPreviewOpen(false)}>Close preview</button>
          </section>
        </div>
      )}
    </div>
  )
}

export default AdminApp
