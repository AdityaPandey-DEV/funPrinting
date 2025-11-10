# Quick Setup Guide - Printer API Integration

## Your Current Setup

✅ **Printer API URL (ngrok):** `https://barrie-navigable-unresponsibly.ngrok-free.dev`

## Steps to Configure funPrinting

### 1. Get Your Printer API Key

In your `printer-api` directory, check your `.env` file for the `API_KEY` value:

```bash
cd printer-api
cat .env | grep API_KEY
```

If you don't have one, generate it:

```bash
# Generate a secure API key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Update funPrinting `.env.local`

Add or update these variables in your `funPrinting/.env.local` file:

```env
# Printer API Configuration
PRINTER_API_URLS=["https://barrie-navigable-unresponsibly.ngrok-free.dev"]
PRINTER_API_KEY=your_actual_api_key_from_printer_api_env
PRINTER_API_TIMEOUT=5000
INVOICE_ENABLED=true
RETRY_QUEUE_ENABLED=true
```

**Important:** 
- Replace `your_actual_api_key_from_printer_api_env` with the actual `API_KEY` value from your `printer-api/.env` file
- Make sure the ngrok URL matches your current ngrok tunnel

### 3. Restart funPrinting

After updating `.env.local`, restart your funPrinting application:

```bash
# If running locally
npm run dev

# If deployed on Render/Vercel
# Redeploy or restart the service
```

### 4. Test the Connection

1. **Check Admin Panel:**
   - Go to `https://your-funprinting-url.com/admin/printer-monitor`
   - Verify that "Printer API Status" shows "✅ Online"

2. **Test Health Endpoint:**
   ```bash
   curl https://barrie-navigable-unresponsibly.ngrok-free.dev/health
   ```

3. **Test Print Job:**
   - Place a test order
   - Complete payment
   - Check printer API logs for the print job

## Troubleshooting

### Printer API shows "Offline"
- ✅ Make sure ngrok is running: `ngrok http 3001`
- ✅ Verify the URL in `.env.local` matches your ngrok URL
- ✅ Check that printer-api is running: `npm start` in printer-api directory

### "Unauthorized" Error
- ✅ Verify `PRINTER_API_KEY` in funPrinting matches `API_KEY` in printer-api
- ✅ Check that API key doesn't have extra spaces or quotes

### ngrok URL Changed
- ⚠️ Free ngrok URLs change every time you restart ngrok
- Update `PRINTER_API_URLS` in `.env.local` with the new URL
- Restart funPrinting

### For Production
Consider using:
- **ngrok paid plan** with static domain
- **Cloudflare Tunnel** (free, more stable)
- **Deploy printer API to VPS** (most reliable)

## Next Steps

1. ✅ Configure `.env.local` with your ngrok URL and API key
2. ✅ Restart funPrinting
3. ✅ Test connection via admin panel
4. ✅ Place a test order to verify end-to-end flow

---

**For detailed setup instructions, see:**
- `PRINTER_API_SETUP.md` - Network setup guide
- `printer-api/README.md` - Printer API documentation
- `printer-api/SETUP_NETWORK.md` - Advanced network options

