# Environment Setup

## Files

Use `.env.local` for local development and deployment provider environment variables for production. Do not commit `.env.local`.

Start from:

```powershell
Copy-Item .env.example .env.local
```

## Variables

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_DEFAULT_CUSTOMER_BUSINESS_ID=
```

## Required

- `VITE_SUPABASE_URL`: Supabase project API URL from Project Settings > API.
- `VITE_SUPABASE_ANON_KEY`: Supabase public anon key from Project Settings > API.

The production build throws an error if either required value is missing. This prevents deploying a build that silently points to placeholder Supabase credentials.

## Optional

- `VITE_DEFAULT_CUSTOMER_BUSINESS_ID`: default tenant id used by public/customer flows when a business id is not provided by route or context.

## Security Rules

- Never add `SUPABASE_SERVICE_ROLE_KEY` to any `VITE_` variable.
- Never use service role keys in browser code.
- Restrict production Auth redirect URLs in Supabase to the deployed domain.
- Rotate anon keys if they are accidentally committed or shared outside the team.

## Local Verification

Run:

```powershell
npm run dev
npm run test
npm run build
```

If environment variables are missing in development, the app logs a warning. In production, the app fails fast.
