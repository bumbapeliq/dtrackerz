<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# DebtTracker Pro

Modern React + Vite application for managing shared expenses with Firebase + Gemini integrations.

## Local Development

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Environment variables**

   Create a `.env.local` file (ignored by git) and add the Gemini key:

   ```bash
   GEMINI_API_KEY=your-key-here
   ```

3. **Run the dev server**

   ```bash
   npm run dev
   ```

## Preparing for GitHub

1. Initialize the repository (if you cloned from elsewhere, skip):

   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<user>/<repo>.git
   git push -u origin main
   ```

2. Ensure `.env.local` is **not** committed (already ignored via `*.local`).

## Deploying to Vercel

1. Push the repo to GitHub (see above) so Vercel can import it.
2. In Vercel, create a new project and select the GitHub repo.
3. When prompted for build settings keep the defaults or match `vercel.json`:
   - Install Command: `npm install`
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Add the required environment variable in Vercel Project → Settings → Environment Variables:
   - `GEMINI_API_KEY`: same value as your local `.env.local`
5. (Optional) If you have other secrets (Firebase, etc.) move them from hard-coded values into environment variables before sharing broadly.
6. Redeploy; Vercel will use the configuration in `vercel.json`.

## Useful Scripts

- `npm run dev` – start Vite dev server
- `npm run build` – production bundle (output in `dist/`)
- `npm run preview` – serve the production bundle locally
