# TODO

## Auth
- [ ] Set up Resend SMTP for email verification
  - Create account at resend.com (free, 3k emails/month)
  - Supabase → Project Settings → Authentication → SMTP Provider → Custom SMTP
  - Host: smtp.resend.com | Port: 465 | Username: resend | Password: <api key>
  - Re-enable "Confirm email" in Supabase → Authentication → Providers → Email
- [ ] Add Google OAuth
  - Create OAuth credentials in Google Cloud Console
  - Supabase → Authentication → Providers → Google → enable + paste client ID/secret
  - Add production URL to Google OAuth authorized redirect URIs
