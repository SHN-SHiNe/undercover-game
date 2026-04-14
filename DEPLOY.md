# GitHub + Vercel/Render/Railway Deploy Guide

## 1. Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `undercover-game`
3. Description: `Who is Undercover card game - React + Flask`
4. Make it Public
5. Don't initialize with README (we already have one)
6. Click "Create repository"

## 2. Push to GitHub

```bash
git remote set-url origin https://github.com/YOUR_USERNAME/undercover-game.git
git push -u origin main
```

## 3. Deploy Options

### Option A: Vercel (Recommended - Free)

1. Go to https://vercel.com
2. Import from GitHub
3. Select `undercover-game` repository
4. Framework Preset: `Other`
5. Build Command: `pip install -r requirements.txt`
6. Install Command: leave empty
7. Output Directory: `static`
8. Environment Variables (if needed):
   - `PYTHON_VERSION`: `3.11`
9. Deploy

### Option B: Render (Free)

1. Go to https://render.com
2. New + Web Service
3. Connect GitHub repo
4. Build Command: `pip install -r requirements.txt`
5. Start Command: `gunicorn app:app`
6. Environment Variables:
   - `PYTHON_VERSION`: `3.11`
7. Deploy

### Option C: Railway (Free tier)

1. Go to https://railway.app
2. Deploy from GitHub repo
3. Railway will auto-detect Flask
4. Deploy

## 4. Access Your App

After deployment, you'll get a public URL like:
- Vercel: `https://undercover-game.vercel.app`
- Render: `https://undercover-game.onrender.com`
- Railway: `https://undercover-game.up.railway.app`

Share this URL for anyone to play!

## 5. Mobile Usage

The app is fully mobile-responsive. Players can:
- Use any mobile browser
- Swipe to flip cards
- Tap to vote
- No app installation needed
