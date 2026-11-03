# Google OAuth setup

Google social login requires credentials owned by your team; source code cannot safely ship another person's credentials.

1. Create/select a Google Cloud project.
2. Configure the OAuth consent screen.
3. Create an OAuth 2.0 Client ID for a Web application.
4. Add the authorized redirect URI:
   - Local: `http://localhost:3000/auth/google/callback`
   - Public: `https://YOUR_DOMAIN/auth/google/callback`
5. Put the values in `.env` for local npm usage:

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
BASE_URL=http://localhost:3000
```

For Docker Compose, either create a `.env` beside `docker-compose.yml` containing the Google values or export them in the shell before `docker compose up -d`.

Never commit a real client secret to Git.
