# MetaMask Connection - ROOT CAUSE FIX

## The Problem
When only the U2PAY page is open (no other files in background), MetaMask connection fails even though the extension is installed and enabled. When other files are open, it works - because they keep the browser/system busy longer, giving MetaMask more time to inject.

## Root Cause
**Race Condition**: The page was checking for `window.ethereum` before MetaMask had time to inject it into the page.

When other files were open in background:
- More system resources used = slower page loading
- Page load slower = more time for MetaMask to inject
- Connection worked!

When only this page open:
- Fast page load
- `window.ethereum` not injected yet
- Connection failed!

## The Solution

### 1. **Early Detection in HTML HEAD** (u2pay.html)
Added inline script that runs BEFORE page loads:
- Starts listening for MetaMask injection immediately
- Listens for `ethereum#initialized` event (fires when MetaMask injects)
- Polls every 250ms for up to 10 seconds
- Stores result in `window.metaMaskInjected` flag

This gives MetaMask multiple opportunities to inject while page is still loading.

### 2. **Aggressive Retry Logic in Click Handler** (app.js)
When user clicks "Connect MetaMask":
- Checks for 8 seconds (was 6) with faster polling (100ms instead of 150ms)
- Performs 80 checks total (vs 40 before)
- If still not found, does 5 more intensive waits of 500ms each
- Total wait time: 8+ seconds

### 3. **Better Troubleshooting Alert**
Now provides 5 specific fix options:
1. Hard refresh (Ctrl+Shift+R)
2. Check MetaMask is connected/unlocked
3. Lock/unlock MetaMask wallet
4. Disable other wallet extensions
5. Full browser restart

### 4. **Enhanced Console Logging**
Shows exactly:
- When HEAD script runs and detects MetaMask
- When click happens
- How many retries before found
- Exact timing in milliseconds
- If it's still failing after all these steps

## How to Test

1. **Close all other applications/tabs**
2. **Hard refresh this page** (Ctrl+Shift+R)
3. **Open DevTools Console** (F12)
4. **Wait for this console message**:
   ```
   ✅ [HEAD] MetaMask detected via polling at XXXms (poll #X)
   ```
5. **Click "Connect MetaMask"**
6. **Watch console** for success or detailed error

## If Still Not Working

1. Open Chrome DevTools (F12)
2. Go to Console tab
3. Paste and run:
   ```javascript
   console.log('MetaMask injected?', window.metaMaskInjected);
   console.log('window.ethereum exists?', !!window.ethereum);
   console.log('window.ethereum.isMetaMask?', window.ethereum?.isMetaMask);
   ```
4. If all show `false` or `undefined`:
   - Go to chrome://extensions
   - Find MetaMask
   - Click reload button ⟳
   - Hard refresh this page
   - Try again

5. If still failing:
   - Completely close Chrome
   - Wait 10 seconds  
   - Restart Chrome
   - Come back to this page

## Technical Details

**u2pay.html changes:**
- Added early detection in `<head>` section
- Listens for `ethereum#initialized` event
- Polls `window.ethereum.isMetaMask` every 250ms
- Runs for first 10 seconds of page load

**app.js changes:**
- connectMetaMask() now waits 8 seconds (vs 6)
- 80 polls at 100ms intervals (vs 40 at 150ms)
- Additional 5×500ms waits if still not found
- Enhanced console logging at each step
- Better error messages with actionable fixes

## Why This Works

The page now gives MetaMask **10+ seconds** total to inject:
- 10 seconds during page load (HEAD script)
- 8+ seconds during connection attempt
- = 18+ seconds total opportunity

This ensures MetaMask has plenty of time to inject even on very fast page loads.
