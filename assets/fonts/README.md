# Font Assets

This directory contains fonts used for text overlays in the video pipeline.

## Required Fonts

The default configuration expects these fonts:
- `Montserrat-Bold.ttf` - For intro text
- `Montserrat-SemiBold.ttf` - For segment labels

## Installation

### Option 1: Download from Google Fonts (Recommended)
Run the setup script:
```bash
npx tsx scripts/setup-fonts.ts
```

### Option 2: Manual Download
1. Go to https://fonts.google.com/specimen/Montserrat
2. Click "Download family"
3. Extract the ZIP
4. Copy the following files to this directory:
   - `Montserrat-Bold.ttf`
   - `Montserrat-SemiBold.ttf`

## Using Custom Fonts

You can use any TTF font by:
1. Placing the font file in this directory
2. Updating environment variables:
   ```bash
   TEXT_INTRO_FONT=YourFont-Bold.ttf
   TEXT_SEGMENT_FONT=YourFont-Regular.ttf
   ```

Or programmatically in config:
```typescript
const config = getTextOverlayConfig();
config.intro.font = 'YourFont-Bold.ttf';
```

## Font Licensing

Ensure you have the appropriate license for any fonts used:
- **Montserrat**: SIL Open Font License (free for commercial use)
- Custom fonts: Check licensing requirements
