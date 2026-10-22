# FC Barcelona Match Predictor — Frontend

An interactive, high-performance web dashboard built with **React 19**, **TypeScript**, **Vite**, and **Tailwind CSS v4** to forecast FC Barcelona's upcoming fixtures using rolling xG form analytics and machine learning predictions.

---

## ✨ Features

- **Live Fixture Selector:** Choose from 19 La Liga clubs with official team crests and stadiums.
- **Home / Away Toggle:** Dynamic venue assignment (Camp Nou vs. away ground) with real-time stadium label switching.
- **Dynamic Outcome Visualizer:** Animated Blaugrana probability bars showing win, draw, and loss likelihoods.
- **Underlying Form Metrics:** Head-to-head visual comparison of recent goals scored and expected goals (xG).
- **Fast & Resilient:** Seamless fallback to offline demo predictions if the backend API is waking up or temporarily unavailable.
- **Configurable Backend Integration:** Configurable via environment variable (`VITE_API_URL`) for effortless deployment on Vercel, Netlify, or Cloudflare Pages.
- **Strict Accessibility:** Full ARIA landmarks, WCAG 2.2 AA compliant focus states, and reduced-motion support.

---

## 🛠️ Tech Stack

- **Framework:** [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Bundler:** [Vite 6](https://vite.dev/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Routing:** [Wouter](https://github.com/molefrog/wouter)
- **Icons & Crests:** Football-Data & Google Sports CDN

---

## 🚀 Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables (Optional)

Create a `.env` file in the frontend folder if connecting to a remote backend:

```env
VITE_API_URL=http://127.0.0.1:8000
```

> **Note:** If omitted, the frontend automatically defaults to `http://127.0.0.1:8000` for local development.

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Build for Production

```bash
npm run build
```

The production assets will be generated in the `dist/` directory.

---

## 🌐 Deployment to Vercel / Netlify

1. Link your GitHub repository to Vercel or Netlify.
2. Set the **Root Directory** to `frontend/` (or the folder containing this package).
3. Set the **Build Command** to:
   ```bash
   npm run build
   ```
4. Set the **Output Directory** to:
   ```bash
   dist
   ```
5. Add the Environment Variable:
   - `VITE_API_URL`: Your deployed FastAPI backend URL (e.g., `https://barca-predictor-api.onrender.com`).

---

## 👤 Author

Built by **Louai Al Sabbagh**  
LinkedIn: [linkedin.com/in/louai-alsabbagh](https://linkedin.com/in/louai-alsabbagh)  
GitHub: [@louals](https://github.com/louals)
