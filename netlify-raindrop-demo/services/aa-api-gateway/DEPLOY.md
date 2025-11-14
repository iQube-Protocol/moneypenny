# Deploy aa-api-gateway

## Fastest Path: Railway.app (5 minutes)

1. Go to https://railway.app/ and sign in with GitHub
2. Click "New Project" → "Deploy from GitHub repo"
3. Select this repo and choose the `services/aa-api-gateway` directory
4. Railway auto-detects Node.js and will use `npm start`
5. Add environment variables:
   - `DATABASE_URL` = your Supabase Postgres connection string
   - `PORT` = 8787
   - `CORS_ORIGIN` = *
6. Deploy completes in ~2 minutes
7. Railway gives you a URL like `aa-api-gateway-production-xxxx.up.railway.app`
8. Add custom domain in Railway settings:
   - Domain: `gateway.dev-beta.aigentz.me`
   - Follow DNS instructions (add CNAME record)

## Alternative: Render.com (also fast)

1. Go to https://render.com and sign in with GitHub
2. New → Web Service → Connect this repo
3. Root directory: `services/aa-api-gateway`
4. Build command: `npm install && npm run build`
5. Start command: `npm start`
6. Add environment variables (same as above)
7. Add custom domain in settings

## Environment Variables Required

```
DATABASE_URL=postgresql://user:pass@host:5432/dbname
PORT=8787
CORS_ORIGIN=*
```

## DNS Configuration

After deployment, add this CNAME record:
```
gateway.dev-beta.aigentz.me → <your-railway-or-render-url>
```

## Test After Deploy

```bash
curl 'https://gateway.dev-beta.aigentz.me/quotes?chain=ethereum&size_usd=1000' \
  -H 'X-Api-Key: AGZK_prod_a12dd08f4e48fea0d52948ce7f9346ef07fce86ed7631e603acce8e4f89a35cd'
```
