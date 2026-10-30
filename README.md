# ALOCHAT — Full AI Chat App

ALOCHAT is a mobile-friendly AI chat web app with a real OpenRouter-backed API proxy. The repository contains the frontend and Cloudflare Worker backend.

## Features
- Real AI chat with streamed responses
- OpenRouter model selection
- Swahili, English, French and Spanish interface / response-language option
- Local chat history, create and delete chats
- Copy assistant replies, dark/light theme
- Browser speech-to-text where supported
- Installable PWA shell and offline static-file cache
- API key stays in Cloudflare Worker secret, not in browser code

## Important architecture
GitHub Pages hosts only the static frontend. It cannot run a private backend or protect an API key. Deploy `worker/` to Cloudflare Workers for the AI API.

## 1. Upload to GitHub from Android
1. Download and extract `ALOCHAT-Full-App.zip`.
2. Open GitHub in Chrome and sign in.
3. Create a new public repository named `alochat`.
4. Upload the contents of this folder (not the outer ZIP) to the repository root. Keep `.github/workflows/pages.yml`.
5. In the repository open **Settings → Pages** and set **Source: GitHub Actions**.
6. Push to `main`; the workflow publishes the frontend. The Pages URL appears under Actions / Settings → Pages.

## 2. Deploy the AI backend
1. Create/sign in to a Cloudflare account and open Workers & Pages.
2. Create a Worker named `alochat-api`.
3. Copy the contents of `worker/index.js` into the Worker editor and deploy, OR use Wrangler from a computer/terminal:
   - `cd worker`
   - `npx wrangler deploy`
4. In the Worker settings, open **Settings → Variables and Secrets**.
5. Add secret `OPENROUTER_API_KEY` with your own OpenRouter API key. Never put this key in GitHub or frontend files.
6. Set variable `ALLOWED_ORIGINS` to your exact GitHub Pages origin, e.g. `https://YOUR-USERNAME.github.io`. For a project site, the origin does not include `/alochat`.
7. Optionally set `SITE_URL` to your deployed site URL.
8. Deploy/redeploy the Worker. Test `https://YOUR-WORKER.workers.dev/health`; it should return `{"ok":true,...}`.

## 3. Connect the app to the Worker
1. Open your published ALOCHAT website.
2. Tap the gear icon → Settings.
3. Paste your Worker URL, e.g. `https://alochat-api.YOUR-SUBDOMAIN.workers.dev`.
4. Tap **Load AI models**, choose a model, then **Save settings**.
5. Send a message. The Worker forwards it to OpenRouter and streams the response.

## 4. Cost and privacy
- This app code is free to host, but OpenRouter model usage may cost money. Check model pricing and account limits before use.
- Chat history is stored in the browser's localStorage on that device. It is not synced across devices and clearing browser data may erase it.
- Do not send passwords, bank details, or other sensitive information to an AI chatbot.
- Voice input uses browser speech recognition and may depend on browser/device support and network access.
- The app is a working foundation, not a guarantee of production security or uptime. Add rate limiting, abuse protection, monitoring and a privacy policy before public launch.

## 5. Customize
- Change branding and text in `index.html`.
- Change colors in `styles.css`.
- Change AI system instructions in `worker/index.js`.
- Do not commit API keys.
