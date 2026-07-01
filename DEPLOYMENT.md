# Deployment

This project is a Next.js Node app that uses SQLite through `better-sqlite3`.

## Requirements

- Node.js 20.11 or newer
- A writable persistent directory for SQLite in production
- `PAGE_ACCESS_PASSWORD` set to a strong value

## Environment Variables

Copy `.env.example` and set the values on your host:

```env
PAGE_ACCESS_PASSWORD=change-this-before-deploying
SQLITE_DATABASE_PATH=/app/data/content.sqlite
UPLOAD_DIR=/app/public/images/uploads
UPLOAD_PUBLIC_PATH=/images/uploads
```

`SQLITE_DATABASE_PATH` and `UPLOAD_DIR` must point to persistent storage if you want admin edits and uploaded images to survive redeploys.

## Docker

Build and run:

```bash
docker build -t chanmiabek-website .
docker run -p 3000:3000 \
  -e PAGE_ACCESS_PASSWORD=your-strong-password \
  -v chanmiabek-data:/app/data \
  -v chanmiabek-uploads:/app/public/images/uploads \
  chanmiabek-website
```

Then open `http://localhost:3000/api/health` to confirm the database is available.

## Platform Notes

SQLite needs a real writable disk. Use a VPS, Docker host, Railway/Render/Fly.io with a persistent volume, or another Node host that supports mounted storage.

Serverless-only deployments can build the public site, but SQLite writes and image uploads will not be durable without persistent storage.
