import { useEffect, useMemo, useRef, useState, useCallback } from 'react'

/* ============================================================
   TMDB API
   ============================================================ */

const TMDB_KEY = 'b1941699110de014fceb3d15828f4718'
const BASE = 'https://api.themoviedb.org/3'
const REGION = 'US'

const img = (path, size = 'w342') =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : null

async function tmdb(path, params = {}) {
  const qs = new URLSearchParams({ api_key: TMDB_KEY, language: 'en-US', ...params })
  const res = await fetch(`${BASE}${path}?${qs.toString()}`)
  if (!res.ok) throw new Error(`TMDB ${res.status}`)
  return res.json()
}

const yearOf = (item) => {
  const d = item.release_date || item.first_air_date
  return d ? d.slice(0, 4) : '—'
}

const titleOf = (item) => item.title || item.name || 'Untitled'
const mediaTypeOf = (item) => item.media_type || (item.first_air_date ? 'tv' : 'movie')

const GENRES_CURATED = [
  { name: 'Action', movieId: 28, tvId: 10759 },
  { name: 'Comedy', movieId: 35, tvId: 35 },
  { name: 'Animation', movieId: 16, tvId: 16 },
  { name: 'Horror', movieId: 27, tvId: 9648 },
]

/* ============================================================
   Icons
   ============================================================ */

const Icon = {
  search: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" strokeLinecap="round" /></svg>),
  bookmark: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M6 3.5h12a1 1 0 011 1V21l-7-4-7 4V4.5a1 1 0 011-1z" strokeLinejoin="round" /></svg>),
  bookmarkFilled: (p) => (<svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M6 3.5h12a1 1 0 011 1V21l-7-4-7 4V4.5a1 1 0 011-1z" /></svg>),
  play: (p) => (<svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M8 5.5v13l11-6.5-11-6.5z" /></svg>),
  x: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M5 5l14 14M19 5L5 19" strokeLinecap="round" /></svg>),
  film: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><rect x="3" y="4.5" width="18" height="15" rx="4" /><path d="M8 4.5v15M16 4.5v15M3 9.5h5M3 14.5h5M16 9.5h5M16 14.5h5" /></svg>),
  compass: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><circle cx="12" cy="12" r="9" /><path d="M15 9l-2 6-4 2 2-6 4-2z" /></svg>),
  sliders: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M4 7h10M17 7h3M4 17h3M10 17h10" strokeLinecap="round" /><circle cx="14" cy="7" r="2.2" /><circle cx="7" cy="17" r="2.2" /></svg>),
  check: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" {...p}><path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" /></svg>),
  eye: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>),
  star: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><path d="M12 2.5l2.9 6.3 6.9.7-5.2 4.7 1.5 6.8L12 17.6l-6.1 3.4 1.5-6.8L2.2 9.5l6.9-.7L12 2.5z" strokeLinejoin="round" /></svg>),
  starFilled: (p) => (<svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M12 2.5l2.9 6.3 6.9.7-5.2 4.7 1.5 6.8L12 17.6l-6.1 3.4 1.5-6.8L2.2 9.5l6.9-.7L12 2.5z" /></svg>),
  clock: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" strokeLinecap="round" /></svg>),
  sort: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><path d="M6 4v16M6 4l-3 3M6 4l3 3M18 20V4M18 20l-3-3M18 20l3-3" strokeLinecap="round" strokeLinejoin="round" /></svg>),
}

/* ============================================================
   Watchlist persistence — now with status, rating, timestamps
   ============================================================ */

function useWatchlist() {
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem('reel_watchlist')
      return raw ? JSON.parse(raw) : []
    } catch { return [] }
  })

  useEffect(() => {
    localStorage.setItem('reel_watchlist', JSON.stringify(items))
  }, [items])

  const has = useCallback((id, mediaType) => items.some((i) => i.id === id && i.media_type === mediaType), [items])
  const get = useCallback((id, mediaType) => items.find((i) => i.id === id && i.media_type === mediaType), [items])

  const toggle = useCallback((item) => {
    const mediaType = mediaTypeOf(item)
    setItems((prev) => {
      const exists = prev.some((i) => i.id === item.id && i.media_type === mediaType)
      if (exists) return prev.filter((i) => !(i.id === item.id && i.media_type === mediaType))
      return [{
        id: item.id,
        media_type: mediaType,
        title: titleOf(item),
        poster_path: item.poster_path,
        vote_average: item.vote_average,
        year: yearOf(item),
        genre_ids: item.genre_ids || (item.genres ? item.genres.map((g) => g.id) : []),
        status: 'planned',
        rating: 0,
        saved_at: Date.now(),
        watched_at: null,
      }, ...prev]
    })
  }, [])

  const setWatched = useCallback((item, watched) => {
    const mediaType = mediaTypeOf(item)
    setItems((prev) => prev.map((i) => {
      if (i.id !== item.id || i.media_type !== mediaType) return i
      return { ...i, status: watched ? 'watched' : 'planned', watched_at: watched ? Date.now() : null }
    }))
  }, [])

  const setRating = useCallback((item, rating) => {
    const mediaType = mediaTypeOf(item)
    setItems((prev) => prev.map((i) => (i.id === item.id && i.media_type === mediaType) ? { ...i, rating } : i))
  }, [])

  return { items, has, get, toggle, setWatched, setRating }
}

/* ============================================================
   Shared pieces
   ============================================================ */

function ScoreRing({ value = 0, size = 38 }) {
  const pct = Math.max(0, Math.min(100, Math.round((value || 0) * 10)))
  const r = 15
  const c = 2 * Math.PI * r
  const offset = c - (pct / 100) * c
  return (
    <div className="score-wrap">
      <svg className="score-ring" width={size} height={size} viewBox="0 0 36 36">
        <circle cx="18" cy="18" r={r} fill="none" stroke="#F1E0D9" strokeWidth="3" />
        <circle cx="18" cy="18" r={r} fill="none" stroke="#B3391F" strokeWidth="3" strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 18 18)" />
      </svg>
      <span className="score-num">{pct}% liked</span>
    </div>
  )
}

function PosterCard({ item, watchlist, onOpen, showWatchedMark }) {
  const mediaType = mediaTypeOf(item)
  const saved = watchlist.has(item.id, mediaType)
  const record = watchlist.get(item.id, mediaType)
  const isWatched = record?.status === 'watched'
  return (
    <div className="card">
      <button className="card-poster" onClick={() => onOpen(item)} aria-label={`Open ${titleOf(item)}`}>
        {item.poster_path ? <img src={img(item.poster_path)} alt="" loading="lazy" /> : <div className="card-empty-poster">{titleOf(item)}</div>}
        <span className="card-save" role="button" onClick={(e) => { e.stopPropagation(); watchlist.toggle(item) }}>
          {saved ? <Icon.bookmarkFilled style={{ color: '#B3391F' }} /> : <Icon.bookmark style={{ color: '#211A17' }} />}
        </span>
        {isWatched && (
          <span className="card-watched-badge"><Icon.check /></span>
        )}
        {showWatchedMark && saved && (
          <span
            className={`wl-mark ${isWatched ? 'done' : ''}`}
            role="button"
            onClick={(e) => { e.stopPropagation(); watchlist.setWatched(item, !isWatched) }}
          >
            <Icon.check style={{ color: isWatched ? '#fff' : '#52443F' }} />
          </span>
        )}
      </button>
      <div className="card-title">{titleOf(item)}</div>
      <div className="card-year">{yearOf(item)} · {mediaType === 'tv' ? 'Series' : 'Film'}</div>
    </div>
  )
}

function Rail({ title, sub, badge, items, loading, watchlist, onOpen }) {
  if (!loading && (!items || items.length === 0)) return null
  return (
    <div className="rail-section">
      <div className="rail-head">
        <div className="rail-title-wrap">
          <div className="rail-title">{title}</div>
          {sub && <div className="rail-sub">{sub}</div>}
        </div>
        {badge && <div className="rail-badge">{badge}</div>}
      </div>
      {loading ? (
        <div className="skel-rail">{[...Array(4)].map((_, i) => <div key={i} className="skel-card" />)}</div>
      ) : (
        <div className="rail">
          {items.map((item) => <PosterCard key={`${mediaTypeOf(item)}-${item.id}`} item={item} watchlist={watchlist} onOpen={onOpen} />)}
        </div>
      )}
    </div>
  )
}

function Top10Rail({ title, sub, items, loading, watchlist, onOpen }) {
  if (!loading && (!items || items.length === 0)) return null
  return (
    <div className="rail-section">
      <div className="rail-head">
        <div className="rail-title-wrap">
          <div className="rail-title">{title}</div>
          {sub && <div className="rail-sub">{sub}</div>}
        </div>
        <div className="rail-badge">Top 10</div>
      </div>
      {loading ? (
        <div className="skel-rail">{[...Array(4)].map((_, i) => <div key={i} className="skel-card" />)}</div>
      ) : (
        <div className="top10-rail">
          {items.slice(0, 10).map((item, i) => (
            <div className="top10-item" key={`${mediaTypeOf(item)}-${item.id}`}>
              <span className="top10-num">{i + 1}</span>
              <button className="card-poster" onClick={() => onOpen(item)} aria-label={`Open ${titleOf(item)}`}>
                {item.poster_path ? <img src={img(item.poster_path)} alt="" loading="lazy" /> : <div className="card-empty-poster">{titleOf(item)}</div>}
                <span className="card-save" role="button" onClick={(e) => { e.stopPropagation(); watchlist.toggle(item) }}>
                  {watchlist.has(item.id, mediaTypeOf(item)) ? <Icon.bookmarkFilled style={{ color: '#B3391F' }} /> : <Icon.bookmark style={{ color: '#211A17' }} />}
                </span>
              </button>
              <div className="card-title">{titleOf(item)}</div>
              <div className="card-year">{yearOf(item)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ============================================================
   Detail sheet
   ============================================================ */

function DetailSheet({ item, onClose, watchlist }) {
  const mediaType = mediaTypeOf(item)
  const [data, setData] = useState(null)
  const [showTrailer, setShowTrailer] = useState(false)

  useEffect(() => {
    let alive = true
    setData(null)
    setShowTrailer(false)
    tmdb(`/${mediaType}/${item.id}`, { append_to_response: 'credits,videos,watch/providers' })
      .then((d) => { if (alive) setData(d) }).catch(() => {})
    return () => { alive = false }
  }, [item.id, mediaType])

  const trailer = useMemo(() => {
    const vids = data?.videos?.results || []
    return vids.find((v) => v.site === 'YouTube' && v.type === 'Trailer') || vids.find((v) => v.site === 'YouTube')
  }, [data])

  const providers = data?.['watch/providers']?.results?.[REGION]
  const providerList = useMemo(() => {
    if (!providers) return []
    const merged = [...(providers.flatrate || []), ...(providers.ads || [])]
    const seen = new Set()
    return merged.filter((p) => { if (seen.has(p.provider_id)) return false; seen.add(p.provider_id); return true })
  }, [providers])

  const cast = (data?.credits?.cast || []).slice(0, 12)
  const record = watchlist.get(item.id, mediaType)
  const saved = !!record
  const isWatched = record?.status === 'watched'
  const runtime = data?.runtime || data?.episode_run_time?.[0]
  const genres = data?.genres || []
  const fullItem = data ? { ...item, ...data } : item

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet">
        <button className="sheet-close" onClick={onClose} aria-label="Close"><Icon.x style={{ color: '#fff' }} /></button>

        {item.backdrop_path || data?.backdrop_path ? (
          <img className="sheet-backdrop-img" src={img(data?.backdrop_path || item.backdrop_path, 'w780')} alt="" />
        ) : <div className="sheet-backdrop-img" />}

        <div className="sheet-body">
          <div className="sheet-poster-row">
            <div className="sheet-poster">{item.poster_path ? <img src={img(item.poster_path)} alt="" /> : null}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sheet-title">{titleOf(item)}</div>
              <div className="sheet-meta">
                <span>{yearOf(item)}</span>
                {runtime ? <><span className="dot">·</span><span>{mediaType === 'tv' ? `${runtime}m/ep` : `${runtime}m`}</span></> : null}
                <span className="dot">·</span>
                <span>{mediaType === 'tv' ? 'Series' : 'Film'}</span>
              </div>
              {data ? <ScoreRing value={data.vote_average} /> : null}
            </div>
          </div>

          {genres.length > 0 && (
            <div className="chip-wrap" style={{ marginBottom: 18 }}>
              {genres.map((g) => <span key={g.id} className="chip">{g.name}</span>)}
            </div>
          )}

          <div className="actions-row">
            <button className={`btn ${saved ? 'btn-secondary' : 'btn-primary'}`} onClick={() => watchlist.toggle(fullItem)}>
              {saved ? <Icon.bookmarkFilled /> : <Icon.bookmark />}
              {saved ? 'Saved' : 'Save to watchlist'}
            </button>
            <button className={`btn ${isWatched ? 'btn-secondary' : 'btn-outline'}`} onClick={() => { if (!saved) watchlist.toggle(fullItem); watchlist.setWatched(fullItem, !isWatched) }}>
              {isWatched ? <Icon.check /> : <Icon.eye />}
              {isWatched ? 'Watched' : 'Mark as watched'}
            </button>
            {trailer && (
              <button className="btn btn-gold" onClick={() => setShowTrailer((s) => !s)}><Icon.play />Trailer</button>
            )}
          </div>

          {isWatched && (
            <>
              <div className="section-label">Your rating</div>
              <div className="rate-row">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} className="rate-star" onClick={() => watchlist.setRating(fullItem, n === record?.rating ? 0 : n)}>
                    {(record?.rating || 0) >= n ? <Icon.starFilled style={{ color: '#8A5D00' }} /> : <Icon.star style={{ color: '#A48981' }} />}
                  </button>
                ))}
              </div>
            </>
          )}

          {showTrailer && trailer && (
            <div className="trailer-frame">
              <iframe src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1`} title="Trailer" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            </div>
          )}

          {(data?.overview || item.overview) && (
            <><div className="section-label">Overview</div><p className="overview">{data?.overview || item.overview}</p></>
          )}

          {providerList.length > 0 && (
            <>
              <div className="section-label">Stream on</div>
              <div className="provider-row">
                {providerList.map((p) => (
                  <div className="provider-chip" key={p.provider_id}>
                    <div className="provider-logo"><img src={img(p.logo_path, 'w92')} alt="" /></div>
                    <span className="provider-name">{p.provider_name}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {cast.length > 0 && (
            <>
              <div className="section-label">Cast</div>
              <div className="cast-row">
                {cast.map((c) => (
                  <div className="cast-item" key={c.id}>
                    <div className="cast-photo">{c.profile_path ? <img src={img(c.profile_path, 'w185')} alt="" /> : null}</div>
                    <div className="cast-name">{c.name}</div>
                    <div className="cast-role">{c.character}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {!data && <div className="spinner-dot">loading reel —</div>}
        </div>
      </div>
    </>
  )
}

/* ============================================================
   Discover tab — long, rich scroll for finding new things
   ============================================================ */

function DiscoverView({ watchlist, onOpen }) {
  const [trending, setTrending] = useState([])
  const [top10Movies, setTop10Movies] = useState([])
  const [top10Tv, setTop10Tv] = useState([])
  const [nowPlaying, setNowPlaying] = useState([])
  const [popularMovies, setPopularMovies] = useState([])
  const [popularTv, setPopularTv] = useState([])
  const [upcoming, setUpcoming] = useState([])
  const [topRated, setTopRated] = useState([])
  const [airingToday, setAiringToday] = useState([])
  const [genreRails, setGenreRails] = useState({})
  const [personalized, setPersonalized] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    Promise.all([
      tmdb('/trending/all/week'),
      tmdb('/trending/movie/day'),
      tmdb('/trending/tv/day'),
      tmdb('/movie/now_playing'),
      tmdb('/movie/popular'),
      tmdb('/tv/popular'),
      tmdb('/movie/upcoming'),
      tmdb('/movie/top_rated'),
      tmdb('/tv/airing_today'),
      ...GENRES_CURATED.map((g) => tmdb('/discover/movie', { with_genres: g.movieId, sort_by: 'popularity.desc' })),
    ]).then(([t, tm, tt, np, pm, pt, up, tr, at, ...genreResults]) => {
      if (!alive) return
      setTrending(t.results || [])
      setTop10Movies(tm.results || [])
      setTop10Tv(tt.results || [])
      setNowPlaying(np.results || [])
      setPopularMovies(pm.results || [])
      setPopularTv(pt.results || [])
      setUpcoming(up.results || [])
      setTopRated(tr.results || [])
      setAiringToday(at.results || [])
      const rails = {}
      GENRES_CURATED.forEach((g, i) => { rails[g.name] = genreResults[i]?.results || [] })
      setGenreRails(rails)
      setLoading(false)
    }).catch(() => setLoading(false))
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (watchlist.items.length === 0) { setPersonalized(null); return }
    const recent = watchlist.items[0]
    const genreId = recent.genre_ids?.[0]
    if (!genreId) { setPersonalized(null); return }
    tmdb(`/discover/${recent.media_type}`, { with_genres: genreId, sort_by: 'popularity.desc' })
      .then((d) => setPersonalized({ title: recent.title, items: (d.results || []).map((r) => ({ ...r, media_type: recent.media_type })) }))
      .catch(() => setPersonalized(null))
  }, [watchlist.items.length])

  const hero = trending.slice(0, 5)

  return (
    <div>
      <div className="hero-scroll">
        {(loading ? [...Array(1)] : hero).map((h, i) => h ? (
          <div className="hero" key={`${mediaTypeOf(h)}-${h.id}`}>
            <img src={img(h.backdrop_path || h.poster_path, 'w780')} alt="" />
            <div className="hero-scrim" />
            <div className="hero-content">
              <span className="hero-eyebrow">No. {i + 1} this week</span>
              <div className="hero-title">{titleOf(h)}</div>
              <div className="hero-meta"><span>{yearOf(h)}</span><span className="dot">·</span><span>{mediaTypeOf(h) === 'tv' ? 'Series' : 'Film'}</span></div>
              <div className="hero-actions">
                <button className="btn btn-gold" onClick={() => onOpen(h)}><Icon.play /> View</button>
                <button className="btn btn-ghost" onClick={() => watchlist.toggle(h)}>
                  {watchlist.has(h.id, mediaTypeOf(h)) ? <Icon.bookmarkFilled /> : <Icon.bookmark />}
                  {watchlist.has(h.id, mediaTypeOf(h)) ? 'Saved' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        ) : <div className="hero" key="skel" />)}
      </div>

      <Top10Rail title="Top 10 films today" items={top10Movies} loading={loading} watchlist={watchlist} onOpen={onOpen} />
      <Top10Rail title="Top 10 series today" items={top10Tv} loading={loading} watchlist={watchlist} onOpen={onOpen} />

      {personalized && personalized.items.length > 0 && (
        <Rail title={`Because you saved ${personalized.title}`} sub="more like it" items={personalized.items} loading={false} watchlist={watchlist} onOpen={onOpen} />
      )}

      <Rail title="New in theaters" sub="now playing" items={nowPlaying} loading={loading} watchlist={watchlist} onOpen={onOpen} />
      <Rail title="Trending this week" items={trending.slice(5)} loading={loading} watchlist={watchlist} onOpen={onOpen} />
      <Rail title="Popular series" items={popularTv} loading={loading} watchlist={watchlist} onOpen={onOpen} />
      <Rail title="Coming soon" sub="mark your calendar" items={upcoming} loading={loading} watchlist={watchlist} onOpen={onOpen} />
      <Rail title="Popular films" items={popularMovies} loading={loading} watchlist={watchlist} onOpen={onOpen} />

      {GENRES_CURATED.map((g) => (
        <Rail key={g.name} title={`${g.name} picks`} items={genreRails[g.name]} loading={loading} watchlist={watchlist} onOpen={onOpen} />
      ))}

      <Rail title="Critics' picks" sub="highest rated films" items={topRated} loading={loading} watchlist={watchlist} onOpen={onOpen} />
      <Rail title="Airing today" sub="on TV right now" items={airingToday} loading={loading} watchlist={watchlist} onOpen={onOpen} />
    </div>
  )
}

/* ============================================================
   Browse / Search tab
   ============================================================ */

function FilterDrawer({ open, onClose, mediaType, setMediaType, genres, activeGenre, setActiveGenre, providers, activeProvider, setActiveProvider }) {
  if (!open) return null
  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-handle" />
        <div className="drawer-title">Filter the shelf</div>
        <div className="filter-group">
          <div className="filter-group-label">Type</div>
          <div className="chip-wrap">
            {['all', 'movie', 'tv'].map((t) => (
              <button key={t} className={`chip ${mediaType === t ? 'active' : ''}`} onClick={() => setMediaType(t)}>
                {t === 'all' ? 'Everything' : t === 'movie' ? 'Films' : 'Series'}
              </button>
            ))}
          </div>
        </div>
        <div className="filter-group">
          <div className="filter-group-label">Genre</div>
          <div className="chip-wrap">
            <button className={`chip ${!activeGenre ? 'active' : ''}`} onClick={() => setActiveGenre(null)}>Any</button>
            {genres.map((g) => (
              <button key={g.name} className={`chip ${activeGenre === g.name ? 'active' : ''}`} onClick={() => setActiveGenre(g.name)}>{g.name}</button>
            ))}
          </div>
        </div>
        <div className="filter-group">
          <div className="filter-group-label">Streaming service</div>
          <div className="chip-wrap">
            <button className={`chip ${!activeProvider ? 'active' : ''}`} onClick={() => setActiveProvider(null)}>Any</button>
            {providers.map((p) => (
              <button key={p.provider_id} className={`chip ${activeProvider === p.provider_id ? 'active' : ''}`} onClick={() => setActiveProvider(p.provider_id)}>{p.provider_name}</button>
            ))}
          </div>
        </div>
        <div className="drawer-actions">
          <button className="btn btn-outline btn-full" onClick={() => { setMediaType('all'); setActiveGenre(null); setActiveProvider(null) }}>Clear</button>
          <button className="btn btn-primary btn-full" onClick={onClose}>Show results</button>
        </div>
      </div>
    </>
  )
}

function BrowseView({ watchlist, onOpen }) {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const [mediaType, setMediaType] = useState('all')
  const [movieGenres, setMovieGenres] = useState([])
  const [tvGenres, setTvGenres] = useState([])
  const [activeGenre, setActiveGenre] = useState(null)
  const [providers, setProviders] = useState([])
  const [activeProvider, setActiveProvider] = useState(null)

  const requestId = useRef(0)

  useEffect(() => {
    tmdb('/genre/movie/list').then((d) => setMovieGenres(d.genres || [])).catch(() => {})
    tmdb('/genre/tv/list').then((d) => setTvGenres(d.genres || [])).catch(() => {})
    Promise.all([
      tmdb('/watch/providers/movie', { watch_region: REGION }),
      tmdb('/watch/providers/tv', { watch_region: REGION }),
    ]).then(([m, t]) => {
      const merged = [...(m.results || []), ...(t.results || [])]
      const seen = new Map()
      merged.forEach((p) => { if (!seen.has(p.provider_id)) seen.set(p.provider_id, p) })
      const list = Array.from(seen.values()).sort((a, b) => (a.display_priority || 99) - (b.display_priority || 99))
      setProviders(list.slice(0, 20))
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 350)
    return () => clearTimeout(t)
  }, [query])

  const genreOptions = useMemo(() => {
    const names = new Set(); const list = []
    ;[...movieGenres, ...tvGenres].forEach((g) => { if (!names.has(g.name)) { names.add(g.name); list.push(g) } })
    return list.sort((a, b) => a.name.localeCompare(b.name))
  }, [movieGenres, tvGenres])

  useEffect(() => {
    const id = ++requestId.current
    setLoading(true)
    async function run() {
      if (debounced) {
        const d = await tmdb('/search/multi', { query: debounced, include_adult: 'false' })
        let list = (d.results || []).filter((r) => r.media_type === 'movie' || r.media_type === 'tv')
        if (mediaType !== 'all') list = list.filter((r) => r.media_type === mediaType)
        return list
      }
      const movieGenreId = activeGenre ? movieGenres.find((g) => g.name === activeGenre)?.id : null
      const tvGenreId = activeGenre ? tvGenres.find((g) => g.name === activeGenre)?.id : null
      const calls = []
      if (mediaType === 'all' || mediaType === 'movie') {
        calls.push(tmdb('/discover/movie', { sort_by: 'popularity.desc', watch_region: REGION, ...(activeProvider ? { with_watch_providers: activeProvider } : {}), ...(movieGenreId ? { with_genres: movieGenreId } : {}) }).then((d) => (d.results || []).map((r) => ({ ...r, media_type: 'movie' }))))
      }
      if (mediaType === 'all' || mediaType === 'tv') {
        calls.push(tmdb('/discover/tv', { sort_by: 'popularity.desc', watch_region: REGION, ...(activeProvider ? { with_watch_providers: activeProvider } : {}), ...(tvGenreId ? { with_genres: tvGenreId } : {}) }).then((d) => (d.results || []).map((r) => ({ ...r, media_type: 'tv' }))))
      }
      const settled = await Promise.all(calls)
      return settled.flat().sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
    }
    run().then((list) => { if (id === requestId.current) { setResults(list); setLoading(false) } }).catch(() => { if (id === requestId.current) setLoading(false) })
  }, [debounced, mediaType, activeGenre, activeProvider, movieGenres, tvGenres])

  const activeCount = [mediaType !== 'all', !!activeGenre, !!activeProvider].filter(Boolean).length

  return (
    <div>
      <div className="search-wrap">
        <div className="search-box">
          <Icon.search />
          <input placeholder="Search films, series, people…" value={query} onChange={(e) => setQuery(e.target.value)} />
          {query && <button onClick={() => setQuery('')} aria-label="Clear search"><Icon.x style={{ width: 14, height: 14, color: '#8C7A73' }} /></button>}
        </div>
      </div>

      <div className="filter-row">
        <button className={`chip ${activeCount ? 'active' : ''}`} onClick={() => setDrawerOpen(true)}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon.sliders style={{ width: 12, height: 12 }} /> Filters{activeCount ? ` · ${activeCount}` : ''}</span>
        </button>
        {debounced && <span className="chip" style={{ opacity: 0.6 }}>filters apply once search is cleared</span>}
      </div>

      {loading ? (
        <div className="grid">{[...Array(9)].map((_, i) => <div key={i} className="skel-card" style={{ width: '100%', aspectRatio: '2/3' }} />)}</div>
      ) : results.length === 0 ? (
        <div className="state-msg"><strong>Nothing here yet</strong>{debounced ? 'No matches for that search.' : 'Try loosening a filter or two.'}</div>
      ) : (
        <div className="grid">
          {results.map((item) => <PosterCard key={`${mediaTypeOf(item)}-${item.id}`} item={item} watchlist={watchlist} onOpen={onOpen} />)}
        </div>
      )}

      <FilterDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} mediaType={mediaType} setMediaType={setMediaType} genres={genreOptions} activeGenre={activeGenre} setActiveGenre={setActiveGenre} providers={providers} activeProvider={activeProvider} setActiveProvider={setActiveProvider} />
    </div>
  )
}

/* ============================================================
   Watchlist tab — status, rating, sorting, stats
   ============================================================ */

function WatchlistView({ watchlist, onOpen }) {
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('recent')

  const plannedCount = watchlist.items.filter((i) => i.status !== 'watched').length
  const watchedCount = watchlist.items.filter((i) => i.status === 'watched').length

  const visible = useMemo(() => {
    let list = watchlist.items
    if (statusFilter === 'planned') list = list.filter((i) => i.status !== 'watched')
    if (statusFilter === 'watched') list = list.filter((i) => i.status === 'watched')
    list = [...list]
    if (sortBy === 'recent') list.sort((a, b) => b.saved_at - a.saved_at)
    if (sortBy === 'az') list.sort((a, b) => a.title.localeCompare(b.title))
    if (sortBy === 'rating') list.sort((a, b) => (b.rating || 0) - (a.rating || 0))
    return list
  }, [watchlist.items, statusFilter, sortBy])

  if (watchlist.items.length === 0) {
    return <div className="state-msg"><strong>Your shelf is empty</strong>Tap the bookmark on anything you'd like to watch later — it'll turn up here.</div>
  }

  return (
    <div>
      <div className="wl-stats">
        <div className="wl-stat planned"><div className="wl-stat-num">{plannedCount}</div><div className="wl-stat-label">to watch</div></div>
        <div className="wl-stat watched"><div className="wl-stat-num">{watchedCount}</div><div className="wl-stat-label">watched</div></div>
      </div>

      <div className="filter-row">
        {['all', 'planned', 'watched'].map((s) => (
          <button key={s} className={`chip ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>
            {s === 'all' ? 'All' : s === 'planned' ? 'To watch' : 'Watched'}
          </button>
        ))}
        <button className={`chip ${sortBy !== 'recent' ? 'active' : ''}`} onClick={() => setSortBy(sortBy === 'recent' ? 'az' : sortBy === 'az' ? 'rating' : 'recent')}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Icon.sort style={{ width: 12, height: 12 }} /> {sortBy === 'recent' ? 'Recent' : sortBy === 'az' ? 'A–Z' : 'My rating'}
          </span>
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="state-msg"><strong>Nothing here</strong>Nothing matches that filter yet.</div>
      ) : (
        <div className="grid">
          {visible.map((item) => (
            <PosterCard key={`${item.media_type}-${item.id}`} item={item} watchlist={watchlist} onOpen={onOpen} showWatchedMark />
          ))}
        </div>
      )}
    </div>
  )
}

/* ============================================================
   App shell
   ============================================================ */

export default function App() {
  const [tab, setTab] = useState('discover')
  const [selected, setSelected] = useState(null)
  const watchlist = useWatchlist()

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">reel<span>.</span></div>
        <div className="brand-mark">now showing</div>
      </div>

      {tab === 'discover' && <DiscoverView watchlist={watchlist} onOpen={setSelected} />}
      {tab === 'browse' && <BrowseView watchlist={watchlist} onOpen={setSelected} />}
      {tab === 'watchlist' && <WatchlistView watchlist={watchlist} onOpen={setSelected} />}

      {selected && <DetailSheet item={selected} onClose={() => setSelected(null)} watchlist={watchlist} />}

      <nav className="tabbar">
        <button className={`tab ${tab === 'discover' ? 'active' : ''}`} onClick={() => setTab('discover')}>
          <span className="tab-icon-wrap"><Icon.film /></span>Discover
        </button>
        <button className={`tab ${tab === 'browse' ? 'active' : ''}`} onClick={() => setTab('browse')}>
          <span className="tab-icon-wrap"><Icon.compass /></span>Browse
        </button>
        <button className={`tab ${tab === 'watchlist' ? 'active' : ''}`} onClick={() => setTab('watchlist')}>
          <span className="tab-icon-wrap"><Icon.bookmark /></span>Watchlist
          {watchlist.items.length > 0 && <span className="tab-count">{watchlist.items.length}</span>}
        </button>
      </nav>
    </div>
  )
}
