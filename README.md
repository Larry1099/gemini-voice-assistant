# Gemini Voice & Text Assistant (Node.js)

A starter application for a Gemini Live voice assistant hosted on Google Cloud Run and embedded in SharePoint Online.

## What it includes

- Node.js + Express backend.
- Vite frontend.
- Short-lived Gemini Live token created on the server.
- Browser microphone capture and PCM audio streaming.
- Gemini audio playback.
- SharePoint iframe framing policy controlled by `SHAREPOINT_ORIGIN`.
- `/health` endpoint for Cloud Run health checks.

## Important notes before production

1. This starter uses the Gemini Live ephemeral-token flow in the official `@google/genai` JavaScript SDK. Google marks parts of the ephemeral-token flow as preview/experimental; model IDs and API versions can change.
2. The default Live model is configurable with `GEMINI_LIVE_MODEL`. If Google no longer offers the default model to your API project, set this variable to a currently supported Live API model in Google AI Studio documentation.
3. Text chat works independently through the Node.js backend. Voice conversation uses a separate Gemini Live session.
4. Add real user authentication, abuse prevention, persistent rate limiting, monitoring, and privacy disclosures before opening this to the public.
5. The in-memory rate limiter is only a basic demonstration; it resets when the service restarts and is not shared between Cloud Run instances.
6. Do not commit `.env` or any real API key to GitHub.

## Requirements

- Node.js 22 or newer.
- A Gemini API key from Google AI Studio.
- A Gemini API project with access/quota for a supported Live API model.
- A GitHub account.
- A Google Cloud project with Cloud Run enabled.

## Run on your computer

1. Download or clone this repository.
2. Open a terminal in the project folder.
3. Install dependencies:

   ```bash
   npm install
   ```

4. Copy `.env.example` to `.env`.
5. Open `.env` and set `GEMINI_API_KEY` to your real key.
6. Set `SHAREPOINT_ORIGIN` to your SharePoint tenant origin, for example `https://contoso.sharepoint.com`. For local-only testing, you can leave it blank.
7. Start the development server in terminal window 1:

   ```bash
   npm run dev
   ```

8. In terminal window 2, start the API server:

   ```bash
   npm start
   ```

   For local development, Vite and Express run on different ports. Use the production build workflow below for the simplest end-to-end test, or configure a Vite proxy for `/api` to `http://localhost:8080`.

### Simpler local production test

```bash
npm install
npm run build
npm start
```

Then open `http://localhost:8080`.

Microphone access is normally restricted to secure contexts (HTTPS) or localhost.

## Push this project to GitHub

1. Sign in at https://github.com.
2. Click the **+** button (top-right) and choose **New repository**.
3. Repository name: `gemini-voice-assistant`.
4. Choose **Private** while you are building and testing.
5. Do not add a README, `.gitignore`, or license because these are already in this folder.
6. Click **Create repository**.
7. On your computer, open a terminal inside this project folder.
8. Run:

   ```bash
   git init
   git add .
   git commit -m "Initial Gemini voice assistant"
   git branch -M main
   git remote add origin https://github.com/YOUR-GITHUB-USERNAME/gemini-voice-assistant.git
   git push -u origin main
   ```

9. Replace `YOUR-GITHUB-USERNAME` with your GitHub username.
10. Refresh the GitHub repository page. You should see the project files.

**Never upload your real `.env` file or API key.** The `.gitignore` file excludes `.env`.

## Deploy to Google Cloud Run from GitHub

1. Open https://console.cloud.google.com/run.
2. Select your Google Cloud project.
3. Click **Deploy container** or **Create service**.
4. Choose the option to deploy from a source repository (the exact label can vary).
5. Connect GitHub if asked and select this repository.
6. Set the build type to Dockerfile if asked.
7. Service name: `gemini-voice-assistant`.
8. Choose a region.
9. Set the container port to `8080` if prompted.
10. For a public website, enable unauthenticated invocation only if that is your intended access model. Protect the application itself with visitor authentication/rate limiting before public production use.
11. Under **Variables & secrets**, add:
    - `GEMINI_API_KEY` = your real Gemini API key (use Secret Manager where possible).
    - `GEMINI_LIVE_MODEL` = a currently supported Live API model.\n    - `GEMINI_TEXT_MODEL` = a currently supported text model (default `gemini-2.5-flash`).
    - `SHAREPOINT_ORIGIN` = your SharePoint tenant origin, e.g. `https://contoso.sharepoint.com`.
12. Deploy.
13. Wait for the deployment to finish.
14. Open the Cloud Run service URL.
15. Test the app over HTTPS.

## Embed in SharePoint

Use the actual Cloud Run URL in the SharePoint Embed web part:

```html
<iframe
  src="https://YOUR-CLOUD-RUN-URL"
  width="100%"
  height="650"
  frameborder="0"
  allow="microphone; autoplay"
  allowfullscreen
  title="Gemini Voice and Text Assistant">
</iframe>
```

In SharePoint HTML Field Security, allow the exact Cloud Run hostname. The Cloud Run service must also send a Content-Security-Policy `frame-ancestors` directive that includes the SharePoint tenant origin. This app uses `SHAREPOINT_ORIGIN` for that purpose.

If your SharePoint site uses a different host name (for example, a separate `-my.sharepoint.com` host or custom domain), configure the exact origin that frames the app. Do not use a wildcard unless you understand the security implications.

## Troubleshooting

- `Could not start Gemini Live`: verify the key, model availability, API version, billing/quota, and Cloud Run logs.\n- Text chat errors: check `GEMINI_TEXT_MODEL`, API access, billing, and Cloud Run logs.
- `Microphone access denied`: use HTTPS, allow microphone access in the browser, and confirm the iframe includes `allow="microphone"`.
- `Embedding refused`: verify the SharePoint HTML Field Security allow-list and `SHAREPOINT_ORIGIN`.
- `404` for `/api/live-token`: make sure the app is served through `server.js`, not by opening the HTML file directly.
- `npm install` fails: confirm Node.js 22 or newer.

## References

- Google Gen AI JavaScript SDK: https://googleapis.github.io/js-genai/
- Google SDK Live ephemeral-token sample: https://github.com/googleapis/js-genai/blob/main/sdk-samples/live_ephemeral.ts
- Gemini Live API: https://ai.google.dev/gemini-api/docs/live
- Gemini Live ephemeral tokens: https://ai.google.dev/gemini-api/docs/live-api/ephemeral-tokens
- Cloud Run: https://cloud.google.com/run/docs
