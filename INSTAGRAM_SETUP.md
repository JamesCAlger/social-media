# Instagram Distribution Setup Guide

This guide walks you through setting up Instagram posting for your social media pipeline.

## Overview

The pipeline uses **Instagram Graph API** to post videos as **Reels**. The flow is:
1. Video uploads to Google Drive (for public hosting)
2. Instagram fetches video from Google Drive URL
3. Video publishes as a Reel on your Instagram profile

---

## Prerequisites Checklist

Before starting, ensure you have:

- [ ] Instagram account converted to **Business** or **Creator** account
- [ ] Instagram account linked to a **Facebook Page**
- [ ] Facebook Developer account (free at developers.facebook.com)
- [ ] Google Drive service account configured (already done ✅)

---

## Step 1: Convert to Instagram Business Account

1. **Open Instagram app** on your phone
2. Go to **Settings** → **Account**
3. Tap **Switch to Professional Account**
4. Choose **Business** or **Creator** (Business recommended)
5. Complete the setup wizard

---

## Step 2: Connect Instagram to Facebook Page

### Option A: If you have a Facebook Page

1. In Instagram: **Settings** → **Account** → **Linked Accounts**
2. Tap **Facebook**
3. Log in and select your Facebook Page
4. Confirm the connection

### Option B: If you DON'T have a Facebook Page

1. Go to [facebook.com/pages/create](https://www.facebook.com/pages/create)
2. Create a new Page (choose Business/Brand category)
3. Fill in basic information (name, category, description)
4. Then follow Option A steps above

⚠️ **Important**: Your Instagram Business account MUST be connected to a Facebook Page to use the API.

---

## Step 3: Create Facebook App

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Click **My Apps** (top right)
3. Click **Create App**
4. Choose app type: **Business**
5. Fill in:
   - **App Display Name**: "Social Media Pipeline" (or your choice)
   - **App Contact Email**: Your email
6. Click **Create App**

---

## Step 4: Add Instagram Graph API

1. In your new app dashboard, find **Add Products**
2. Find **Instagram** product → Click **Set Up**
3. This adds Instagram API to your app

---

## Step 5: Get Access Token

### Quick Method (60-day token - Good for Testing)

1. Go to [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. Select your app from dropdown (top right)
3. Click **Permissions** (below the access token field)
4. Add these permissions:
   - `instagram_basic`
   - `instagram_content_publish`
   - `pages_read_engagement`
5. Click **Generate Access Token**
6. Log in and authorize the permissions
7. **Copy the token** → This is your `INSTAGRAM_ACCESS_TOKEN`

**Token will expire in 60 days.** For long-lived tokens, see below.

---

## Step 6: Get Business Account ID

1. Still in [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. In the query field, enter: `me/accounts`
3. Click **Submit**
4. Find your Facebook Page in the results → Copy its `id`
5. Now query: `{PAGE_ID}?fields=instagram_business_account`
   - Replace `{PAGE_ID}` with the ID you just copied
6. Click **Submit**
7. Copy `instagram_business_account.id` → This is your `INSTAGRAM_BUSINESS_ACCOUNT_ID`

Example response:
```json
{
  "instagram_business_account": {
    "id": "17841405309211844"  ← This is what you need
  },
  "id": "123456789"
}
```

---

## Step 7: Update .env File

Edit `.env` and update these lines:

```bash
# Fix Google Drive Folder ID (extract ID from URL)
GOOGLE_DRIVE_FOLDER_ID=1ysTp3FdViDpo0qQRK-6pEGLAxkJp7q38

# Instagram Credentials
INSTAGRAM_ACCESS_TOKEN=EAABsbCS...your_actual_token_here
INSTAGRAM_BUSINESS_ACCOUNT_ID=17841405309211844

# Enable Distribution
ENABLE_DISTRIBUTION=true
ENABLE_INSTAGRAM=true
```

---

## Step 8: Test Google Drive Upload

Before testing Instagram, verify Google Drive works:

```bash
npm run test-google-drive
```

**Expected output:**
```
✅ Upload successful!
🔗 Public URL: https://drive.google.com/uc?export=download&id=...
```

If this fails:
- Check service account key file exists
- Verify service account has Drive API enabled
- Ensure Drive API is enabled in Google Cloud Console

---

## Step 9: Test Instagram Posting

Now test the full Instagram flow:

```bash
npm run test-instagram
```

This will:
1. Upload video to Google Drive
2. Create Instagram media container
3. Publish to Instagram Reels

**Expected output:**
```
✅ Successfully posted to Instagram!
📱 Post URL: https://www.instagram.com/reel/...
```

**Check your Instagram profile** to see the Reel!

---

## Troubleshooting

### Error: "Invalid OAuth access token"
- Token expired (short-lived tokens last 60 days)
- Token not generated with correct permissions
- **Solution**: Generate new token with all required permissions

### Error: "Unsupported post request"
- Instagram account not Business/Creator type
- Account not linked to Facebook Page
- **Solution**: Complete Steps 1-2 above

### Error: "Invalid media file"
- Video doesn't meet Instagram Reels requirements
- Google Drive URL not accessible
- **Solution**: Check video is 720p, 9:16, H.264, under 4GB

### Error: "Could not create media container"
- Access token missing `instagram_content_publish` permission
- Business Account ID incorrect
- **Solution**: Re-generate token with correct permissions, verify Business Account ID

### Google Drive upload fails
- Service account key file not found
- Service account not shared on Drive folder
- Drive API not enabled
- **Solution**: Check `GOOGLE_SERVICE_ACCOUNT_KEY_PATH` in .env

---

## Long-Lived Access Tokens (Optional)

### Get 60-90 Day Token

After getting short-lived token from Graph API Explorer:

```bash
curl -X GET "https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id={APP_ID}&client_secret={APP_SECRET}&fb_exchange_token={SHORT_LIVED_TOKEN}"
```

Replace:
- `{APP_ID}`: Your app ID (from App Dashboard)
- `{APP_SECRET}`: Your app secret (Settings → Basic)
- `{SHORT_LIVED_TOKEN}`: Token from Graph API Explorer

Response:
```json
{
  "access_token": "EAAB...",
  "token_type": "bearer",
  "expires_in": 5183944  // ~60 days
}
```

### Get Never-Expiring Token (Production)

For production, use **System User** tokens:

1. Go to [Meta Business Settings](https://business.facebook.com/settings/)
2. **Users** → **System Users** → **Add**
3. Name: "Social Media Pipeline Bot"
4. Admin access: **Admin**
5. After creation, click the user → **Generate New Token**
6. Select your app
7. Add permissions: `instagram_basic`, `instagram_content_publish`
8. Copy the token (never expires unless revoked)

---

## Next Steps

After successful Instagram posting:

1. **Run full pipeline**: `npm run pipeline`
   - This will run all 6 layers end-to-end
   - Layer 5 will send Telegram review
   - Layer 6 will post to Instagram after approval

2. **Set up cron** for daily automation:
   - Edit `CRON_SCHEDULE` in .env (default: `0 9 * * *` = 9 AM daily)
   - Run: `npm run cron`

3. **Monitor costs**:
   - Check `logs/combined.log` for cost tracking
   - Each video costs ~$0.78 (API costs only)

4. **Optional**: Add TikTok and YouTube (secondary platforms)

---

## Instagram Reels Requirements

Your videos MUST meet these specifications:

- **Format**: MP4 (H.264 codec)
- **Resolution**: Minimum 720p
- **Aspect Ratio**: 9:16 (vertical)
- **Duration**: 3-90 seconds (your pipeline generates 15s ✅)
- **File Size**: Under 4GB
- **Frame Rate**: 23-60 FPS

✅ Your pipeline videos already meet all requirements!

---

## API Rate Limits

Instagram Graph API limits:

- **200 calls per hour per user**
- **Creating media containers**: ~25 per day (may vary)

Your pipeline uses **2 API calls per video** (create + publish), so you can post ~12 videos/day comfortably.

For 1 video/day (MVP goal), you're well within limits.

---

## Cost Summary

**Instagram API**: FREE (no cost)
**Google Drive**: FREE (15 GB free tier, each video ~6-10 MB)
**Total additional cost**: $0 💰

Main costs remain:
- OpenAI/Claude: ~$0.03 per video
- Fal.ai video generation: ~$0.75 per video
- **Total: ~$0.78 per video**

---

## Support & Documentation

- [Instagram Graph API Docs](https://developers.facebook.com/docs/instagram-api)
- [Instagram Content Publishing](https://developers.facebook.com/docs/instagram-api/guides/content-publishing)
- [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
- [Meta Business Help](https://business.facebook.com/business/help)

---

## Quick Reference Commands

```bash
# Test Google Drive upload
npm run test-google-drive

# Test Instagram posting (after credentials set)
npm run test-instagram

# Run full pipeline (all 6 layers)
npm run pipeline

# Start Telegram review poller
npm run telegram-poller

# Run daily automation
npm run cron
```

---

**Last Updated**: 2025-11-05
**Status**: Ready for Instagram posting after credential setup
