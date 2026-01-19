# MetaMask Connection Debugging Guide

## What to Do If MetaMask Still Shows "Not Detected"

### Step 1: Check MetaMask Installation & Status
Open Chrome DevTools (F12 or Right-click → Inspect) and paste this in the **Console** tab:

```javascript
// Check if MetaMask is available
console.log('window.ethereum exists:', typeof window.ethereum !== 'undefined');
console.log('window.ethereum.isMetaMask:', window.ethereum?.isMetaMask);
console.log('Full ethereum object:', window.ethereum);

// Check Chrome extensions
console.log('\n=== Quick Status ===');
if (window.ethereum?.isMetaMask) {
    console.log('✅ MetaMask IS detected and available!');
} else {
    console.log('❌ MetaMask NOT detected');
}
```

### Step 2: Verify MetaMask Extension Status
1. Click the **Chrome Extensions** icon (puzzle piece) in top-right
2. Look for "MetaMask" in the list
3. Make sure it's **enabled** (not grayed out)
4. Click on MetaMask - make sure it shows "Connected" or ready state

### Step 3: Try Refreshing Multiple Ways
1. **Normal Refresh**: Press `Ctrl+R` or `F5`
2. **Hard Refresh**: Press `Ctrl+Shift+R` (clears cache)
3. **Full Extension Reload**: 
   - Go to `chrome://extensions`
   - Find MetaMask
   - Click the refresh icon ⟳ on the MetaMask card

### Step 4: Check for Extension Conflicts
Multiple wallet extensions can conflict. Try:
1. Disable all other wallet extensions (Phantom, Coinbase, etc.)
2. Refresh this page
3. Try MetaMask connection again
4. If it works now, re-enable other extensions one by one to find conflicts

### Step 5: Restart MetaMask
1. Click MetaMask extension icon
2. Look for settings/menu (⋮ or similar)
3. Select "Lock wallet" or close the extension
4. Re-open MetaMask
5. Enter your password if needed
6. Refresh this page and try again

### Step 6: Restart Chrome Completely
1. Close Chrome entirely
2. Wait 5 seconds
3. Open Chrome again
4. Go back to this page
5. Try MetaMask connection

### Step 7: Reinstall MetaMask (Last Resort)
1. Go to `chrome://extensions`
2. Click "Remove" on MetaMask
3. Go to https://metamask.io
4. Click "Install" for Chrome
5. Follow the installation wizard
6. Restore your wallet using recovery phrase
7. Refresh this page and try connection

## Advanced Debugging

### Check MetaMask Injection Timing
Run this in console:

```javascript
// Check when MetaMask was injected
const checkMetaMask = setInterval(() => {
    if (window.ethereum?.isMetaMask) {
        console.log('✅ MetaMask detected at:', new Date().toLocaleTimeString());
        clearInterval(checkMetaMask);
    }
}, 100);

// Stop checking after 10 seconds
setTimeout(() => {
    clearInterval(checkMetaMask);
    console.log('MetaMask detection check stopped');
}, 10000);
```

### Check if App Detected MetaMask
Run this in console:

```javascript
// Check if the app detected MetaMask
if (window.app) {
    console.log('App MetaMask Available:', window.app.metaMaskAvailable);
    console.log('App Check Complete:', window.app.metaMaskCheckComplete);
    console.log('Wallet Connected:', window.app.isConnected);
} else {
    console.log('App not initialized yet');
}
```

### Manual Connection Test
Run this in console to manually test connection:

```javascript
async function testMetaMaskConnection() {
    try {
        console.log('Starting MetaMask test...');
        
        if (!window.ethereum) {
            console.error('❌ window.ethereum not available');
            return;
        }
        
        if (!window.ethereum.isMetaMask) {
            console.error('❌ Not MetaMask');
            return;
        }
        
        console.log('✅ MetaMask detected');
        
        // Request accounts
        const accounts = await window.ethereum.request({ 
            method: 'eth_requestAccounts' 
        });
        
        console.log('✅ Accounts retrieved:', accounts);
        console.log('✅ First account:', accounts[0]);
        
    } catch (error) {
        console.error('❌ Error:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
    }
}

// Run the test
testMetaMaskConnection();
```

## Common Error Codes

| Code | Meaning | Fix |
|------|---------|-----|
| **undefined** | MetaMask not injected | Refresh page, enable extension |
| **4001** | User rejected connection | Click approve in MetaMask popup |
| **-32002** | Request already pending | Check MetaMask window, wait and retry |
| **-32603** | Internal MetaMask error | Restart MetaMask, try again |

## If Nothing Works

1. **Check MetaMask Status Page**: https://status.metamask.io
2. **Update MetaMask**: Go to chrome://extensions, check for updates
3. **Check Chrome Version**: You need Chrome 100+ (run `chrome://version/`)
4. **Try Different Browser**: Test in Firefox with MetaMask to rule out Chrome issue

## Contact Support

If you've tried all steps above:
1. Take a screenshot of the Console (F12) showing the errors
2. Note your Chrome version (chrome://version)
3. Note your MetaMask version (MetaMask → Settings → About)
4. Contact: samirsharma854@gmail.com with details
