<p align="center">
  <img src="banner.png" alt="Sumic Banner" width="100%" />
</p>

<h1 align="center">SUMIC</h1>

<p align="center">
  <strong>music, redefined.</strong>
</p>

<p align="center">
  A premium, distraction-free music streaming experience built for audiophiles, dreamers, and curators.
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#screenshots">Preview</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#deployment">Deploy</a> •
  <a href="#tech-stack">Stack</a> •
  <a href="#license">License</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/node-%3E%3D18-339933?style=flat-square&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/express-4.x-000000?style=flat-square&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" />
  <img src="https://img.shields.io/badge/deploy-Render%20%2B%20Cloudflare-orange?style=flat-square" />
</p>

---

## ✨ Why Sumic?

Most music players are bloated with ads, trackers, and things you never asked for.  
**Sumic strips all of that away.** What's left is pure music — beautiful UI, instant playback, and zero distractions.

> Search anything. Play instantly. No account required.

---

## Features

| | Feature | |
|---|---|---|
| 🎵 | **Instant Search & Play** | Search any song and start playing in under 2 seconds |
| 🎨 | **Premium Dark UI** | Hand-crafted glassmorphism design with fluid animations |
| 📜 | **Synced Lyrics** | Real-time, character-animated lyrics that follow the beat |
| 📋 | **Smart Queue** | Drag, reorder, and manage your up-next list |
| 💚 | **Liked Songs** | Save favorites locally — no sign-up needed |
| 📥 | **Spotify Import** | Paste any public Spotify playlist link and play it here |
| 🔄 | **Session Persistence** | Refresh the page — your song, queue, and progress are right where you left them |
| 🖥️ | **Full-Screen Player** | Immersive album art, song/lyric toggle, and cinematic transitions |
| ⌨️ | **Keyboard Shortcuts** | Space to play/pause, Alt+← →, S for search, Esc to exit |
| 📱 | **Responsive** | Desktop, tablet, and mobile — every breakpoint is polished |

---

## Screenshots

> The best way to experience Sumic is to run it yourself.  
> *Screenshots don't do the animations justice.*

---

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) **v18+**
- [Git](https://git-scm.com/)

### Install & Run

```bash
# Clone the repository
git clone https://github.com/saurabh222007/sumic-plays.git
cd sumic-plays

# Install dependencies
npm install

# Start the server
npm start
```

Open **http://localhost:3000** — that's it. No build step, no config files, no environment variables.

---

## Deployment

Sumic is designed for a **split deployment**:

| Layer | Platform | What it serves |
|-------|----------|----------------|
| **Frontend** | Cloudflare Pages | Static files (`/public`) |
| **Backend** | Render | API server (`server.js`) |

### 1. Deploy Backend on Render

1. Go to [render.com](https://render.com) → **New → Web Service**
2. Connect your GitHub repo (`saurabh222007/sumic-plays`)
3. Render will auto-detect the `render.yaml` blueprint, or configure manually:

| Setting | Value |
|---------|-------|
| **Build Command** | `npm install` |
| **Start Command** | `node server.js` |
| **Environment** | `NODE_ENV = production` |

4. Deploy. Copy your Render URL (e.g. `https://sumic-api.onrender.com`)

### 2. Deploy Frontend on Cloudflare Pages

1. Go to [Cloudflare Pages](https://pages.cloudflare.com/) → **Create a project**
2. Connect your GitHub repo (`saurabh222007/sumic-plays`)
3. Configure the build:

| Setting | Value |
|---------|-------|
| **Build command** | *(leave empty — no build step)* |
| **Build output directory** | `public` |

4. After deploying, go to your Cloudflare project **Settings → Environment Variables** and add:

| Variable | Value |
|----------|-------|
| *(none required)* | The frontend is fully static |

### 3. Connect Frontend to Backend

After both are deployed, update the API base URL in `public/app.js`:

1. Open `public/app.js` and locate the `API_BASE` configuration at the top of the file:
```js
// API BASE CONFIGURATION (Set this to your Render backend URL when deploying to Cloudflare Pages)
const API_BASE = '';
```
2. Update it to your deployed Render URL:
```js
const API_BASE = 'https://your-render-backend-url.onrender.com';
```

> **Note:** By default, when `API_BASE` is left blank, it automatically defaults to relative routes which work perfectly for local development or when hosting the frontend and backend on the same server.

---

## Project Structure

```
sumic-plays/
├── public/           # Frontend (static files)
│   ├── index.html    # Main app shell
│   ├── login.html    # Authentication page
│   ├── app.js        # Core application logic
│   ├── login.js      # Login page interactions
│   ├── styles.css    # Complete design system
│   ├── Dock.js       # Mobile dock navigation
│   └── ...           # Animation modules
├── server.js         # Express API server
├── package.json      # Dependencies & scripts
├── render.yaml       # Render deployment blueprint
└── README.md
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Vanilla HTML, CSS, JavaScript |
| **Animations** | GSAP-inspired custom animation system |
| **Backend** | Node.js + Express |
| **Search** | YouTube scraping + Piped/Invidious API fallback |
| **Lyrics** | Third-party synced lyrics providers |
| **Playback** | YouTube IFrame Player API |
| **Storage** | localStorage (zero database required) |

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play / Pause |
| `Alt + →` | Next track |
| `Alt + ←` | Previous track |
| `S` | Jump to search |
| `Esc` | Close full-screen player |

---

## Contributing

Sumic is a personal project, but PRs are welcome for bug fixes and improvements.

1. Fork the repo
2. Create a feature branch (`git checkout -b feat/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

---

## Author

**Saurabh** — [@saurabh222007](https://github.com/saurabh222007)

Built with ❤️ and a lot of late-night music sessions.

---

## License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.

---

<p align="center">
  <sub>If Sumic made your day even 1% better, consider dropping a ⭐</sub>
</p>
