# CreatorIQ
YouTube channel analytics dashboard (React + Vite + Tailwind, FastAPI + Postgres).

## Backend
cd creatoriq-backend
cp .env.example .env   # then fill in NEW keys
pip install -r requirements.txt
uvicorn main:app --reload

## Frontend
npm install
npm run dev
Open http://localhost:5173 , sign up, then go to Channel Stats.
