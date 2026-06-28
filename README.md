# 🚀 Contest Coach: AI-Powered Competitive Programming Assistant

Contest Coach is a state-of-the-art training companion designed for competitive programmers practicing on Codeforces. It integrates profile analytics, performance history, and rating predictions with a context-aware **Gemini AI Coach** to identify skill gaps and curate weekly practice plans.

---

## ✨ Features

*   **📊 Interactive Dashboard:** Visualize rating progression, daily consistency trackers, verdict distributions, and general Codeforces user statistics in real-time.
*   **🔍 Contest Analysis:** Auto-detects accuracy ratios, error metrics per solved problem, average maximum difficulty classes, and specific topic weaknesses (e.g. Dynamic Programming, Graphs).
*   **🔮 Rating Predictions:** Forecasts performance progression and charts visual training difficulty targets.
*   **⚡ Practice Coach:** A dynamic weekly roadmap that reads your active weaknesses from the database, generating custom practice tasks with checkboxes.
*   **👥 Social Compare:** Compare your metrics and stats side-by-side with other competitor handles.
*   **🤖 AI Coach Chatbot:** Powered by Google's **Gemini 2.5 Flash**. The coach automatically injects your live Codeforces stats, rating trajectory, and topic gaps into its context window for personalized competitive programming guidance.

---

## 🛠️ Tech Stack

### Frontend
*   **Core:** React 19, TypeScript, Vite
*   **Styling:** TailwindCSS v4
*   **Charts & Visuals:** Recharts, Lucide Icons, Canvas-Confetti

### Backend & Database
*   **Runtime:** Node.js, Express, TypeScript, ts-node-dev
*   **ORM:** Prisma Client
*   **Database:** PostgreSQL
*   **AI SDK:** `@google/generative-ai`

---

## 🚀 Setup & Installation

### Prerequisites
*   [Node.js](https://nodejs.org/) (v18 or higher recommended)
*   [PostgreSQL](https://www.postgresql.org/) database running locally or in the cloud
*   [Google AI Studio API Key](https://aistudio.google.com/) (Free Tier)

### 1. Clone the repository and install dependencies
```bash
# Clone the repository
git clone https://github.com/AMISH754/Contest-Coach.git
cd contest-coach

# Install Frontend dependencies
npm install

# Install Backend dependencies
cd server
npm install
```

### 2. Configure Environment Variables
1. Navigate to the `server/` directory.
2. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Open `.env` and fill in your details:
   *   `DATABASE_URL`: Your PostgreSQL database URL string
   *   `GEMINI_API_KEY`: Your Google Gemini API Key

### 3. Setup Database Schema
Initialize database tables and run migrations using Prisma:
```bash
# In server/ directory
npx prisma db push
npx prisma generate
```

### 4. Running the Application

You need to run both the frontend and the backend development servers.

#### Start Backend Server:
```bash
# In the /server directory
npm run dev
```
*The backend runs on `http://localhost:5000`.*

#### Start Frontend Client:
```bash
# In the root project directory
npm run dev
```
*The frontend runs on `http://localhost:5173`.*

---

## 📂 Project Structure

```
├── public/                # Static assets for frontend
├── src/                   # React Frontend code
│   ├── api/               # API clients (Codeforces backend wrapper)
│   ├── assets/            # Client images & logo graphics
│   ├── components/        # UI components (AICoach, Predictions, Analysis, Dashboard, etc.)
│   ├── App.tsx            # Main application shell and tab router
│   └── main.tsx           # React mounting & index styling
├── server/                # Backend API server code
│   ├── prisma/            # Database schema structure definition
│   ├── src/
│   │   ├── routes/        # Express router handles (api.ts)
│   │   ├── services/      # Codeforces API integrations & Gemini AI Coach pipeline
│   │   ├── db.ts          # Prisma Client setup
│   │   └── index.ts       # Server entrypoint file
│   └── tsconfig.json      # Backend TypeScript configuration
├── tsconfig.json          # Root/Frontend TypeScript config
└── vite.config.ts         # Vite configuration settings
```
