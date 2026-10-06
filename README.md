# Bloom Quiz – Online Quiz Platform
React (Vite) + Spring Boot + Hibernate/JPA. No security/tokens. Data lives in a database (H2 file locally, PostgreSQL in production).

## 1. Run in VS Code
Install: JDK 17, Maven, Node 18+, VS Code (+ "Extension Pack for Java").
1. VS Code > File > Open Folder > `quiz-platform`. Open two terminals (Ctrl+`).
2. Terminal 1 (backend): `cd backend` then `mvn spring-boot:run` → http://localhost:8080
3. Terminal 2 (frontend): `cd frontend`, `npm install`, `npm run dev` → http://localhost:5173
4. Register a Faculty account, create a quiz; register a Student account (another browser/incognito) and attempt it.
Local data is stored in `backend/data/` (created automatically).

## 2. Push to Git
```
cd quiz-platform
git init
git add .
git commit -m "Online quiz platform"
git branch -M main
git remote add origin https://github.com/<your-username>/quiz-platform.git
git push -u origin main
```
(Create the empty repo `quiz-platform` on github.com first.)

## 3. Deploy
**Database + Backend (Render):**
1. Render > New > PostgreSQL (free). Copy host, database, user, password.
2. Render > New > Web Service > pick your repo > Language **Docker**, Root Directory `backend`.
3. Environment variables: `DB_URL=jdbc:postgresql://<host>:5432/<database>`, `DB_USER=<user>`, `DB_PASS=<password>`.
4. Deploy. Your API URL looks like `https://quiz-backend.onrender.com`. (Free instances sleep; first request is slow.)

**Frontend (Vercel):** New Project > import repo > Root Directory `frontend` > Framework Vite > add env `VITE_API_URL=<your Render URL>` > Deploy.

**Frontend (Netlify alternative):** Add site from Git > Base directory `frontend`, Build command `npm run build`, Publish directory `frontend/dist` > add env `VITE_API_URL` > Deploy.

Change the API URL later? Update `VITE_API_URL` and redeploy the frontend.
