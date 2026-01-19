// ============================================
// U2PAY - Smart Contract Deployment Script
// ============================================

const hre = require("hardhat");

async function main() {
    console.log("🚀 Deploying U2PAY Smart Contracts...\n");

    const [deployer] = await ethers.getSigners();
    console.log(`📝 Deploying with account: ${deployer.address}\n`);

    // ============================================
    // 1. Deploy Mock Payment Token (for testing)
    // ============================================
    
    console.log("1️⃣  Deploying Mock USDC Token...");
    const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
    const token = await MockUSDC.deploy();
    await token.deployed();
    console.log(`✓ MockUSDC deployed: ${token.address}\n`);

    // ============================================
    // 2. Deploy Conversion Contract
    // ============================================

    console.log("2️⃣  Deploying Conversion Contract...");
    const ConversionContract = await hre.ethers.getContractFactory("Conversion_Contract");
    const conversion = await ConversionContract.deploy();
    await conversion.deployed();
    console.log(`✓ Conversion Contract deployed: ${conversion.address}\n`);

    // ============================================
    // 3. Deploy Rate Normalizer Contract
    // ============================================

    console.log("3️⃣  Deploying Rate Normalizer Contract...");
    const RateNormalizer = await hre.ethers.getContractFactory("RateNormalizer_Contract");
    const rateNormalizer = await RateNormalizer.deploy();
    await rateNormalizer.deployed();
    console.log(`✓ Rate Normalizer deployed: ${rateNormalizer.address}\n`);

    // ============================================
    // 4. Deploy Access Control Contract
    // ============================================

    console.log("4️⃣  Deploying Access Control Contract...");
    const AccessControl = await hre.ethers.getContractFactory("AccessControl_Contract");
    const accessControl = await AccessControl.deploy();
    await accessControl.deployed();
    console.log(`✓ Access Control deployed: ${accessControl.address}\n`);

    // ============================================
    // 5. Deploy Settlement Contract
    // ============================================

    console.log("5️⃣  Deploying Settlement Contract...");
    const Settlement = await hre.ethers.getContractFactory("Settlement_Contract");
    const settlement = await Settlement.deploy(deployer.address);
    await settlement.deployed();
    console.log(`✓ Settlement Contract deployed: ${settlement.address}\n`);

    // ============================================
    // 6. Deploy Streaming Utility Contract
    // ============================================

    console.log("6️⃣  Deploying Streaming Utility Contract...");
    const StreamingUtility = await hre.ethers.getContractFactory("StreamingUtilityContract");
    const streaming = await StreamingUtility.deploy(token.address);
    await streaming.deployed();
    console.log(`✓ Streaming Utility deployed: ${streaming.address}\n`);

    // ============================================
    // Save Deployment Info
    // ============================================

    const deploymentInfo = {
        network: hre.network.name,
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        contracts: {
            MockUSDC: token.address,
            ConversionContract: conversion.address,
            RateNormalizerContract: rateNormalizer.address,
            AccessControlContract: accessControl.address,
            SettlementContract: settlement.address,
            StreamingUtilityContract: streaming.address
        }
    };

    const fs = require("fs");
    fs.writeFileSync(
        "deployment-info.json",
        JSON.stringify(deploymentInfo, null, 2)
    );

    console.log("✅ Deployment Complete!\n");
    console.log("📋 Deployment Info saved to: deployment-info.json");
    console.log("\n" + JSON.stringify(deploymentInfo, null, 2));

    // ============================================
    // Initialize Contracts
    // ============================================

    console.log("\n🔧 Initializing Contracts...\n");

    // Grant USER_ROLE to deployer in AccessControl
    const USER_ROLE = hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes("USER_ROLE"));
    await accessControl.grantRole(USER_ROLE, deployer.address);
    console.log("✓ Granted USER_ROLE to deployer");

    // Mint tokens to deployer
    const amount = hre.ethers.utils.parseUnits("10000", 6); // 10,000 USDC
    await token.mint(deployer.address, amount);
    console.log("✓ Minted 10,000 MockUSDC to deployer");

    console.log("\n🎉 U2PAY contracts deployed and initialized successfully!\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
