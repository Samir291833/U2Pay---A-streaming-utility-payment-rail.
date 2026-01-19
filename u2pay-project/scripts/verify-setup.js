#!/usr/bin/env node

/**
 * U2PAY Project Verification Script
 * Verifies all files exist and have correct structure
 */

const fs = require('fs');
const path = require('path');

const projectRoot = __dirname;

const requiredFiles = [
    // HTML
    'u2pay.html',
    
    // Frontend JS
    'frontend/js/app.js',
    'frontend/js/wallet.js',
    'frontend/js/streaming.js',
    'frontend/js/fiatConversion.js',
    'frontend/js/uiUpdater.js',
    'frontend/js/websocketClient.js',
    
    // Frontend CSS
    'frontend/css/style.css',
    
    // Backend
    'backend/server.js',
    'backend/services/rateService.js',
    'backend/services/nanosecondEngine.js',
    'backend/services/settlementService.js',
    'backend/routes/auth.js',
    'backend/routes/session.js',
    'backend/routes/usage.js',
    'backend/mqtt/iotBridge.js',
    
    // IoT
    'iot-simulator/device.js',
    'iot-simulator/config.json',
    
    // Smart Contracts
    'contracts/StreamingUtilityContract.sol',
    'contracts/Conversion_Contract.sol',
    'contracts/RateNormalizer_Contract.sol',
    'contracts/AccessControl_Contract.sol',
    'contracts/Settlement_Contract.sol',
    
    // Config
    'package.json',
    'hardhat.config.js',
    'scripts/deploy.js',
    'test/streaming.test.js',
    
    // Docs
    'README.md',
    'QUICKSTART.md',
    'ARCHITECTURE.md',
    'DEBUG_AND_TEST.md',
    '.env.example',
    '.gitignore'
];

const requiredDirs = [
    'frontend',
    'frontend/js',
    'frontend/css',
    'backend',
    'backend/services',
    'backend/routes',
    'backend/mqtt',
    'iot-simulator',
    'contracts',
    'scripts',
    'test'
];

console.log('📋 U2PAY Project Verification\n');

let passed = 0;
let failed = 0;

// Check directories
console.log('🗂️  Checking directories...');
requiredDirs.forEach(dir => {
    const dirPath = path.join(projectRoot, dir);
    if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
        console.log(`   ✓ ${dir}`);
        passed++;
    } else {
        console.log(`   ✗ ${dir} - NOT FOUND`);
        failed++;
    }
});

// Check files
console.log('\n📄 Checking files...');
requiredFiles.forEach(file => {
    const filePath = path.join(projectRoot, file);
    if (fs.existsSync(filePath)) {
        const size = fs.statSync(filePath).size;
        console.log(`   ✓ ${file} (${size} bytes)`);
        passed++;
    } else {
        console.log(`   ✗ ${file} - NOT FOUND`);
        failed++;
    }
});

// Check package.json dependencies
console.log('\n📦 Checking package.json...');
try {
    const pkgPath = path.join(projectRoot, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    
    const required = ['express', 'ws', 'mqtt', 'ethers', 'web3', 'hardhat'];
    let missingDeps = [];
    
    required.forEach(dep => {
        if (pkg.dependencies[dep]) {
            console.log(`   ✓ ${dep}: ${pkg.dependencies[dep]}`);
            passed++;
        } else {
            console.log(`   ✗ ${dep} - MISSING`);
            missingDeps.push(dep);
            failed++;
        }
    });
} catch (error) {
    console.log('   ✗ Could not read package.json');
    failed++;
}

// Check HTML structure
console.log('\n🌐 Checking HTML structure...');
try {
    const htmlPath = path.join(projectRoot, 'u2pay.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    const checks = [
        { text: '<title>U2PAY', desc: 'Title' },
        { text: 'id="themeToggle"', desc: 'Theme toggle' },
        { text: 'id="connectMetaMask"', desc: 'MetaMask button' },
        { text: 'id="startService"', desc: 'Start service button' },
        { text: 'frontend/js/app.js', desc: 'app.js script' },
        { text: 'frontend/js/websocketClient.js', desc: 'WebSocket client script' }
    ];
    
    checks.forEach(check => {
        if (htmlContent.includes(check.text)) {
            console.log(`   ✓ ${check.desc}`);
            passed++;
        } else {
            console.log(`   ✗ ${check.desc} - MISSING`);
            failed++;
        }
    });
} catch (error) {
    console.log('   ✗ Could not read HTML file');
    failed++;
}

// Summary
console.log('\n' + '='.repeat(50));
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log('='.repeat(50));

if (failed === 0) {
    console.log('\n🎉 All checks passed! Project structure is valid.\n');
    console.log('Next steps:');
    console.log('1. npm install');
    console.log('2. npm run dev  (in separate terminal)');
    console.log('3. Open u2pay.html in browser\n');
    process.exit(0);
} else {
    console.log(`\n⚠️  ${failed} check(s) failed. Please review above.\n`);
    process.exit(1);
}
