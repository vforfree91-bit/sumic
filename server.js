/**
 * Sumic – standalone Express backend
 * Handles YouTube search (scraping + Piped/Invidious fallback)
 * Serves the frontend from /public
 */

const express = require('express');
const https = require('https');
const http = require('http');
const path = require('path');
const url = require('url');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Serve static frontend ──────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON body.' });
  }
  next(err);
});

// ── CORS ──────────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ── Tiny fetch helper (no external deps) ──────────────────────────────────
function fetchUrl(rawUrl, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new url.URL(rawUrl);
    const lib = parsed.protocol === 'https:' ? https : http;
    const reqOptions = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        ...(options.headers || {})
      },
      timeout: options.timeout || 8000
    };

    const req = lib.request(reqOptions, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({ ok: res.statusCode < 400, status: res.statusCode, text: () => Promise.resolve(data), json: () => Promise.resolve(JSON.parse(data)) }));
    });

    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
    req.on('error', reject);
    req.end();
  });
}

// ── Piped / Invidious instances ────────────────────────────────────────────
const instances = [
  { type: 'piped',     url: 'https://pipedapi.kavin.rocks' },
  { type: 'piped',     url: 'https://api.piped.private.coffee' },
  { type: 'invidious', url: 'https://inv.nadeko.net/api/v1' },
  { type: 'invidious', url: 'https://invidious.nerdvpn.de/api/v1' },
  { type: 'piped',     url: 'https://pipedapi.adminforge.de' },
];

// ── YouTube direct scrape ──────────────────────────────────────────────────
async function searchYoutubeDirect(q) {
  try {
    const resp = await fetchUrl(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`, { timeout: 9000 });
    if (!resp.ok) return null;
    const html = await resp.text();

    let dataStr = null;
    const m1 = html.match(/var ytInitialData = (\{.*?\});/);
    const m2 = html.match(/window\["ytInitialData"\] = (\{.*?\});/);
    if (m1) dataStr = m1[1];
    else if (m2) dataStr = m2[1];
    if (!dataStr) return null;

    const data = JSON.parse(dataStr);
    const sectionList = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
    const itemSection = sectionList.find(c => c.itemSectionRenderer)?.itemSectionRenderer?.contents || [];

    const results = itemSection
      .filter(v => v.videoRenderer)
      .slice(0, 10)
      .map(v => {
        const vr = v.videoRenderer;
        return {
          id: vr.videoId,
          title: vr.title?.runs?.[0]?.text || 'Unknown Title',
          author: vr.ownerText?.runs?.[0]?.text || '',
          duration: vr.lengthText?.simpleText || '0:00',
          thumbnail: `https://img.youtube.com/vi/${vr.videoId}/mqdefault.jpg`,
        };
      });
    return results.length > 0 ? results : null;
  } catch {
    return null;
  }
}

// ── Piped/Invidious fallback ───────────────────────────────────────────────
async function searchViaInstances(q, withFilter = true) {
  for (const inst of instances) {
    try {
      const filter = withFilter && inst.type === 'piped' ? '&filter=music_songs' : '';
      const searchUrl = inst.type === 'invidious'
        ? `${inst.url}/search?q=${encodeURIComponent(q)}`
        : `${inst.url}/search?q=${encodeURIComponent(q)}${filter}`;

      const resp = await fetchUrl(searchUrl, { timeout: 5000 });
      if (!resp.ok) continue;
      const data = await resp.json();
      let items = [];

      if (inst.type === 'invidious') {
        const arr = Array.isArray(data) ? data : (data.items || []);
        items = arr.filter(v => v.type === 'video').slice(0, 8).map(v => ({
          id: v.videoId, title: v.title, author: v.author || '',
          duration: v.lengthSeconds || 0,
          thumbnail: `https://img.youtube.com/vi/${v.videoId}/mqdefault.jpg`,
        }));
      } else {
        items = (data.items || []).slice(0, 8).map(v => ({
          id: (v.url || '').replace('/watch?v=', '') || v.videoId || '',
          title: v.title, author: v.uploaderName || '',
          duration: v.duration,
          thumbnail: `https://img.youtube.com/vi/${(v.url || '').replace('/watch?v=', '')}/mqdefault.jpg`,
        }));
      }
      if (items.length > 0) return items;
    } catch { continue; }
  }
  return null;
}

function parseSpotifyPlaylistUrl(rawUrl) {
  const value = String(rawUrl || '').trim();
  if (!value) return null;

  if (value.startsWith('spotify:playlist:')) return value.split(':').pop();

  try {
    const parsed = new URL(value);
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parsed.hostname.includes('spotify') && parts[0] === 'playlist') return parts[1];
  } catch {
    return null;
  }

  return null;
}

/**
 * Fetch track list from a public Spotify playlist by scraping the
 * open.spotify.com embed page — no API key required.
 * Returns an array of { title, artist } objects.
 */
async function fetchSpotifyPlaylistTracks(playlistId) {
  // Method 1: Spotify embed page (returns JSON in a <script> tag)
  try {
    const resp = await fetchUrl(
      `https://open.spotify.com/embed/playlist/${playlistId}`,
      { timeout: 10000, headers: { 'Accept': 'text/html' } }
    );
    if (resp.ok) {
      const html = await resp.text();
      // Spotify embeds put track data in a __NEXT_DATA__ JSON blob
      const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
      if (match) {
        const json = JSON.parse(match[1]);
        // Navigate the Next.js page props to find the track list
        const tracks =
          json?.props?.pageProps?.state?.data?.entity?.trackList ||
          json?.props?.pageProps?.state?.data?.entity?.items ||
          json?.props?.pageProps?.state?.data?.entity?.tracks?.items ||
          [];
        if (tracks.length > 0) {
          return tracks.slice(0, 100).map(t => ({
            title: t.title || t.name || t.track?.name || 'Unknown',
            artist: t.subtitle || t.artists?.map(a => a.name).join(', ') || t.track?.artists?.[0]?.name || t.track?.artists?.map(a => a.name).join(', ') || '',
          })).filter(t => t.title !== 'Unknown');
        }
      }
    }
  } catch { /* fall through */ }

  // Method 2: Spotify oEmbed (gives playlist name but not tracks — use as metadata only)
  let playlistTitle = 'Imported Playlist';
  try {
    const oembed = await fetchUrl(
      `https://open.spotify.com/oembed?url=https://open.spotify.com/playlist/${playlistId}`,
      { timeout: 6000 }
    );
    if (oembed.ok) {
      const data = await oembed.json();
      if (data.title) playlistTitle = data.title;
    }
  } catch { /* ignore */ }

  // Method 3: Piped playlist API — works for YouTube playlists.
  // For Spotify playlists we try to find a matching YouTube playlist by name.
  // This is a best-effort fallback.
  return { fallback: true, title: playlistTitle };
}

async function searchOneTrack(query) {
  let results = await searchYoutubeDirect(query);
  if (results && results.length > 0) return results[0];
  results = await searchViaInstances(query, false);
  if (results && results.length > 0) return results[0];
  return null;
}

function parseSyncedLyrics(raw) {
  if (!raw) return [];
  const lines = [];
  const chunks = String(raw).split(/\r?\n/);
  chunks.forEach((chunk) => {
    const trimmed = chunk.trim();
    if (!trimmed) return;
    const match = trimmed.match(/^\[(\d{1,2}):(\d{2})(?:\.(\d{2,3}))?\]\s*(.*)$/);
    if (match) {
      const minutes = parseInt(match[1], 10) || 0;
      const seconds = parseInt(match[2], 10) || 0;
      const ms = parseInt(match[3] || '0', 10) / 1000;
      lines.push({
        time: minutes * 60 + seconds + ms,
        text: (match[4] || '').trim(),
      });
    } else {
      lines.push({ time: null, text: trimmed });
    }
  });
  return lines.filter(line => line.text);
}

// ── /api/lyrics endpoint ────────────────────────────────────────────────
app.get('/api/lyrics', async (req, res) => {
  const track = String(req.query.track || '').trim();
  const artist = String(req.query.artist || '').trim();
  if (!track) {
    return res.status(400).json({ error: 'Please provide a track title.' });
  }

  try {
    const searchUrl = new URL('https://lrclib.net/api/search');
    searchUrl.searchParams.set('track_name', track);
    if (artist) searchUrl.searchParams.set('artist_name', artist);

    const response = await fetchUrl(searchUrl.toString(), { timeout: 8000 });
    if (!response.ok) {
      return res.status(404).json({ error: 'No lyrics found.' });
    }

    const data = await response.json();
    const match = Array.isArray(data) ? (data.find(item => !item.instrumental) || data[0]) : null;
    if (!match) {
      return res.status(404).json({ error: 'No lyrics found.' });
    }

    const rawLyrics = match.syncedLyrics || match.plainLyrics || '';
    const lines = parseSyncedLyrics(rawLyrics);
    const fallback = lines.length > 0 ? lines : [{ text: match.plainLyrics || 'Lyrics are not available for this track yet.', time: null }];

    return res.json({ lines: fallback });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Unable to fetch lyrics.' });
  }
});

// ── /api/search endpoint ────────────────────────────────────────────────
app.get('/api/search', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) {
    return res.status(400).json({ error: 'Please provide a search query.' });
  }

  try {
    const directResults = await searchYoutubeDirect(q);
    const results = directResults && directResults.length > 0
      ? directResults
      : await searchViaInstances(q, true);

    if (results && results.length > 0) {
      return res.json({ results });
    }

    return res.json({ results: [], error: 'No results found.' });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Search failed.' });
  }
});

// ── /api/import-playlist endpoint ─────────────────────────────────────────
app.post('/api/import-playlist', async (req, res) => {
  try {
    const rawUrl = req.body?.url || req.query?.url || '';
    const value = String(rawUrl).trim();

    if (!value) {
      return res.status(400).json({ error: 'Please provide a Spotify playlist link.' });
    }

    const playlistId = parseSpotifyPlaylistUrl(value);
    if (!playlistId) {
      return res.status(400).json({ error: 'Please provide a valid Spotify playlist link (e.g. https://open.spotify.com/playlist/...)' });
    }

    // Step 1: Fetch actual track names from the Spotify playlist page
    let spotifyTracks = await fetchSpotifyPlaylistTracks(playlistId);
    let playlistTitle = 'Imported Playlist';
    let queries = [];

    if (Array.isArray(spotifyTracks) && spotifyTracks.length > 0) {
      // We got real track data from Spotify embed
      queries = spotifyTracks.map(t => t.artist ? `${t.title} ${t.artist}` : t.title);
      playlistTitle = 'Spotify Playlist';
    } else if (spotifyTracks && spotifyTracks.fallback) {
      // Embed scrape failed — search YouTube for the playlist title to find
      // a matching YouTube playlist, then pull its tracks via Piped
      playlistTitle = spotifyTracks.title || 'Imported Playlist';

      // Try to find playlist on YouTube via Piped playlist search
      let foundViaPiped = false;
      for (const inst of instances) {
        if (inst.type !== 'piped') continue;
        try {
          const searchUrl = `${inst.url}/search?q=${encodeURIComponent(playlistTitle)}&filter=playlists`;
          const resp = await fetchUrl(searchUrl, { timeout: 5000 });
          if (!resp.ok) continue;
          const data = await resp.json();
          const playlists = (data.items || []).filter(i => i.type === 'playlist' || i.playlistType);
          if (playlists.length > 0) {
            // Fetch first playlist's tracks
            const plId = playlists[0].url?.replace('/playlist?list=', '') || playlists[0].playlistId;
            if (plId) {
              const plResp = await fetchUrl(`${inst.url}/playlists/${plId}`, { timeout: 6000 });
              if (plResp.ok) {
                const plData = await plResp.json();
                const relatedStreams = plData.relatedStreams || [];
                queries = relatedStreams.slice(0, 100).map(s => `${s.title} ${s.uploaderName || ''}`);
                playlistTitle = plData.name || playlistTitle;
                foundViaPiped = true;
                break;
              }
            }
          }
        } catch { continue; }
      }

      if (!foundViaPiped) {
        // Last resort: search YouTube directly for the playlist name as a query
        const searchResults = await searchYoutubeDirect(playlistTitle) ||
                              await searchViaInstances(playlistTitle, false);
        if (searchResults && searchResults.length > 0) {
          // Use the search results directly as tracks (no need to re-search)
          const tracks = searchResults.slice(0, 100).map(t => ({
            id: t.id,
            title: t.title,
            author: t.author || 'Unknown',
            thumbnail: `https://img.youtube.com/vi/${t.id}/mqdefault.jpg`,
          }));
          return res.json({ playlist: { id: playlistId, title: playlistTitle, owner: 'Spotify', tracks } });
        }
        return res.status(502).json({ error: 'Could not fetch playlist tracks. The playlist may be private or Spotify is blocking requests. Try again in a moment.' });
      }
    }

    if (queries.length === 0) {
      return res.status(502).json({ error: 'No tracks found in this playlist.' });
    }

    // Step 2: Search YouTube for each track (run up to 10 at a time to avoid throttling)
    const tracks = [];
    const batchSize = 10;
    for (let i = 0; i < Math.min(queries.length, 100); i += batchSize) {
      const batch = queries.slice(i, i + batchSize);
      const results = await Promise.all(batch.map(q => searchOneTrack(q)));
      for (const t of results) {
        if (t) {
          tracks.push({
            id: t.id,
            title: t.title,
            author: t.author || 'Unknown',
            thumbnail: `https://img.youtube.com/vi/${t.id}/mqdefault.jpg`,
          });
        }
      }
    }

    if (tracks.length === 0) {
      return res.status(502).json({ error: 'Found playlist but could not match any tracks on YouTube. Try again.' });
    }

    res.json({
      playlist: {
        id: playlistId,
        title: playlistTitle,
        owner: 'Spotify',
        tracks,
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Unable to import playlist.' });
  }
});

// ── Fallback → index.html (SPA) ───────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n  ╔══════════════════════════════╗`);
  console.log(`  ║   Sumic       ║`);
  console.log(`  ║   http://localhost:${PORT}       ║`);
  console.log(`  ╚══════════════════════════════╝\n`);
});
