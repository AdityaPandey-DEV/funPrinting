# Printer API Network Setup Guide

## Problem
- **funPrinting** runs on Render (cloud) at `https://your-app.onrender.com`
- **Printer API** runs locally on `http://localhost:3001`
- They cannot communicate directly because localhost is not accessible from the internet

## Solution: Use ngrok (Recommended)

### Quick Setup Steps

1. **Install ngrok:**
   ```bash
   # macOS
   brew install ngrok
   
   # Or download from https://ngrok.com/download
   ```

2. **Sign up for free ngrok account:**
   - Visit https://ngrok.com
   - Sign up for free account
   - Get your authtoken from https://dashboard.ngrok.com/get-started/your-authtoken

3. **Configure ngrok:**
   ```bash
   ngrok config add-authtoken YOUR_AUTH_TOKEN
   ```

4. **Start Printer API:**
   ```bash
   cd printer-api
   npm start
   ```

5. **In another terminal, start ngrok tunnel:**
   ```bash
   ngrok http 3001
   ```

6. **Copy the forwarding URL:**
   ```
   Forwarding: https://abc123.ngrok-free.app -> http://localhost:3001
   ```

7. **Update funPrinting `.env.local`:**
   ```env
   PRINTER_API_URLS=["https://abc123.ngrok-free.app"]
   PRINTER_API_KEY=your_secure_api_key_here
   PRINTER_API_TIMEOUT=5000
   ```

8. **Restart funPrinting**

### Important Notes

- **Free ngrok URLs change** every time you restart ngrok
- For production, consider:
  - **ngrok paid plan** with static domain
  - **Cloudflare Tunnel** (free, more stable)
  - **Deploy printer API to VPS** (most reliable)

### Alternative Solutions

See `printer-api/SETUP_NETWORK.md` for:
- Cloudflare Tunnel setup
- localtunnel setup
- VPS deployment
- VPN/private network setup

### Testing

1. **Test health endpoint:**
   ```bash
   curl https://your-ngrok-url.ngrok-free.app/health
   ```

2. **Test from Admin Panel:**
   - Go to `/admin/printer-monitor`
   - Check if printer API status shows "Healthy"

3. **Test print job:**
   - Place a test order
   - Complete payment
   - Check printer API logs for print job

---

**For detailed network setup instructions, see `printer-api/SETUP_NETWORK.md`**

