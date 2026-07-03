/**
 * Sumic – standalone frontend
 * API: GET /api/search?q=...  (served by server.js)
 * Playback: YouTube IFrame Player API
 */
(function () {
  'use strict';
  // API BASE CONFIGURATION (Set this to your Render backend URL when deploying to Cloudflare Pages)
  const API_BASE = 'https://sumic-api.onrender.com';


  // Default playlists
  const defaultPlaylists = [
    {
      id: 'default_chill',
      title: 'Chill Vibes',
      description: 'Laid-back music for relaxing or working without distractions.',
      tracks: [
        { id: '4NRXx6U8ABQ', title: 'Blinding Lights', author: 'The Weeknd', thumbnail: 'https://img.youtube.com/vi/4NRXx6U8ABQ/mqdefault.jpg' },
        { id: 'TUVcZfQe-Kw', title: 'Levitating', author: 'Dua Lipa', thumbnail: 'https://img.youtube.com/vi/TUVcZfQe-Kw/mqdefault.jpg' },
      ],
      type: 'custom',
      owner: 'Sumic'
    },
    {
      id: 'default_party',
      title: 'Party Mix',
      description: 'Upbeat anthems and crowd favorites to keep the energy going.',
      tracks: [
        { id: 'JGwWNGJdvx8', title: 'Shape of You', author: 'Ed Sheeran', thumbnail: 'https://img.youtube.com/vi/JGwWNGJdvx8/mqdefault.jpg' },
        { id: 'kTJczUoc26U', title: 'Stay', author: 'The Kid LAROI & Justin Bieber', thumbnail: 'https://img.youtube.com/vi/kTJczUoc26U/mqdefault.jpg' },
      ],
      type: 'custom',
      owner: 'Sumic'
    },
    {
      id: 'default_focus',
      title: 'Focus Flow',
      description: 'Curated beats that help you stay in the zone for longer.',
      tracks: [
        { id: 'jfKfPfyJRdk', title: 'Focus Flow', author: 'Deep work and calm energy.', thumbnail: 'https://img.youtube.com/vi/jfKfPfyJRdk/mqdefault.jpg' },
        { id: '4NRXx6U8ABQ', title: 'Night Drive', author: 'Smooth soundtracks for late nights.', thumbnail: 'https://img.youtube.com/vi/4NRXx6U8ABQ/mqdefault.jpg' },
      ],
      type: 'custom',
      owner: 'Sumic'
    }
  ];

  let initialPlaylists = [];
  try {
    initialPlaylists = JSON.parse(localStorage.getItem('sumic_playlists') || '[]');
  } catch (e) {
    initialPlaylists = [];
  }
  if (!initialPlaylists || initialPlaylists.length === 0) {
    initialPlaylists = defaultPlaylists;
    localStorage.setItem('sumic_playlists', JSON.stringify(initialPlaylists));
  }

  /* ── STATE ── */
  const st = {
    track: JSON.parse(localStorage.getItem('sumic_track') || 'null'),
    queue: JSON.parse(localStorage.getItem('sumic_queue') || '[]'),
    hist: JSON.parse(localStorage.getItem('sumic_history') || '[]'),
    playing: false, shuffle: false, repeatMode: 'off',
    vol: parseFloat(localStorage.getItem('sumic_vol') || '0.8'),
    muted: false,
    lastVol: parseFloat(localStorage.getItem('sumic_vol') || '0.8'),
    tab: 'home', expanded: false,
    results: [], query: '',
    recent: JSON.parse(localStorage.getItem('sumic_recent') || '[]'),
    timer: null,
    playlists: initialPlaylists,
    activePlaylistId: null,
    activeImportedPlaylistId: null,
    liked: JSON.parse(localStorage.getItem('sumic_liked') || '[]'),
    user: null,
    theme: localStorage.getItem('sumic_theme') || 'dark',
    lyrics: [],
    lyricsIndex: -1,
    recommendations: JSON.parse(localStorage.getItem('sumic_recommendations') || '[]'),
    recAnchor: localStorage.getItem('sumic_rec_anchor') || '',
  };

  Object.defineProperty(st, 'importedPlaylist', {
    get() {
      if (st.activeImportedPlaylistId) {
        return st.playlists.find(p => p.id === st.activeImportedPlaylistId && p.type === 'imported') || null;
      }
      return st.playlists.find(p => p.type === 'imported') || null;
    },
    set(val) {
      if (val) {
        const existingIdx = st.playlists.findIndex(p => p.id === val.id);
        const newPlaylist = {
          id: val.id,
          title: val.title,
          description: `Spotify playlist by ${val.owner || 'unknown'}.`,
          tracks: val.tracks.map(item => ({
            id: item.id || item.videoId || '',
            title: item.title || 'Unknown',
            author: item.author || item.artist || '',
            thumbnail: item.thumbnail || ''
          })),
          type: 'imported',
          owner: val.owner || 'Spotify'
        };
        if (existingIdx >= 0) {
          st.playlists[existingIdx] = newPlaylist;
        } else {
          st.playlists.unshift(newPlaylist);
        }
        localStorage.setItem('sumic_playlists', JSON.stringify(st.playlists));
        st.activeImportedPlaylistId = val.id;
      }
    }
  });

  // Real songs with verified YouTube IDs
  const homeData = {
    trending: [
      { title: 'Blinding Lights', artist: 'The Weeknd', videoId: '4NRXx6U8ABQ', accent: 'linear-gradient(135deg, #ff6b6b, #8b5cf6)' },
      { title: 'Shape of You', artist: 'Ed Sheeran', videoId: 'JGwWNGJdvx8', accent: 'linear-gradient(135deg, #4f46e5, #06b6d4)' },
      { title: 'Levitating', artist: 'Dua Lipa', videoId: 'TUVcZfQe-Kw', accent: 'linear-gradient(135deg, #f59e0b, #fb7185)' },
      { title: 'Stay', artist: 'The Kid LAROI & Justin Bieber', videoId: 'kTJczUoc26U', accent: 'linear-gradient(135deg, #14b8a6, #0f766e)' },
      { title: 'As It Was', artist: 'Harry Styles', videoId: 'H5v3kku4y6Q', accent: 'linear-gradient(135deg, #ef4444, #7c3aed)' },
      { title: 'Anti-Hero', artist: 'Taylor Swift', videoId: 'b1kbLwvqugk', accent: 'linear-gradient(135deg, #2563eb, #38bdf8)' },
      { title: 'Flowers', artist: 'Miley Cyrus', videoId: 'G7KNmW9a75Y', accent: 'linear-gradient(135deg, #f97316, #fde68a)' },
      { title: 'Calm Down', artist: 'Rema & Selena Gomez', videoId: 'WcYOCfyGSiU', accent: 'linear-gradient(135deg, #4f46e5, #6366f1)' },
    ],
    recent: [
      { title: 'Blinding Lights', artist: 'The Weeknd', time: '2h ago', videoId: '4NRXx6U8ABQ', accent: 'linear-gradient(135deg, #ff6b6b, #8b5cf6)' },
      { title: 'Levitating', artist: 'Dua Lipa', time: 'Yesterday', videoId: 'TUVcZfQe-Kw', accent: 'linear-gradient(135deg, #f59e0b, #fb7185)' },
      { title: 'As It Was', artist: 'Harry Styles', time: '3 days ago', videoId: 'H5v3kku4y6Q', accent: 'linear-gradient(135deg, #ef4444, #7c3aed)' },
      { title: 'Anti-Hero', artist: 'Taylor Swift', time: '1 week ago', videoId: 'b1kbLwvqugk', accent: 'linear-gradient(135deg, #2563eb, #38bdf8)' },
    ],
    playlists: [
      { title: 'Focus Flow', description: 'Deep work and calm energy.', videoId: 'jfKfPfyJRdk', accent: 'linear-gradient(135deg, #4f46e5, #6366f1)' },
      { title: 'Night Drive', description: 'Smooth soundtracks for late nights.', videoId: '4NRXx6U8ABQ', accent: 'linear-gradient(135deg, #0f172a, #334155)' },
      { title: 'Weekend Vibes', description: 'Bright, upbeat songs for your best days.', videoId: 'TUVcZfQe-Kw', accent: 'linear-gradient(135deg, #ec4899, #f59e0b)' },
      { title: 'Sunset Sessions', description: 'Warm melodies for easy evenings.', videoId: 'H5v3kku4y6Q', accent: 'linear-gradient(135deg, #10b981, #0f766e)' },
    ],
    artists: [
      {
        name: 'The Weeknd',
        genre: 'R&B / Pop',
        bio: 'Chart-topping hits with dark, cinematic sound.',
        songs: [
          { title: 'Blinding Lights', videoId: '4NRXx6U8ABQ' },
          { title: 'Starboy', videoId: 'AJtDXIazrMo' },
          { title: 'Save Your Tears', videoId: 'LIIDh-qI9oI' },
        ],
        videoId: '4NRXx6U8ABQ'
      },
      {
        name: 'Dua Lipa',
        genre: 'Dance Pop',
        bio: 'High-energy pop anthems built for the dancefloor.',
        songs: [
          { title: 'Levitating', videoId: 'TUVcZfQe-Kw' },
          { title: "Don't Start Now", videoId: 'oygrmJFkg68' },
          { title: 'Physical', videoId: 'v8Gp3_O-pA0' },
        ],
        videoId: 'TUVcZfQe-Kw'
      },
      {
        name: 'Harry Styles',
        genre: 'Pop / Rock',
        bio: 'Retro-influenced pop with emotional depth.',
        songs: [
          { title: 'As It Was', videoId: 'H5v3kku4y6Q' },
          { title: 'Watermelon Sugar', videoId: 'E07s5ZYygMg' },
          { title: 'Adore You', videoId: 'VF-r5TtlT9w' },
        ],
        videoId: 'H5v3kku4y6Q'
      },
      {
        name: 'Taylor Swift',
        genre: 'Pop',
        bio: 'Storytelling pop with massive cultural impact.',
        songs: [
          { title: 'Anti-Hero', videoId: 'b1kbLwvqugk' },
          { title: 'Shake It Off', videoId: 'nfWlot6h_JM' },
          { title: 'Cruel Summer', videoId: 'ic8j13piAhQ' },
        ],
        videoId: 'b1kbLwvqugk'
      },
    ],
  };

  /* ── YT PLAYER ── */
  let yt = null, ytOk = false, pendingPlayback = null;
  let lyricsRequestId = 0;
  let userInitiatedPause = false;

  function updateMediaSession(track) {
    if ('mediaSession' in navigator && track) {
      try {
        const metadata = {
          title: track.title || 'Unknown Title',
          artist: track.author || 'Unknown Artist',
          album: 'Sumic',
        };
        if (track.thumbnail || track.id) {
          const artUrl = track.thumbnail || `https://img.youtube.com/vi/${track.id}/mqdefault.jpg`;
          metadata.artwork = [
            { src: artUrl, sizes: '96x96', type: 'image/jpeg' },
            { src: artUrl, sizes: '128x128', type: 'image/jpeg' },
            { src: artUrl, sizes: '192x192', type: 'image/jpeg' },
            { src: artUrl, sizes: '256x256', type: 'image/jpeg' },
            { src: artUrl, sizes: '384x384', type: 'image/jpeg' },
            { src: artUrl, sizes: '512x512', type: 'image/jpeg' }
          ];
        }
        navigator.mediaSession.metadata = new MediaMetadata(metadata);
        navigator.mediaSession.playbackState = 'playing';
      } catch (e) {
        console.warn('MediaSession metadata update failed:', e);
      }
    }
  }

  let wasPlayingBeforeMinimize = false;
  let silentAudio = null;

  function playSilentAudio() {
    try {
      if (!silentAudio) {
        silentAudio = document.createElement('audio');
        silentAudio.id = 'silentAudio';
        silentAudio.loop = true;
        silentAudio.volume = 0.01;
        silentAudio.src = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU2LjM2LjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV6urq6urq6urq6urq6urq6urq6urq6urq6v////////////////////////////////8AAAAATGF2YzU2LjQxAAAAAAAAAAAAAAAAJAAAAAAAAAAAASDs90hvAAAAAAAAAAAAAAAAAAAA//MUZAAAAAGkAAAAAAAAA0gAAAAATEFN//MUZAMAAAGkAAAAAAAAA0gAAAAARTMu//MUZAYAAAGkAAAAAAAAA0gAAAAAOTku//MUZAkAAAGkAAAAAAAAA0gAAAAANVVV';
        document.body.appendChild(silentAudio);
      }
      silentAudio.play().catch(e => console.warn('Silent audio play failed:', e));
    } catch (e) {
      console.warn('Silent audio helper failed:', e);
    }
  }

  function pauseSilentAudio() {
    if (silentAudio) {
      try {
        silentAudio.pause();
      } catch (e) {}
    }
  }

  function loadYT() {
    if (window.YT && window.YT.Player) {
      if (!yt) initYT();
      return;
    }
    
    window.onYouTubeIframeAPIReady = function() {
      initYT();
    };

    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(s);
    }

    // Polling fallback to make sure initYT is called if script loads but doesn't trigger callback
    let retries = 0;
    const interval = setInterval(() => {
      retries++;
      if (window.YT && window.YT.Player) {
        clearInterval(interval);
        if (!yt) initYT();
      }
      if (retries > 30) {
        clearInterval(interval);
        console.error('YouTube API script took too long to load.');
      }
    }, 100);
  }

  function initYT() {
    if (yt) return;
    try {
      yt = new YT.Player('ytPlayer', {
        height: '1', width: '1',
        playerVars: { autoplay: 0, controls: 0, disablekb: 1, fs: 0, modestbranding: 1, rel: 0, playsinline: 1, mute: 0 },
        events: {
          onReady: () => {
            ytOk = true;
            try {
              yt.setVolume(st.vol * 100);
              if (st.muted) yt.mute(); else yt.unMute();
            } catch (e) {}
            updVolIcon();
            if (pendingPlayback) {
              const next = pendingPlayback;
              pendingPlayback = null;
              play(next.track, next.queue);
            } else if (st.track) {
              const savedTime = parseFloat(localStorage.getItem('sumic_time') || '0');
              try {
                yt.cueVideoById({
                  videoId: st.track.id,
                  startSeconds: savedTime,
                  suggestedQuality: 'small'
                });
              } catch (e) {}
            }
          },
          onStateChange: onState,
          onError: onErr,
        },
      });
    } catch (err) {
      console.error("Error creating YT.Player:", err);
      setTimeout(initYT, 1000);
    }
  }

  function onState(e) {
    const P = YT.PlayerState;
    if (e.data === P.PLAYING)  {
      st.playing = true;
      setIcons(true);
      tickStart();
      spin(true);
      userInitiatedPause = false;
      wasPlayingBeforeMinimize = false;
      playSilentAudio();
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
    }
    if (e.data === P.PAUSED)   {
      st.playing = false;
      setIcons(false);
      tickStop();
      spin(false);
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
      
      // Auto-resume if the pause was not initiated by the user (e.g., app minimized or tab hidden)
      if (!userInitiatedPause) {
        // Keep silent audio playing so background playback/timers stay active
        playSilentAudio();
        
        setTimeout(() => {
          if (yt && ytOk && !userInitiatedPause) {
            try {
              yt.playVideo();
            } catch (err) {
              console.warn('Auto-resume failed:', err);
            }
          }
        }, 200);
      } else {
        pauseSilentAudio();
      }
    }
    if (e.data === P.ENDED)    { onEnd(); }
  }

  function onErr(e) {
    const m = { 2:'Invalid ID', 5:'HTML5 error', 100:'Not found', 101:'Embed blocked', 150:'Embed blocked' };
    if (e.data === 100 || e.data === 101 || e.data === 150) {
      toast('Playback is blocked by YouTube in this browser session. The track will appear selected, but audio may need a manual play click.', 'info');
    } else {
      toast(m[e.data] || 'Playback error — skipping', 'err');
    }
    onEnd(true);
  }

  function persistHistory() {
    localStorage.setItem('sumic_history', JSON.stringify(st.hist.slice(0, 12)));
  }

  function persistLiked() {
    localStorage.setItem('sumic_liked', JSON.stringify(st.liked.slice(0, 50)));
  }

  function persistTrackAndQueue() {
    localStorage.setItem('sumic_track', JSON.stringify(st.track));
    localStorage.setItem('sumic_queue', JSON.stringify(st.queue));
  }

  function normalizeTrack(track) {
    if (!track) return null;
    return {
      id: track.id || track.videoId || '',
      title: track.title || 'Unknown',
      author: track.author || track.artist || '',
      thumbnail: track.thumbnail || '',
      duration: track.duration || null
    };
  }

  function isLiked(id) {
    return st.liked.some(item => item.id === id);
  }

  function quoteJs(value) {
    return String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }

  function applyTheme() {
    document.body.classList.toggle('light', st.theme === 'light');
    const btn = document.getElementById('themeToggle');
    if (btn) btn.innerHTML = `<i class="fas fa-${st.theme === 'light' ? 'sun' : 'moon'}"></i>`;
    const sideBtn = document.getElementById('sidebarThemeToggle');
    if (sideBtn) sideBtn.innerHTML = `<i class="fas fa-${st.theme === 'light' ? 'sun' : 'moon'}"></i><span>Theme Toggle</span>`;
  }

  function scrollActiveLyricToCenter() {
    const wrap = document.getElementById('lyricsLines');
    const activeLine = wrap?.querySelector('.lyric-line.active');
    if (activeLine && st.expanded && document.getElementById('fpContent')?.classList.contains('lyric-mode')) {
      const targetScrollTop = activeLine.offsetTop - (wrap.clientHeight / 2) + (activeLine.clientHeight / 2);
      wrap.scrollTop = targetScrollTop;
    }
  }

  function splitTextToWordsAndChars(text) {
    const words = String(text || '').split(' ');
    let globalCharIndex = 0;
    
    return words.map(word => {
      const charsHtml = word.split('').map(char => {
        const html = `<span class="split-char" style="--char-index: ${globalCharIndex}">${esc(char)}</span>`;
        globalCharIndex++;
        return html;
      }).join('');
      return `<span class="split-word" style="display: inline-block; white-space: nowrap;">${charsHtml}</span>`;
    }).join(' ');
  }

  function renderLyrics() {
    const wrap = document.getElementById('lyricsLines');
    if (!wrap) return;

    if (!st.lyrics.length) {
      wrap.innerHTML = '<p class="lyric-line lyric-empty">Lyrics will appear here once a synced version is available.</p>';
      return;
    }

    wrap.innerHTML = st.lyrics.map((line, index) => `
      <div class="lyric-line${index === st.lyricsIndex ? ' active' : ''}">
        <span class="lyric-text">${splitTextToWordsAndChars(line.text)}</span>
      </div>`).join('');

    scrollActiveLyricToCenter();
  }

  function syncLyrics(currentTime) {
    if (!st.lyrics.length) return;
    let nextIndex = -1;

    for (let i = 0; i < st.lyrics.length; i++) {
      const line = st.lyrics[i];
      if (line.time === null) continue;
      if (currentTime >= line.time) nextIndex = i;
      else break;
    }

    if (nextIndex === -1 && st.lyrics[0]) {
      nextIndex = 0;
    }

    if (nextIndex !== st.lyricsIndex) {
      st.lyricsIndex = nextIndex;
      renderLyrics();
    }
  }

  async function loadLyrics(track) {
    const requestId = ++lyricsRequestId;
    st.lyrics = [];
    st.lyricsIndex = -1;
    renderLyrics();

    const title = track?.title || '';
    const artist = track?.author || '';
    if (!title) return;

    try {
      const res = await fetch(`${API_BASE}/api/lyrics?track=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}`);
      if (!res.ok) throw new Error('No lyrics');
      const data = await res.json();
      if (requestId !== lyricsRequestId) return;
      st.lyrics = Array.isArray(data.lines) ? data.lines : [];
      st.lyricsIndex = -1;
      renderLyrics();
      syncLyrics(0);
    } catch (e) {
      if (requestId !== lyricsRequestId) return;
      st.lyrics = [];
      st.lyricsIndex = -1;
      renderLyrics();
    }
  }

  function renderPlaylistDrawer() {
    const wrap = document.getElementById('playlistDrawerList');
    if (!wrap) return;
    const items = [];
    if (st.track) items.push({ ...st.track, nowPlaying: true });
    st.queue.forEach((item, index) => items.push({ ...item, queueIndex: index }));
    if (!items.length) {
      wrap.innerHTML = '<div class="empty-hint"><i class="fas fa-list"></i><p>Your playlist drawer is empty.</p><span>Queue a song to fill it with momentum.</span></div>';
      return;
    }
    wrap.innerHTML = items.map((item) => {
      const queueIndex = item.queueIndex ?? -1;
      const clickAction = item.nowPlaying ? 'S.expand()' : `S.playDrawerItem(${queueIndex})`;
      return `
        <div class="drawer-item${item.nowPlaying ? ' active' : ''}" onclick="${clickAction}">
          <div class="drawer-thumb">${item.thumbnail ? `<img src="${item.thumbnail}" alt="" loading="lazy">` : '<i class="fas fa-music"></i>'}</div>
          <div class="drawer-info">
            <div class="drawer-title">${esc(item.title)}</div>
            <div class="drawer-meta">${esc(item.author || 'Queued track')}</div>
          </div>
        </div>`;
    }).join('');
  }

  function getStoredUser() {
    try { return JSON.parse(localStorage.getItem('sumic_user') || 'null'); } catch { return null; }
  }

  function inferListeningVibe() {
    const recentTerms = (st.recent || []).slice(0, 6).join(' ').toLowerCase();
    const hints = [
      { key: 'chill', label: 'chill', songs: ['Linger', 'Sunset Sessions'] },
      { key: 'pop', label: 'pop', songs: ['As It Was', 'Levitating'] },
      { key: 'indie', label: 'indie', songs: ['Golden Hour', 'Midnight Drive'] },
      { key: 'dance', label: 'dance', songs: ['Stay', 'Blinding Lights'] },
      { key: 'focus', label: 'focus', songs: ['Focus Flow', 'Night Drive'] },
    ];
    const match = hints.find(item => recentTerms.includes(item.key));
    return match || hints[1];
  }

  function updateAccountUI() {
    const badge = document.getElementById('avatarBadge');
    const label = document.getElementById('accountLabel');
    const sBadge = document.getElementById('sidebarAvatarBadge');
    const sLabel = document.getElementById('sidebarAccountLabel');
    const authShell = document.getElementById('authShell');
    const app = document.getElementById('app');
    const initial = (st.user?.name || 'U').trim().charAt(0).toUpperCase();
    const name = st.user?.name ? st.user.name : 'Account';
    if (badge) badge.textContent = initial;
    if (label) label.textContent = name;
    if (sBadge) sBadge.textContent = initial;
    if (sLabel) sLabel.textContent = name;
    if (authShell) authShell.classList.toggle('hidden', !!st.user);
    if (app) app.classList.toggle('ready', !!st.user);
  }

  function setUser(user) {
    st.user = user;
    localStorage.setItem('sumic_user', JSON.stringify(user));
    updateAccountUI();
    renderHome();
    toast(user ? `Welcome back, ${user.name}` : 'Guest mode ready', 'ok');
  }

  /* ── PLAY ── */
  function play(track, queue = []) {
    if (!ytOk || !yt) {
      pendingPlayback = { track, queue };
      toast('Player loading…', 'info');
      loadYT();
      return;
    }
    const prev = normalizeTrack(st.track);
    if (prev && prev.id) {
      st.hist = [prev, ...st.hist.filter(item => item.id !== prev.id)].slice(0, 12);
      persistHistory();
    }
    st.track = normalizeTrack(track);
    st.queue = [...queue];
    persistTrackAndQueue();
    localStorage.setItem('sumic_time', '0');
    updBar(st.track); updFull(st.track); updQueue(); updFPQueue(); markNow(st.track.id);
    loadLyrics(st.track);
    fetchRecommendations(st.track);
    updateMediaSession(st.track);
    playSilentAudio();
    try {
      yt.loadVideoById({ videoId: st.track.id, startSeconds: 0, suggestedQuality: 'small' });
      yt.setVolume(st.vol * 100);
      yt.unMute();
      setTimeout(() => {
        try {
          yt.playVideo();
          yt.setVolume(st.vol * 100);
        } catch (e) {}
      }, 700);
    } catch (e) {
      toast('Unable to start playback right now.', 'err');
    }
  }

  async function fetchRecommendations(track) {
    if (!track) return;
    const anchor = (track.author && track.author !== 'Unknown') ? track.author : track.title;
    if (!anchor || anchor === st.recAnchor) return;
    try {
      const res = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(anchor)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.results)) {
          const items = data.results
            .filter(t => t.id !== track.id)
            .slice(0, 8)
            .map(t => ({
              id: t.id,
              title: t.title,
              author: t.author || t.uploaderName || 'Recommended artist',
              thumbnail: t.thumbnail || `https://img.youtube.com/vi/${t.id}/mqdefault.jpg`
            }));
          if (items.length > 0) {
            st.recommendations = items;
            st.recAnchor = anchor;
            localStorage.setItem('sumic_recommendations', JSON.stringify(st.recommendations));
            localStorage.setItem('sumic_rec_anchor', anchor);
            if (st.tab === 'home') {
              renderHome();
            }
          }
        }
      }
    } catch (e) {
      console.warn('Recommendations fetch failed:', e);
    }
  }

  function onEnd(force = false) {
    st.playing = false; tickStop(); spin(false);
    localStorage.setItem('sumic_time', '0');
    if (!force && st.repeatMode === 'one') { yt.seekTo(0, true); yt.playVideo(); return; }
    let q = [...st.queue];
    if (st.shuffle && q.length > 1) {
      const i = Math.floor(Math.random() * q.length);
      const t = q.splice(i, 1)[0];
      play(t, q); return;
    }
    if (q.length > 0) { const t = q.shift(); play(t, q); return; }
    if (st.repeatMode === 'all' && st.hist.length > 0) {
      const all = [...st.hist, ...(st.track ? [st.track] : [])];
      st.hist = [];
      const first = all.shift();
      play(first, all); return;
    }
    setIcons(false);
  }

  /* ── PUBLIC API ── */
  const S = {
    async playQuery(query) {
      toast(`Loading ${query}…`, 'info');
      try {
        const res = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.results) && data.results.length > 0) {
            const first = data.results[0];
            const queue = data.results.slice(1).map(r => ({
              id: r.id,
              title: r.title,
              author: r.author || r.uploaderName || 'Trending',
              thumbnail: r.thumbnail || `https://img.youtube.com/vi/${r.id}/mqdefault.jpg`
            }));
            S.playTrack(
              first.id,
              first.title,
              first.author || first.uploaderName || 'Trending',
              first.thumbnail || `https://img.youtube.com/vi/${first.id}/mqdefault.jpg`,
              queue
            );
          } else {
            toast('No results found for this playlist.', 'err');
          }
        }
      } catch (e) {
        toast('Unable to fetch playlist tracks.', 'err');
      }
    },
    async importPlaylist() {
      const input = document.getElementById('importUrl');
      const link = (input?.value || '').trim();
      const btn = document.getElementById('importBtn');
      const status = document.getElementById('importStatus');

      if (!link) {
        toast('Paste a Spotify playlist link first', 'err');
        announce('Paste a Spotify playlist link first');
        return;
      }

      // Basic URL validation
      if (!link.includes('spotify.com/playlist') && !link.startsWith('spotify:playlist:')) {
        toast('Please paste a valid Spotify playlist link', 'err');
        return;
      }

      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right:6px"></i>Importing…';
      }
      if (status) {
        status.innerHTML = '<div class="import-summary"><i class="fas fa-compact-disc fa-spin" style="color:var(--primary);margin-right:8px"></i><span>Fetching tracks from Spotify…</span></div>';
      }

      try {
        const res = await fetch(`${API_BASE}/api/import-playlist`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: link }),
        });

        if (status) {
          status.innerHTML = '<div class="import-summary"><i class="fas fa-magnifying-glass fa-beat" style="color:var(--primary);margin-right:8px"></i><span>Searching YouTube for tracks…</span></div>';
        }

        const raw = await res.text();
        let data = {};
        try {
          data = raw ? JSON.parse(raw) : {};
        } catch {
          data = { error: raw || 'Unable to import playlist' };
        }

        if (!res.ok || data.error) {
          throw new Error(data.error || 'Unable to import playlist');
        }

        st.importedPlaylist = data.playlist;
        renderImportedPlaylist();
        S.renderPlaylists();
        S.tab('imported');
        toast(`Imported "${data.playlist.title}" — ${data.playlist.tracks.length} tracks`, 'ok');
        announce(`Imported ${data.playlist.title}`);
      } catch (e) {
        toast(e.message || 'Import failed', 'err');
        announce('Import failed');
        if (status) {
          status.innerHTML = `<div class="import-summary" style="color:#ef4444"><i class="fas fa-circle-exclamation" style="margin-right:8px"></i><span>${esc(e.message || 'Import failed')}</span></div>`;
        }
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = 'Import';
        }
      }
    },

    playImported(index) {
      const playlist = st.importedPlaylist;
      if (!playlist?.tracks?.[index]) return;
      const track = playlist.tracks[index];
      const rest = playlist.tracks.slice(index + 1).map(item => ({
        id: item.id,
        title: item.title,
        author: item.author,
        thumbnail: item.thumbnail,
      }));
      play({ id: track.id, title: track.title, author: track.author, thumbnail: track.thumbnail }, rest);
      announce(`Playing ${track.title}`);
    },

    toggleLike(id, title, author, thumbnail, duration = null) {
      const track = { id, title, author, thumbnail, duration };
      const existing = st.liked.findIndex(item => item.id === id);
      if (existing >= 0) st.liked.splice(existing, 1);
      else st.liked.unshift(track);
      persistLiked();
      renderLiked();
      if (st.results.length) renderResults(st.results, st.query);
      toast(existing >= 0 ? 'Removed from liked songs' : 'Added to liked songs', 'ok');
    },

    playTrack(id, title, author, thumbnail, queue = [], duration = null) {
      const track = { id, title, author, thumbnail, duration };
      play(track, queue);
      announce(`Playing ${title}`);
    },

    openAccount() {
      if (confirm('Are you sure you want to log out?')) {
        localStorage.removeItem('sumic_user');
        // Fluid page-leave transition
        const app = document.getElementById('app');
        if (app) app.classList.add('leaving');
        if (window.triggerPageTransition) {
          window.triggerPageTransition('login.html');
        } else {
          setTimeout(() => { window.location.href = 'login.html'; }, 420);
        }
      }
    },

    addToQueue(id, title, author, thumbnail, duration = null) {
      const track = { id, title, author, thumbnail, duration };
      st.queue.push(track);
      persistTrackAndQueue();
      updQueue(); updQBadge(); updFPQueue(); renderPlaylistDrawer();
      toast(`Queued “${title}”`, 'ok');
    },

    togglePlaylistDrawer() {
      const drawer = document.getElementById('playlistDrawer');
      if (!drawer) return;
      drawer.classList.toggle('open');
      if (drawer.classList.contains('open')) renderPlaylistDrawer();
    },

    closePlaylistDrawer() {
      document.getElementById('playlistDrawer')?.classList.remove('open');
    },

    playDrawerItem(index) {
      const item = st.queue[index];
      if (!item) return;
      const rest = st.queue.slice(index + 1);
      st.queue = rest;
      play(item, rest);
      renderPlaylistDrawer();
      S.closePlaylistDrawer();
    },

    toggleTheme() {
      st.theme = st.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('sumic_theme', st.theme);
      applyTheme();
      toast(`Switched to ${st.theme} mode`, 'ok');
    },

    playLiked(index) {
      const track = st.liked[index];
      if (!track) return;
      play(track, []);
      announce(`Playing ${track.title}`);
    },

    removeLiked(index) {
      st.liked.splice(index, 1);
      persistLiked();
      renderLiked();
      toast('Removed from liked songs', 'ok');
    },
    tab(name) {
      st.tab = name;
      document.querySelectorAll('.pane').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.getElementById(`pane-${name}`)?.classList.add('active');
      const activeBtn = document.querySelector(`.tab-btn[data-tab="${name}"]`);
      document.querySelectorAll('.tab-btn').forEach(btn => {
        const isActive = btn === activeBtn;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-current', isActive ? 'page' : 'false');
      });
      if (name === 'search') setTimeout(() => document.getElementById('searchQ')?.focus(), 80);
      announce(`${name.charAt(0).toUpperCase() + name.slice(1)} view opened`);
    },

    async search(override) {
      let q = override;
      if (!q) {
        const hq = document.getElementById('heroQ');
        const sq = document.getElementById('searchQ');
        const active = document.activeElement?.id === 'heroQ' ? hq : sq;
        q = (active?.value || hq?.value || sq?.value || '').trim();
      }
      q = q.trim();
      if (!q) return;
      S.tab('search');
      const sq = document.getElementById('searchQ');
      if (sq) { sq.value = q; const xBtn = document.getElementById('xBtn'); if (xBtn) xBtn.style.display = 'flex'; }
      const hero = document.getElementById('heroQ');
      if (hero) hero.value = q;
      st.query = q;
      addRecent(q);
      loading(true);
      try {
        announce(`Searching for ${q}`);
        const r = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(q)}`);
        const d = await r.json();
        loading(false);
        if (d.error || !d.results?.length) { renderResults([], q); toast(d.error || `No results for "${q}"`, 'err'); announce(`No results for ${q}`); return; }
        st.results = d.results;
        renderResults(d.results, q);
        const first = d.results[0], rest = d.results.slice(1);
        play({ id: first.id, title: first.title, author: first.author, thumbnail: first.thumbnail },
             rest.map(x => ({ id: x.id, title: x.title, author: x.author, thumbnail: x.thumbnail })));
        announce(`Playing ${first.title}`);
      } catch(e) { loading(false); toast('Search failed: ' + e.message, 'err'); announce('Search failed'); }
    },

    quick(q) { document.getElementById('heroQ').value = q; S.search(q); },

    syncInputs(val, from) {
      const xBtn = document.getElementById('xBtn');
      if (xBtn) xBtn.style.display = val ? 'flex' : 'none';
      if (from === 'hero') { const s = document.getElementById('searchQ'); if (s) s.value = val; }
      else { const h = document.getElementById('heroQ'); if (h) h.value = val; }
    },

    clearSearch() {
      document.getElementById('searchQ').value = '';
      document.getElementById('xBtn').style.display = 'none';
      document.getElementById('results').innerHTML = '<div class="empty-hint"><i class="fas fa-music"></i><p>Start typing to find music</p></div>';
      st.results = [];
    },

    playAt(i) {
      if (!st.results[i]) return;
      const t = st.results[i];
      const rest = [...st.results.slice(i+1), ...st.results.slice(0,i)];
      play({ id:t.id, title:t.title, author:t.author, thumbnail:t.thumbnail },
           rest.map(x => ({ id:x.id, title:x.title, author:x.author, thumbnail:x.thumbnail })));
    },

    pp() {
      if (!yt || !ytOk) return;
      try {
        const isPlaying = yt.getPlayerState() === YT.PlayerState.PLAYING;
        userInitiatedPause = isPlaying;
        if (isPlaying) {
          yt.pauseVideo();
          pauseSilentAudio();
        } else {
          playSilentAudio();
          yt.playVideo();
        }
      } catch(e){}
    },

    prev() {
      if (!yt || !ytOk) return;
      try { if (yt.getCurrentTime() > 3) { yt.seekTo(0, true); return; } } catch(e) {}
      if (st.hist.length > 0) {
        const prev = st.hist.pop();
        if (st.track) st.queue.unshift(st.track);
        const q = [...st.queue];
        st.hist.pop(); // will be re-pushed by play()
        play(prev, q);
      } else { try { yt.seekTo(0, true); } catch(e) {} }
    },

    next() { onEnd(true); },

    seekMini(e) {
      if (!yt || !ytOk) return;
      const bar = document.getElementById('npProg'); if (!bar) return;
      const dur = yt.getDuration() || 0; if (!dur) return;
      const rc = bar.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rc.left) / rc.width));
      yt.seekTo(pct * dur, true);
    },

    seekFull(e) {
      if (!yt || !ytOk) return;
      const bar = document.getElementById('fpBar'); if (!bar) return;
      const dur = yt.getDuration() || 0; if (!dur) return;
      const rc = bar.getBoundingClientRect();
      yt.seekTo(((e.clientX - rc.left) / rc.width) * dur, true);
    },

    vol(v) {
      const next = parseFloat(v);
      if (Number.isFinite(next)) st.vol = Math.max(0, Math.min(1, next));
      if (st.vol <= 0) {
        st.muted = true;
      } else if (st.muted) {
        st.muted = false;
      }
      if (yt && ytOk) {
        try {
          yt.setVolume(st.vol * 100);
          if (st.muted) yt.mute(); else yt.unMute();
        } catch (e) {}
      }
      localStorage.setItem('sumic_vol', st.vol);
      const s = document.getElementById('volRange');
      if (s) {
        s.value = st.vol;
        s.style.setProperty('--vol-pct', Math.round(st.vol * 100) + '%');
      }
      updVolIcon();
    },

    mute() {
      const s = document.getElementById('volRange');
      if (st.muted) {
        st.muted = false;
        st.vol = st.lastVol > 0 ? st.lastVol : Math.max(0.1, st.vol);
        if (yt && ytOk) {
          try { yt.unMute(); yt.setVolume(st.vol * 100); } catch (e) {}
        }
      } else {
        st.lastVol = st.vol > 0 ? st.vol : (st.lastVol > 0 ? st.lastVol : 0.8);
        st.muted = true;
        st.vol = 0;
        if (yt && ytOk) {
          try { yt.mute(); yt.setVolume(0); } catch (e) {}
        }
      }
      if (s) {
        s.value = st.vol;
        s.style.setProperty('--vol-pct', Math.round(st.vol * 100) + '%');
      }
      localStorage.setItem('sumic_vol', st.vol);
      updVolIcon();
    },

    shuffle() {
      st.shuffle = !st.shuffle;
      ['shuffleBtn', 'npShuffleBtn'].forEach(id => {
        document.getElementById(id)?.classList.toggle('active', st.shuffle);
      });
      toast(`Shuffle ${st.shuffle ? 'on' : 'off'}`, 'ok');
    },

    repeat() {
      const modes = ['off', 'all', 'one'];
      st.repeatMode = modes[(modes.indexOf(st.repeatMode) + 1) % 3];
      const innerHtml = st.repeatMode === 'one'
        ? '<i class="fas fa-repeat-1" style="font-size:11px"></i>'
        : '<i class="fas fa-repeat"></i>';
      ['repeatBtn', 'npRepeatBtn'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
          btn.classList.toggle('active', st.repeatMode !== 'off');
          btn.innerHTML = innerHtml;
        }
      });
      toast({ off:'Repeat off', all:'Repeat all', one:'Repeat one' }[st.repeatMode], 'ok');
    },

    expand() {
      st.expanded = !st.expanded;
      document.getElementById('fullplayer')?.classList.toggle('open', st.expanded);
      document.getElementById('npbar')?.classList.toggle('hide', st.expanded);
      const b = document.getElementById('expandBtn');
      if (b) b.innerHTML = `<i class="fas fa-chevron-${st.expanded ? 'down' : 'up'}"></i>`;
      if (st.expanded) {
        S.closePlaylistDrawer();
        setTimeout(scrollActiveLyricToCenter, 100);
      }
      announce(st.expanded ? 'Player expanded' : 'Player collapsed');
    },

    fpTab(mode) {
      const content = document.getElementById('fpContent');
      const songBtn = document.getElementById('fpTabSong');
      const lyricBtn = document.getElementById('fpTabLyric');
      if (!content) return;
      if (mode === 'lyric') {
        content.classList.add('lyric-mode');
        songBtn?.classList.remove('active');
        lyricBtn?.classList.add('active');
        setTimeout(scrollActiveLyricToCenter, 100);
      } else {
        content.classList.remove('lyric-mode');
        songBtn?.classList.add('active');
        lyricBtn?.classList.remove('active');
      }
    },

    clearQueue() {
      st.queue = [];
      persistTrackAndQueue();
      updQueue(); updQBadge(); updFPQueue();
    },

    toggleSidebar() {
      // Sidebar is now purely hover-controlled in CSS
    },

    playFromQueue(i) {
      if (i >= st.queue.length) return;
      const t = st.queue[i], rest = st.queue.slice(i+1);
      st.queue = rest;
      play(t, rest);
    },

    rmQueue(i) {
      st.queue.splice(i, 1);
      persistTrackAndQueue();
      updQueue(); updQBadge(); updFPQueue();
    },

    renderPlaylists() {
      const grid = document.getElementById('myPlaylistsGrid');
      if (!grid) return;
      if (!st.playlists.length) {
        grid.innerHTML = '<div class="page-empty"><i class="fas fa-music"></i><p>No playlists available.</p></div>';
        return;
      }
      grid.innerHTML = st.playlists.map(playlist => `
        <article class="music-card" onclick="S.viewPlaylist('${playlist.id}', 'playlist')">
          <div class="card-icon" style="background: ${playlist.type === 'imported' ? 'linear-gradient(135deg, var(--primary), var(--accent-cool))' : 'rgba(255,255,255,0.06)'}; color: ${playlist.type === 'imported' ? '#000' : 'var(--primary)'}; width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; margin-bottom: 12px;">
            <i class="fas ${playlist.type === 'imported' ? 'fa-file-import' : 'fa-list'}"></i>
          </div>
          <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 4px;">${esc(playlist.title)}</h3>
          <p style="color: var(--t2); font-size: 0.85rem;">${playlist.tracks.length} tracks • ${esc(playlist.owner || 'User')}</p>
          ${playlist.type === 'imported' ? '<span class="playlist-badge" style="font-size: 10px; background: rgba(29, 185, 84, 0.2); color: var(--primary); padding: 2px 6px; border-radius: 4px; font-weight: bold; margin-top: 8px; display: inline-block;">Imported</span>' : ''}
        </article>
      `).join('');
    },

    viewPlaylist(playlistId, originTab) {
      st.activePlaylistId = playlistId;
      const playlist = st.playlists.find(p => p.id === playlistId);
      if (!playlist) return;

      const listContainer = document.getElementById('playlistListContainer');
      const detailContainer = document.getElementById('playlistDetailContainer');
      if (!listContainer || !detailContainer) return;

      listContainer.style.display = 'none';
      detailContainer.style.display = 'block';

      detailContainer.innerHTML = `
        <div class="playlist-detail-header" style="margin-bottom: 20px;">
          <button class="ghost-btn" onclick="S.backToPlaylists()" style="margin-bottom: 15px; padding: 6px 12px; font-size: 0.88rem; display: inline-flex; align-items: center; gap: 6px;"><i class="fas fa-arrow-left"></i> Back to Playlists</button>
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 15px; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 15px;">
              <div class="import-playlist-badge" style="width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: ${playlist.type === 'imported' ? 'linear-gradient(135deg, var(--primary), var(--accent-cool))' : 'linear-gradient(135deg, #4f46e5, #6366f1)'}; color: #000; font-size: 20px;">
                <i class="fas ${playlist.type === 'imported' ? 'fa-file-import' : 'fa-music'}"></i>
              </div>
              <div>
                <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                  <h2 id="detailPlaylistTitle" style="font-size: 1.6rem; font-weight: 800; margin: 0; color: var(--t1);">${esc(playlist.title)}</h2>
                  <button class="ghost-btn" onclick="S.startRenamePlaylist('${playlist.id}', 'playlist')" style="padding: 4px 8px; font-size: 11px; display: inline-flex; align-items: center; gap: 4px;"><i class="fas fa-edit"></i> Rename</button>
                  ${playlist.type === 'imported' ? `<button class="danger-btn" onclick="S.deletePlaylist('${playlist.id}', 'playlist')" style="padding: 4px 8px; font-size: 11px; border-radius: 8px; display: inline-flex; align-items: center; gap: 4px;"><i class="fas fa-trash"></i> Delete</button>` : ''}
                </div>
                <p style="color: var(--t2); font-size: 0.88rem; margin: 5px 0 0;">${playlist.tracks.length} tracks • Created by ${esc(playlist.owner || 'User')}</p>
              </div>
            </div>
            <div>
              <button class="go-btn" onclick="S.playPlaylist('${playlist.id}')" style="display: flex; align-items: center; gap: 8px; padding: 12px 24px; font-size: 0.95rem;"><i class="fas fa-play"></i> Play All</button>
            </div>
          </div>
          
          <!-- Rename inline form (hidden by default) -->
          <div id="renameFormContainer-${playlist.id}" class="import-panel" style="display: none; margin-top: 15px; padding: 12px; border: 1px solid rgba(255,255,255,0.08);">
            <label class="import-label">Rename Playlist</label>
            <div class="import-field" style="max-width: 400px; display: flex; gap: 8px;">
              <input type="text" id="renameInput-${playlist.id}" value="${esc(playlist.title)}" style="padding: 8px 12px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: var(--t1); flex: 1; outline: none;">
              <button class="go-btn" onclick="S.saveRenamePlaylist('${playlist.id}', 'playlist')">Save</button>
              <button class="danger-btn" onclick="S.cancelRenamePlaylist('${playlist.id}', 'playlist')" style="padding: 8px 12px; border-radius: 8px;">Cancel</button>
            </div>
          </div>
        </div>

        <div class="import-track-list" style="margin-top: 20px;">
          ${playlist.tracks.map((track, idx) => `
            <div class="import-track-item" onclick="S.playTrackFromPlaylist('${playlist.id}', ${idx})" style="display: flex; align-items: center; padding: 10px; border-radius: 12px; background: rgba(255,255,255,0.02); margin-bottom: 8px; cursor: pointer; justify-content: space-between; transition: background 0.2s;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <div class="import-track-art" style="width: 40px; height: 40px; border-radius: 8px; overflow: hidden; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.05);">${track.thumbnail ? `<img src="${track.thumbnail}" alt="" loading="lazy" style="width: 100%; height: 100%; object-fit: cover;">` : '<i class="fas fa-music"></i>'}</div>
                <div class="import-track-meta">
                  <div class="import-track-title" style="font-weight: 600; color: var(--t1); font-size: 0.95rem;">${esc(track.title)}</div>
                  <div class="import-track-author" style="color: var(--t2); font-size: 0.85rem; margin-top: 2px;">${esc(track.author || 'Playlist track')}</div>
                </div>
              </div>
              <button class="mini-play" type="button" onclick="event.stopPropagation();S.playTrackFromPlaylist('${playlist.id}', ${idx})" style="width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--primary); border: none; color: #000; cursor: pointer;"><i class="fas fa-play" style="font-size: 11px;"></i></button>
            </div>
          `).join('')}
        </div>
      `;
    },

    backToPlaylists() {
      st.activePlaylistId = null;
      const listContainer = document.getElementById('playlistListContainer');
      const detailContainer = document.getElementById('playlistDetailContainer');
      if (listContainer && detailContainer) {
        listContainer.style.display = 'block';
        detailContainer.style.display = 'none';
      }
      S.renderPlaylists();
    },

    viewImportedPlaylist(playlistId) {
      st.activeImportedPlaylistId = playlistId;
      renderImportedPlaylist();
    },

    backToImportedPlaylists() {
      st.activeImportedPlaylistId = null;
      renderImportedPlaylist();
    },

    startRenamePlaylist(playlistId, type) {
      let containerId = '';
      let inputId = '';
      if (type === 'imported') {
        containerId = `renameFormContainer-list-${playlistId}`;
        inputId = `renameInput-list-${playlistId}`;
      } else if (type === 'imported-detail') {
        containerId = `renameFormContainer-imported-detail-${playlistId}`;
        inputId = `renameInput-imported-detail-${playlistId}`;
      } else {
        containerId = `renameFormContainer-${playlistId}`;
        inputId = `renameInput-${playlistId}`;
      }
      const el = document.getElementById(containerId);
      if (el) {
        el.style.display = 'block';
        const input = document.getElementById(inputId);
        input?.focus();
      }
    },

    cancelRenamePlaylist(playlistId, type) {
      let containerId = '';
      if (type === 'imported') {
        containerId = `renameFormContainer-list-${playlistId}`;
      } else if (type === 'imported-detail') {
        containerId = `renameFormContainer-imported-detail-${playlistId}`;
      } else {
        containerId = `renameFormContainer-${playlistId}`;
      }
      const el = document.getElementById(containerId);
      if (el) el.style.display = 'none';
    },

    saveRenamePlaylist(playlistId, origin) {
      let inputId = '';
      if (origin === 'imported-list') {
        inputId = `renameInput-list-${playlistId}`;
      } else if (origin === 'imported-detail') {
        inputId = `renameInput-imported-detail-${playlistId}`;
      } else {
        inputId = `renameInput-${playlistId}`;
      }
      const input = document.getElementById(inputId);
      const newTitle = (input?.value || '').trim();
      if (!newTitle) {
        toast('Playlist title cannot be empty', 'err');
        return;
      }

      const playlist = st.playlists.find(p => p.id === playlistId);
      if (playlist) {
        playlist.title = newTitle;
        localStorage.setItem('sumic_playlists', JSON.stringify(st.playlists));
        toast('Playlist renamed', 'ok');
        
        if (origin === 'playlist') {
          S.viewPlaylist(playlistId, 'playlist');
        } else if (origin === 'imported-detail') {
          st.activeImportedPlaylistId = playlistId;
          renderImportedPlaylist();
        } else {
          st.activeImportedPlaylistId = null;
          renderImportedPlaylist();
        }
        S.renderPlaylists();
      }
    },

    deletePlaylist(playlistId, origin) {
      if (!confirm('Are you sure you want to delete this playlist?')) return;
      const idx = st.playlists.findIndex(p => p.id === playlistId);
      if (idx >= 0) {
        st.playlists.splice(idx, 1);
        localStorage.setItem('sumic_playlists', JSON.stringify(st.playlists));
        toast('Playlist deleted', 'ok');
        
        if (origin === 'playlist') {
          S.backToPlaylists();
        } else {
          st.activeImportedPlaylistId = null;
          renderImportedPlaylist();
        }
        S.renderPlaylists();
      }
    },

    playPlaylist(playlistId, startIdx = 0) {
      const playlist = st.playlists.find(p => p.id === playlistId);
      if (!playlist || !playlist.tracks || playlist.tracks.length === 0) return;
      
      const track = playlist.tracks[startIdx];
      const rest = playlist.tracks.slice(startIdx + 1).map(item => ({
        id: item.id || item.videoId,
        title: item.title,
        author: item.author || item.artist,
        thumbnail: item.thumbnail,
        duration: item.duration
      }));
      
      play({ id: track.id || track.videoId, title: track.title, author: track.author || track.artist, thumbnail: track.thumbnail, duration: track.duration }, rest);
      announce(`Playing playlist ${playlist.title}`);
    },

    playTrackFromPlaylist(playlistId, idx) {
      S.playPlaylist(playlistId, idx);
    },
  };

  window.S = S;

  /* ── TICK ── */
  function tickStart() {
    tickStop();
    st.timer = setInterval(() => {
      if (!yt || !yt.getDuration) return;
      let cur = 0;
      try { cur = yt.getCurrentTime() || 0; } catch (e) {}
      let dur = 0;
      try { dur = yt.getDuration() || 0; } catch (e) {}

      // Fallback to track duration if player returns 0
      if (!dur && st.track && st.track.duration) {
        if (typeof st.track.duration === 'number') {
          dur = st.track.duration;
        } else if (typeof st.track.duration === 'string') {
          const parts = st.track.duration.split(':');
          if (parts.length === 2) {
            dur = parseInt(parts[0]) * 60 + parseInt(parts[1]);
          } else {
            dur = parseInt(st.track.duration) || 0;
          }
        }
      }

      if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession && dur > 0) {
        try {
          navigator.mediaSession.setPositionState({
            duration: Math.max(dur, cur),
            playbackRate: 1,
            position: cur
          });
        } catch (e) {}
      }

      const pct = dur ? (cur / dur) * 100 : 0;
      const nf = document.getElementById('npFill'), ff = document.getElementById('fpFill');
      syncLyrics(cur);
      if (nf) nf.style.width = pct + '%';
      if (ff) ff.style.width = pct + '%';
      const fc = document.getElementById('fpCur'), fd = document.getElementById('fpDur');
      if (fc) fc.textContent = fmt(cur);
      if (fd) fd.textContent = fmt(dur);
      const nc = document.getElementById('npCur'), nd = document.getElementById('npDur');
      if (nc) nc.textContent = fmt(cur);
      if (nd) nd.textContent = fmt(dur);

      localStorage.setItem('sumic_time', cur);

      // Set progress degrees for vinyl card outline progress circle
      const deg = (pct / 100) * 360;
      const card = document.querySelector('.fp-vinyl-card');
      if (card) {
        card.style.setProperty('--progress-deg', deg + 'deg');
      }
    }, 500);
  }
  function tickStop() { if (st.timer) { clearInterval(st.timer); st.timer = null; } }

  /* ── SPIN ── */
  function spin(on) {
    // Update to use new animation class name
    document.getElementById('fpDisc')?.classList.toggle('spin', on);
    document.getElementById('npThumb')?.classList.toggle('spin', on);
    
    // Add playing class to premium play buttons for pulsing animation (Task 4.2)
    const fpPlay = document.getElementById('fpPlay');
    if (fpPlay) fpPlay.classList.toggle('playing', on);

    const npPlay = document.getElementById('npPlay');
    if (npPlay) npPlay.classList.toggle('playing', on);
  }

  /* ── ICONS ── */
  function setIcons(playing) {
    const ic = playing ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
    const np = document.getElementById('npPlay'), fp = document.getElementById('fpPlay');
    if (np) np.innerHTML = ic;
    if (fp) fp.innerHTML = ic;
  }

  function updVolIcon() {
    const muted = st.muted || (yt && ytOk && (() => {
      try { return yt.isMuted(); } catch (e) { return false; }
    })());
    const low = muted || st.vol < .01;
    const iconHtml = `<i class="fas fa-volume-${low ? 'xmark' : st.vol < .5 ? 'low' : 'high'}"></i>`;
    
    // Update both volume buttons
    ['volBtn', 'npVolBtn'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.innerHTML = iconHtml;
        btn.classList.toggle('muted', low);
      }
    });

    // Update both volume range inputs
    ['volRange', 'npVolRange'].forEach(id => {
      const volRng = document.getElementById(id);
      if (volRng) {
        const pct = low ? 0 : Math.round(st.vol * 100);
        volRng.style.setProperty('--vol-pct', pct + '%');
        volRng.value = low ? 0 : st.vol;
      }
    });
  }
  /* ── BAR / FULL PLAYER ── */
  function updBar(t) {
    document.getElementById('npTitle').textContent = t.title || 'Unknown';
    document.getElementById('npArt').textContent   = t.author || '--';
    
    // Update initial duration from track metadata immediately
    const durationText = t.duration ? fmtDur(t.duration) : '0:00';
    const nd = document.getElementById('npDur');
    if (nd) nd.textContent = durationText;

    const th = document.getElementById('npThumb');
    if (!th) return;

    if (t.thumbnail) {
      // Show shimmer loading placeholder while image loads (Req 15.5)
      th.classList.add('loading');
      th.innerHTML = '';

      const img = new Image();
      img.alt = '';
      img.onload = () => {
        th.classList.remove('loading');
        th.innerHTML = '';
        th.appendChild(img);
        // Trigger CSS fade-in transition after inserting into DOM
        requestAnimationFrame(() => img.classList.add('loaded'));
      };
      img.onerror = () => {
        th.classList.remove('loading');
        th.innerHTML = '<i class="fas fa-music"></i>';
      };
      img.src = t.thumbnail;
    } else {
      th.classList.remove('loading');
      th.innerHTML = '<i class="fas fa-music"></i>';
    }
  }

  function updFull(t) {
    document.getElementById('fpTitle').textContent = t.title || 'Unknown';
    document.getElementById('fpArt').textContent   = t.author || '--';
    
    // Update initial duration from track metadata immediately
    const durationText = t.duration ? fmtDur(t.duration) : '0:00';
    const fd = document.getElementById('fpDur');
    if (fd) fd.textContent = durationText;

    renderLyrics();

    // Update vinyl center art
    const centerArt = document.getElementById('fpCenterArt');
    if (centerArt) centerArt.innerHTML = t.thumbnail
      ? `<img src="${t.thumbnail}" alt="" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-music\\'></i>'">`
      : '<i class="fas fa-music"></i>';

    // Update bar thumb
    const barThumb = document.getElementById('fpBarThumb');
    if (barThumb) barThumb.innerHTML = t.thumbnail
      ? `<img src="${t.thumbnail}" alt="" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-music\\'></i>'">`
      : '<i class="fas fa-music"></i>';

    // Background
    const bg = document.getElementById('fpBg');
    if (bg && t.thumbnail) bg.style.backgroundImage = `url(${t.thumbnail})`;
  }

  /* ── QUEUE ── */
  function updQueue() {
    const el = document.getElementById('queueList'); if (!el) return;
    if (!st.queue.length) {
      el.innerHTML = '<div class="empty-hint"><i class="fas fa-music"></i><p>Queue is empty</p><span>Search for songs to add them</span></div>';
    } else {
      el.innerHTML = st.queue.map((t, i) => `
        <div class="q-item" onclick="S.playFromQueue(${i})">
          <div class="q-thumb">${t.thumbnail ? `<img src="${t.thumbnail}" alt="" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-music\\'></i>'">` : '<i class="fas fa-music"></i>'}</div>
          <div class="q-info"><div class="q-title">${esc(t.title)}</div><div class="q-by">${esc(t.author||'--')}</div></div>
          <button class="q-rm" onclick="event.stopPropagation();S.rmQueue(${i})"><i class="fas fa-times"></i></button>
        </div>`).join('');
    }
    updQBadge();
    renderPlaylistDrawer();
  }

  function updQBadge() {
    const b = document.getElementById('qBadge'); if (!b) return;
    if (st.queue.length) { b.textContent = st.queue.length > 99 ? '99+' : st.queue.length; b.classList.add('show'); }
    else b.classList.remove('show');
  }

  function updFPQueue() {
    const wrap = document.getElementById('fpUpnext'), items = document.getElementById('fpQueue');
    if (!wrap || !items) return;
    const next3 = st.queue.slice(0, 3);
    if (!next3.length) { wrap.style.display = 'none'; return; }
    wrap.style.display = 'block';
    items.innerHTML = next3.map((t, i) => `
      <div class="fp-q-item" onclick="S.playFromQueue(${i})">
        <div class="fp-qt">${t.thumbnail ? `<img src="${t.thumbnail}" alt="" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-music\\'></i>'">` : '<i class="fas fa-music"></i>'}</div>
        <div class="fp-qi"><div class="fp-qn">${esc(t.title)}</div><div class="fp-qa">${esc(t.author||'--')}</div></div>
      </div>`).join('');
  }

  /* ── RESULTS ── */
  function renderResults(res, q) {
    const el = document.getElementById('results'); if (!el) return;
    if (!res.length) { el.innerHTML = `<div class="empty-hint"><i class="fas fa-circle-exclamation"></i><p>No results for "${esc(q)}"</p></div>`; return; }

    const artistName = (res[0]?.author || '').split(' - ')[0] || res[0]?.author || q;
    const artistCatalog = homeData.artists.find(a => a.name.toLowerCase() === artistName.toLowerCase() || q.toLowerCase().includes(a.name.toLowerCase()));
    const artistSongs = artistCatalog?.songs?.slice(0, 4) || homeData.trending.slice(0, 4).map(item => ({ title: item.title, videoId: item.videoId, author: item.artist }));
    const artistCard = artistCatalog || artistName
      ? `
        <div class="artist-spotlight">
          <div class="artist-spotlight-copy">
            <p class="sec-label">Artist spotlight</p>
            <h3>${esc(artistCatalog?.name || artistName)}</h3>
            <p>${esc(artistCatalog?.bio || `More songs from ${artistName}`)}</p>
          </div>
          <div class="artist-song-list">
            ${artistSongs.map(song => `
              <button class="artist-song-pill" onclick="event.stopPropagation();S.playTrack('${song.videoId || song.id || ''}','${quoteJs(song.title)}','${quoteJs(song.author || artistCatalog?.name || artistName)}','${quoteJs(thumbUrl(song.videoId || song.id || ''))}')">
                <span>${esc(song.title)}</span>
              </button>`).join('')}
          </div>
        </div>`
      : '';

    el.innerHTML = `
      <div class="res-count">${res.length} results for "<strong>${esc(q)}</strong>"</div>
      ${artistCard}
      <div class="res-list">
        ${res.map((r, i) => `
          <div class="res-item" data-vid="${r.id}" data-i="${i+1}" onclick="S.playAt(${i})">
            <span class="res-num">${i+1}</span>
            <div class="res-thumb">${r.thumbnail ? `<img src="${r.thumbnail}" alt="" loading="lazy" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-music\\'></i>'">` : '<i class="fas fa-music"></i>'}</div>
            <div class="res-info">
              <div class="res-title">${esc(r.title)}</div>
              <div class="res-by">${esc(r.author||'')}${r.duration ? ' • ' + fmtDur(r.duration) : ''}</div>
            </div>
            <div class="res-actions">
              <button class="res-play" onclick="event.stopPropagation();S.playAt(${i})"><i class="fas fa-play"></i></button>
              <button class="res-queue" onclick="event.stopPropagation();S.addToQueue('${r.id}','${quoteJs(r.title)}','${quoteJs(r.author||'')}','${quoteJs(r.thumbnail||'')}','${r.duration || ''}')"><i class="fas fa-plus"></i></button>
              <button class="res-like ${isLiked(r.id) ? 'active' : ''}" onclick="event.stopPropagation();S.toggleLike('${r.id}','${quoteJs(r.title)}','${quoteJs(r.author||'')}','${quoteJs(r.thumbnail||'')}','${r.duration || ''}')"><i class="fas fa-heart"></i></button>
            </div>
          </div>`).join('')}
      </div>`;
  }

  function markNow(vid) {
    document.querySelectorAll('.res-item').forEach(el => {
      const isNow = el.dataset.vid === vid;
      el.classList.toggle('now', isNow);
      const num = el.querySelector('.res-num');
      if (num) num.innerHTML = isNow ? '<i class="fas fa-volume-high" style="font-size:9px;color:var(--rs)"></i>' : el.dataset.i;
    });
  }

  /* ── RECENT ── */
  function addRecent(q) {
    let r = st.recent.filter(x => x.toLowerCase() !== q.toLowerCase());
    r.unshift(q); r = r.slice(0, 10);
    st.recent = r;
    localStorage.setItem('sumic_recent', JSON.stringify(r));
    renderRecent();
  }

  function renderRecent() {
    const wrap = document.getElementById('recentWrap'), chips = document.getElementById('recentChips');
    if (!wrap || !chips) return;
    if (!st.recent.length) { wrap.style.display = 'none'; return; }
    wrap.style.display = 'block';
    chips.innerHTML = st.recent.map(q => `
      <button class="chip" onclick="S.quick('${esc(q).replace(/'/g, "\\'")}')">
        <i class="fas fa-clock-rotate-left" style="font-size:10px;margin-right:5px"></i>${esc(q)}
      </button>`).join('');
  }

  function thumbUrl(videoId) {
    return videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : '';
  }

  function renderLiked() {
    const wrap = document.getElementById('likedResults');
    if (!wrap) return;

    if (!st.liked.length) {
      wrap.innerHTML = `
        <div class="page-empty">
          <i class="fas fa-heart"></i>
          <p>You haven’t liked any songs yet.</p>
          <span>Tap the heart on a result to save it here.</span>
        </div>`;
      return;
    }

    wrap.innerHTML = `
      <div class="liked-list">
        ${st.liked.map((track, index) => `
          <div class="import-track-item" onclick="S.playLiked(${index})">
            <div class="import-track-art">${track.thumbnail ? `<img src="${track.thumbnail}" alt="" loading="lazy">` : '<i class="fas fa-music"></i>'}</div>
            <div class="import-track-meta">
              <div class="import-track-title">${esc(track.title)}</div>
              <div class="import-track-author">${esc(track.author || 'Liked song')}</div>
            </div>
            <div class="res-actions">
              <button class="res-play" type="button" onclick="event.stopPropagation();S.playLiked(${index})"><i class="fas fa-play"></i></button>
              <button class="res-queue" type="button" onclick="event.stopPropagation();S.addToQueue('${track.id}','${quoteJs(track.title)}','${quoteJs(track.author||'')}','${quoteJs(track.thumbnail||'')}','${track.duration || ''}')"><i class="fas fa-plus"></i></button>
              <button class="res-like active" type="button" onclick="event.stopPropagation();S.removeLiked(${index})"><i class="fas fa-heart"></i></button>
            </div>
          </div>`).join('')}
      </div>`;
  }

  function renderImportedPlaylist() {
    const wrap = document.getElementById('importResults');
    const status = document.getElementById('importStatus');
    if (!wrap) return;

    const importedPlaylists = st.playlists.filter(p => p.type === 'imported');

    if (importedPlaylists.length === 0) {
      wrap.innerHTML = `
        <div class="page-empty">
          <i class="fas fa-file-import"></i>
          <p>No playlists imported yet.</p>
          <span>Paste a Spotify link to bring an album or playlist into your library.</span>
        </div>`;
      if (status) {
        status.innerHTML = '<div class="import-summary"><span>Paste a Spotify playlist link to get started.</span></div>';
      }
      return;
    }

    if (st.activeImportedPlaylistId) {
      const playlist = st.playlists.find(p => p.id === st.activeImportedPlaylistId);
      if (playlist) {
        if (status) {
          status.innerHTML = `
            <div class="import-summary">
              <strong>${esc(playlist.title)}</strong>
              <span>${esc(playlist.owner)} • ${playlist.tracks.length} tracks</span>
            </div>`;
        }

        wrap.innerHTML = `
          <div class="import-playlist-card">
            <button class="ghost-btn" onclick="S.backToImportedPlaylists()" style="margin-bottom: 15px; padding: 6px 12px; font-size: 0.88rem; display: inline-flex; align-items: center; gap: 6px;"><i class="fas fa-arrow-left"></i> Back to Imported Playlists</button>
            <div class="import-playlist-header" style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 15px; align-items: center;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <div class="import-playlist-badge" style="width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, var(--primary), var(--accent-cool)); color: #000; font-size: 20px;"><i class="fas fa-file-import"></i></div>
                <div>
                  <h3 id="importedDetailTitle" style="font-size: 1.3rem; margin: 0; color: var(--t1);">${esc(playlist.title)}</h3>
                  <p style="color: var(--t2); font-size: 0.85rem; margin-top: 4px;">${esc(playlist.owner)} • ${playlist.tracks.length} tracks</p>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <button class="go-btn" onclick="S.playPlaylist('${playlist.id}')" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px;"><i class="fas fa-play"></i> Play All</button>
                <button class="ghost-btn" onclick="S.startRenamePlaylist('${playlist.id}', 'imported-detail')" style="padding: 8px 12px;"><i class="fas fa-edit"></i> Rename</button>
              </div>
            </div>

            <!-- Inline rename form for detail view -->
            <div id="renameFormContainer-imported-detail-${playlist.id}" class="import-panel" style="display: none; margin-top: 15px; padding: 12px; border: 1px solid rgba(255,255,255,0.08);">
              <label class="import-label">Rename Playlist</label>
              <div class="import-field" style="max-width: 400px; display: flex; gap: 8px;">
                <input type="text" id="renameInput-imported-detail-${playlist.id}" value="${esc(playlist.title)}" style="padding: 8px 12px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: var(--t1); flex: 1; outline: none;">
                <button class="go-btn" onclick="S.saveRenamePlaylist('${playlist.id}', 'imported-detail')">Save</button>
                <button class="danger-btn" onclick="S.cancelRenamePlaylist('${playlist.id}', 'imported-detail')" style="padding: 8px 12px; border-radius: 8px;">Cancel</button>
              </div>
            </div>

            <div class="import-track-list" style="margin-top: 20px;">
              ${playlist.tracks.map((track, index) => `
                <div class="import-track-item" onclick="S.playTrackFromPlaylist('${playlist.id}', ${index})" style="display: flex; align-items: center; padding: 10px; border-radius: 12px; background: rgba(255,255,255,0.02); margin-bottom: 8px; cursor: pointer; justify-content: space-between; transition: background 0.2s;">
                  <div style="display: flex; align-items: center; gap: 12px;">
                    <div class="import-track-art" style="width: 40px; height: 40px; border-radius: 8px; overflow: hidden; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.05);">${track.thumbnail ? `<img src="${track.thumbnail}" alt="" loading="lazy" style="width: 100%; height: 100%; object-fit: cover;">` : '<i class="fas fa-music"></i>'}</div>
                    <div class="import-track-meta">
                      <div class="import-track-title" style="font-weight: 600; color: var(--t1); font-size: 0.95rem;">${esc(track.title)}</div>
                      <div class="import-track-author" style="color: var(--t2); font-size: 0.85rem; margin-top: 2px;">${esc(track.author || 'Spotify import')}</div>
                    </div>
                  </div>
                  <button class="mini-play" type="button" onclick="event.stopPropagation();S.playTrackFromPlaylist('${playlist.id}', ${index})" style="width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--primary); border: none; color: #000; cursor: pointer;"><i class="fas fa-play" style="font-size: 11px;"></i></button>
                </div>`).join('')}
            </div>
          </div>`;
        return;
      }
    }

    if (status) {
      status.innerHTML = `
        <div class="import-summary">
          <span>You have imported <strong>${importedPlaylists.length}</strong> playlist${importedPlaylists.length > 1 ? 's' : ''}.</span>
        </div>`;
    }

    wrap.innerHTML = `
      <div style="margin-top: 15px;">
        <h3 class="sec-label" style="margin-bottom: 12px;">My Imported Playlists</h3>
        <div class="dash-grid">
          ${importedPlaylists.map(playlist => `
            <article class="music-card" onclick="S.viewImportedPlaylist('${playlist.id}')" style="cursor: pointer; position: relative;">
              <div class="card-icon" style="background: linear-gradient(135deg, var(--primary), var(--accent-cool)); width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; margin-bottom: 12px;"><i class="fas fa-file-import" style="color: #000;"></i></div>
              <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 4px;">${esc(playlist.title)}</h3>
              <p style="color: var(--t2); font-size: 0.85rem;">${playlist.tracks.length} tracks • ${esc(playlist.owner || 'Spotify')}</p>
              <div style="display: flex; align-items: center; gap: 8px; margin-top: 12px;" onclick="event.stopPropagation();">
                <button class="mini-play" onclick="S.playPlaylist('${playlist.id}')" title="Play playlist" style="width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--primary); border: none; color: #000; cursor: pointer;"><i class="fas fa-play" style="font-size: 11px;"></i></button>
                <button class="ghost-btn" onclick="S.startRenamePlaylist('${playlist.id}', 'imported')" style="padding: 6px 12px; font-size: 11px; display: inline-flex; align-items: center; gap: 4px;"><i class="fas fa-edit"></i> Rename</button>
                <button class="danger-btn" onclick="S.deletePlaylist('${playlist.id}', 'imported')" style="padding: 6px 12px; font-size: 11px; border-radius: 8px; display: inline-flex; align-items: center; gap: 4px;"><i class="fas fa-trash"></i> Delete</button>
              </div>
              
              <!-- Inline rename form for list view -->
              <div id="renameFormContainer-list-${playlist.id}" class="import-panel" style="display: none; margin-top: 10px; padding: 8px; width: 100%; border: 1px solid rgba(255,255,255,0.08);" onclick="event.stopPropagation();">
                <div class="import-field" style="display: flex; gap: 5px;">
                  <input type="text" id="renameInput-list-${playlist.id}" value="${esc(playlist.title)}" style="padding: 6px 10px; font-size: 12px; flex: 1; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: var(--t1); outline: none;">
                  <button class="go-btn" onclick="S.saveRenamePlaylist('${playlist.id}', 'imported-list')" style="padding: 6px 10px; font-size: 11px;">Save</button>
                  <button class="danger-btn" onclick="S.cancelRenamePlaylist('${playlist.id}', 'imported')" style="padding: 6px 10px; font-size: 11px; border-radius: 6px;">Cancel</button>
                </div>
              </div>
            </article>
          `).join('')}
        </div>
      </div>`;
  }

  function renderHome() {
    const trendingGrid = document.getElementById('trendingGrid');
    const recentList = document.getElementById('recentlyPlayedList');
    const playlistGrid = document.getElementById('playlistGrid');
    const artistRow = document.getElementById('artistRow');
    const heroArt = document.getElementById('heroArt');
    const spotlight = document.getElementById('homeSpotlight');
    if (!trendingGrid || !recentList || !playlistGrid) return;

    const featured = homeData.trending[0];
    const vibe = inferListeningVibe();
    const userName = st.user?.name || 'friend';
    if (heroArt) {
      heroArt.innerHTML = featured?.videoId
        ? `<img src="${thumbUrl(featured.videoId)}" alt="${esc(featured.title)} thumbnail" loading="lazy">`
        : '';
    }

    if (spotlight) {
      spotlight.innerHTML = `
        <div class="spotlight-card">
          <div class="spotlight-copy">
            <p class="sec-label">For ${esc(userName)}</p>
            <h3>${esc(`Your ${vibe.label} mix is ready`)}</h3>
            <p>${esc(`You’ve been leaning toward ${vibe.label} energy, so we layered in ${vibe.songs.join(' and ')} for your next session.`)}</p>
          </div>
          <button type="button" onclick="S.tab('search')">Explore now</button>
        </div>`;
    }

    trendingGrid.innerHTML = homeData.trending.map(item => `
      <article class="tile-card" onclick="S.quick('${esc(item.title).replace(/'/g, "\\'")}')">
        <div class="tile-art" style="background:${item.accent}">
          <img src="${thumbUrl(item.videoId)}" alt="${esc(item.title)} thumbnail" loading="lazy" onload="this.classList.add('loaded')">
        </div>
        <div class="tile-copy">
          <h3>${esc(item.title)}</h3>
          <p>${esc(item.artist)}</p>
        </div>
      </article>`).join('');

    // Dynamic Recommendations section
    const recSection = document.getElementById('recommendationsSection');
    const recGrid = document.getElementById('recommendationsGrid');
    const recLabel = document.getElementById('recommendationLabel');
    const recTitle = document.getElementById('recommendationTitle');
    if (recSection && recGrid) {
      if (st.recommendations && st.recommendations.length > 0) {
        recSection.style.display = 'block';
        if (recLabel && recTitle && st.recAnchor) {
          recLabel.textContent = `Recommended for You`;
          recTitle.textContent = `Based on your interest in "${esc(st.recAnchor)}"`;
        }
        recGrid.innerHTML = st.recommendations.map(item => `
          <article class="tile-card" onclick="S.playTrack('${item.id}','${quoteJs(item.title)}','${quoteJs(item.author)}','${quoteJs(item.thumbnail)}')">
            <div class="tile-art" style="background: linear-gradient(135deg, var(--primary), var(--bg2))">
              <img src="${item.thumbnail}" alt="${esc(item.title)} thumbnail" loading="lazy" onload="this.classList.add('loaded')">
            </div>
            <div class="tile-copy">
              <h3>${esc(item.title)}</h3>
              <p>${esc(item.author)}</p>
            </div>
          </article>`).join('');
      } else {
        recSection.style.display = 'none';
      }
    }

    const recentItems = st.hist.slice(0, 4);
    recentList.innerHTML = recentItems.length
      ? recentItems.map(item => `
        <div class="recent-row" onclick="S.quick('${quoteJs(item.title)}')">
          <div class="recent-art" style="background:linear-gradient(135deg, #4f46e5, #06b6d4)">
            ${item.thumbnail ? `<img src="${item.thumbnail}" alt="${esc(item.title)} thumbnail" loading="lazy" onload="this.classList.add('loaded')">` : '<i class="fas fa-music"></i>'}
          </div>
          <div class="recent-copy">
            <h3>${esc(item.title)}</h3>
            <p>${esc(item.author || 'Recently played')}</p>
          </div>
          <button class="mini-play" onclick="event.stopPropagation();S.quick('${quoteJs(item.title)}')"><i class="fas fa-play"></i></button>
        </div>`).join('')
      : homeData.recent.map(item => `
        <div class="recent-row">
          <div class="recent-art" style="background:${item.accent}">
            <img src="${thumbUrl(item.videoId)}" alt="${esc(item.title)} thumbnail" loading="lazy" onload="this.classList.add('loaded')">
          </div>
          <div class="recent-copy">
            <h3>${esc(item.title)}</h3>
            <p>${esc(item.artist)} • ${esc(item.time)}</p>
          </div>
          <button class="mini-play" onclick="event.stopPropagation();S.quick('${esc(item.title).replace(/'/g, "\\'")}')"><i class="fas fa-play"></i></button>
        </div>`).join('');

    playlistGrid.innerHTML = homeData.playlists.map(item => `
      <article class="playlist-card">
        <div class="playlist-art" style="background:${item.accent}">
          <img src="${thumbUrl(item.videoId)}" alt="${esc(item.title)} thumbnail" loading="lazy" onload="this.classList.add('loaded')">
        </div>
        <div class="playlist-copy">
          <h3>${esc(item.title)}</h3>
          <p>${esc(item.description)}</p>
        </div>
      </article>`).join('');

    if (artistRow) {
      artistRow.innerHTML = homeData.artists.map(artist => `
        <div class="artist-pill">
          <div class="artist-avatar" style="background:${'linear-gradient(135deg, #c0392b, #7c3aed)'}">
            <img src="${thumbUrl(artist.videoId)}" alt="${esc(artist.name)}" loading="lazy" onload="this.classList.add('loaded')">
          </div>
          <div class="artist-info">
            <div class="artist-name">${esc(artist.name)}</div>
            <div class="artist-genre">${esc(artist.genre)}</div>
            <div class="artist-bio">${esc(artist.bio)}</div>
            <div class="artist-songs">
              ${artist.songs.map(song => `<span>${esc(song.title)}</span>`).join('')}
            </div>
          </div>
        </div>`).join('');
    }
  }

  function renderTrending() {
    const trendPlaylistsGrid = document.getElementById('trendPlaylistsGrid');
    const trendSongsList = document.getElementById('trendSongsList');
    if (!trendPlaylistsGrid || !trendSongsList) return;

    const mockTrendPlaylists = [
      { id: 'global50', title: 'Global Top 50', desc: 'The hottest songs played around the world.', query: 'Global Top Hits' },
      { id: 'viral', title: 'Viral Hits', desc: 'Tracks that everyone is listening to this week.', query: 'Viral Hits 2026' },
      { id: 'fresh', title: 'Fresh Finds', desc: 'New releases you don’t want to miss.', query: 'Fresh Finds New Music' },
      { id: 'rhythm', title: 'Rhythm & Beats', desc: 'Danceable songs for your next session.', query: 'Rhythm and Beats Dance' }
    ];

    trendPlaylistsGrid.innerHTML = mockTrendPlaylists.map((p, idx) => `
      <article class="trend-card" onclick="S.playQuery('${quoteJs(p.query)}')">
        <span>${idx + 1}</span>
        <h3>${esc(p.title)}</h3>
        <p>${esc(p.desc)}</p>
      </article>`).join('');

    trendSongsList.innerHTML = homeData.trending.map(song => `
      <li onclick="S.quick('${quoteJs(song.title)}')">
        <div class="trend-song-item" style="display:flex; align-items:center; width:100%; justify-content:space-between; cursor:pointer;">
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="width:40px; height:40px; border-radius:6px; background:#222; overflow:hidden; position:relative;">
              <img src="${thumbUrl(song.videoId)}" style="width:100%; height:100%; object-fit:cover; display:block;" onload="this.classList.add('loaded')">
            </div>
            <div>
              <strong style="display:block; color:#fff; font-size:0.95rem;">${esc(song.title)}</strong>
              <span style="color:var(--t2); font-size:0.8rem;">${esc(song.artist)}</span>
            </div>
          </div>
          <button class="mini-play" style="width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:var(--primary); border:none; color:#000; cursor:pointer;" onclick="event.stopPropagation();S.quick('${quoteJs(song.title)}')">
            <i class="fas fa-play" style="font-size:10px;"></i>
          </button>
        </div>
      </li>`).join('');
  }

  /* ── HELPERS ── */
  function loading(on) { const el = document.getElementById('spinOverlay'); if (el) el.style.display = on ? 'flex' : 'none'; }

  function announce(msg) {
    const live = document.getElementById('liveRegion');
    if (live) {
      live.textContent = '';
      window.setTimeout(() => { live.textContent = msg; }, 20);
    }
  }

  function fmt(s) { if (isNaN(s)||s<0) return '0:00'; return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`; }

  function fmtDur(d) {
    if (!d) return '';
    if (typeof d === 'string' && d.includes(':')) return d;
    const s = parseInt(d); if (isNaN(s)) return String(d);
    return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
  }

  function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  function toast(msg, type = 'info') {
    const c = document.getElementById('toasts'); if (!c) return;
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    const ic = type==='err'?'circle-exclamation':type==='ok'?'circle-check':'circle-info';
    t.innerHTML = `<i class="fas fa-${ic}"></i> ${esc(msg)}`;
    c.appendChild(t);
    setTimeout(() => { t.style.animation = 'tout .3s ease forwards'; setTimeout(() => t.remove(), 300); }, 3200);
  }

  function particles() {
    const isMobile = window.innerWidth <= 768 || ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    if (isMobile) return;
    const c = document.getElementById('particles'); if (!c) return;
    for (let i = 0; i < 18; i++) {
      const p = document.createElement('div'); p.className = 'pt';
      p.style.left = Math.random()*100+'%';
      p.style.animationDuration = (16+Math.random()*22)+'s';
      p.style.animationDelay = (-Math.random()*20)+'s';
      p.style.width = p.style.height = (1+Math.random()*2)+'px';
      c.appendChild(p);
    }
  }

  /* ── FLUID PAGE TRANSITION OVERLAY ── */
  function initPageTransitionOverlay() {
    // Create overlay if it doesn't already exist (shared CSS is in styles.css)
    if (document.getElementById('pageTransitionOverlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'pageTransitionOverlay';
    const blob = document.createElement('div');
    blob.id = 'pageTransitionBlob';
    overlay.appendChild(blob);
    document.body.appendChild(overlay);

    // Fade the overlay out so the app is revealed
    requestAnimationFrame(() => {
      setTimeout(() => {
        overlay.classList.add('fade-out');
        setTimeout(() => { overlay.style.display = 'none'; }, 750);
      }, 60);
    });
  }

  window.triggerPageTransition = function(targetUrl) {
    const overlay = document.getElementById('pageTransitionOverlay');
    const blob = document.getElementById('pageTransitionBlob');
    if (overlay && blob) {
      overlay.style.display = 'flex';
      overlay.offsetHeight; // force reflow
      overlay.classList.remove('fade-out');
      setTimeout(() => { window.location.href = targetUrl; }, 850);
    } else {
      window.location.href = targetUrl;
    }
  };

  /* ── KEYBOARD ── */
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.code === 'Space') { e.preventDefault(); S.pp(); }
    if (e.code === 'ArrowRight' && e.altKey) { e.preventDefault(); S.next(); }
    if (e.code === 'ArrowLeft'  && e.altKey) { e.preventDefault(); S.prev(); }
    if (e.code === 'KeyS' && !e.ctrlKey && !e.metaKey) { e.preventDefault(); S.tab('search'); }
    if (e.code === 'Escape' && st.expanded) { e.preventDefault(); S.expand(); }
  });

  /* ── INIT ── */
  function init() {
    const loginForm = document.getElementById('loginForm');
    const guestBtn = document.getElementById('guestBtn');
    const accountBtn = document.getElementById('accountBtn');
    const themeBtn = document.getElementById('themeToggle');
    const drawerBtn = document.getElementById('playlistDrawerBtn');
    const closeDrawerBtn = document.getElementById('closeDrawerBtn');
    const authShell = document.getElementById('authShell');

    st.user = getStoredUser();
    if (!st.user) {
      window.location.href = 'login.html';
      return;
    }

    // Unlock Web Audio / Background Audio on first touch/click
    const unlockAudio = () => {
      playSilentAudio();
      if (!st.playing) {
        pauseSilentAudio();
      }
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };
    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);
    // Auto-resume playback when app returns to foreground
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (st.playing) {
          wasPlayingBeforeMinimize = true;
          playSilentAudio();
        }
      } else {
        pauseSilentAudio();
        if (wasPlayingBeforeMinimize) {
          wasPlayingBeforeMinimize = false;
          setTimeout(() => {
            if (yt && ytOk && !st.playing) {
              try {
                yt.playVideo();
              } catch (err) {
                console.warn('Auto-resume on visibilitychange failed:', err);
              }
            }
          }, 100);
        }
      }
    });

    // Set up Media Session actions
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.setActionHandler('play', () => S.pp());
        navigator.mediaSession.setActionHandler('pause', () => S.pp());
        navigator.mediaSession.setActionHandler('previoustrack', () => S.prev());
        navigator.mediaSession.setActionHandler('nexttrack', () => S.next());
        navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (yt && ytOk && typeof details.seekTime === 'number') {
            yt.seekTo(details.seekTime, true);
          }
        });
        navigator.mediaSession.setActionHandler('seekbackward', (details) => {
          if (yt && ytOk) {
            const offset = details.seekOffset || 10;
            try {
              yt.seekTo(Math.max(0, yt.getCurrentTime() - offset), true);
            } catch (e) {}
          }
        });
        navigator.mediaSession.setActionHandler('seekforward', (details) => {
          if (yt && ytOk) {
            const offset = details.seekOffset || 10;
            try {
              yt.seekTo(Math.min(yt.getDuration(), yt.getCurrentTime() + offset), true);
            } catch (e) {}
          }
        });
      } catch (e) {
        console.warn('Failed to register Media Session handlers:', e);
      }
    }
    if (accountBtn) accountBtn.addEventListener('click', () => S.openAccount());
    if (themeBtn) themeBtn.addEventListener('click', () => S.toggleTheme());
    if (drawerBtn) drawerBtn.addEventListener('click', () => S.togglePlaylistDrawer());
    if (closeDrawerBtn) closeDrawerBtn.addEventListener('click', () => S.closePlaylistDrawer());

    // Mobile Sidebar Drawer Toggle listeners
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebarBackdrop = document.getElementById('sidebarBackdrop');
    if (mobileMenuBtn) {
      mobileMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const sidebar = document.getElementById('sidebar');
        const backdrop = document.getElementById('sidebarBackdrop');
        if (sidebar) sidebar.classList.toggle('open');
        if (backdrop) backdrop.classList.toggle('active');
      });
    }
    if (sidebarBackdrop) {
      sidebarBackdrop.addEventListener('click', () => {
        const sidebar = document.getElementById('sidebar');
        const backdrop = document.getElementById('sidebarBackdrop');
        if (sidebar) sidebar.classList.remove('open');
        if (backdrop) backdrop.classList.remove('active');
      });
    }
    const sidebarNavBtns = document.querySelectorAll('.topbar-nav .tab-btn');
    sidebarNavBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const sidebar = document.getElementById('sidebar');
        const backdrop = document.getElementById('sidebarBackdrop');
        if (sidebar) sidebar.classList.remove('open');
        if (backdrop) backdrop.classList.remove('active');
      });
    });

    // Global click listener to close sidebar on click outside
    document.addEventListener('click', (e) => {
      const sidebar = document.getElementById('sidebar');
      const backdrop = document.getElementById('sidebarBackdrop');
      const mobileBtn = document.getElementById('mobileMenuBtn');
      if (sidebar && sidebar.classList.contains('open')) {
        if (!sidebar.contains(e.target) && (!mobileBtn || !mobileBtn.contains(e.target))) {
          sidebar.classList.remove('open');
          if (backdrop) backdrop.classList.remove('active');
        }
      }
    });

    particles();
    initPageTransitionOverlay();
    renderHome();
    renderTrending();
    renderRecent();
    renderLiked();
    renderImportedPlaylist();
    S.renderPlaylists();
    loadYT();
    if (st.track) {
      updBar(st.track);
      updFull(st.track);
      updQueue();
      updFPQueue();
      loadLyrics(st.track);
      const savedTime = parseFloat(localStorage.getItem('sumic_time') || '0');
      const fc = document.getElementById('fpCur'), nc = document.getElementById('npCur');
      if (fc) fc.textContent = fmt(savedTime);
      if (nc) nc.textContent = fmt(savedTime);
    }
    const volRng = document.getElementById('volRange');
    if (volRng) {
      volRng.value = st.vol;
      // Initialise CSS custom property for the premium volume track fill (Task 4.2)
      volRng.style.setProperty('--vol-pct', Math.round(st.vol * 100) + '%');
    }
    
    updateAccountUI();
    applyTheme();
    renderPlaylistDrawer();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();
