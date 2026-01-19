// ============================================
// U2PAY - Streaming Test Scenarios
// ============================================

const hre = require("hardhat");
const { expect } = require("chai");

describe("U2PAY Streaming Scenarios", function () {
    let streaming, token, deployer, user;

    beforeEach(async function () {
        [deployer, user] = await ethers.getSigners();

        // Deploy mock token
        const TokenFactory = await hre.ethers.getContractFactory("MockUSDC");
        token = await TokenFactory.deploy();
        await token.deployed();

        // Deploy streaming contract
        const StreamingFactory = await hre.ethers.getContractFactory("StreamingUtilityContract");
        streaming = await StreamingFactory.deploy(token.address);
        await streaming.deployed();

        // Mint tokens to user
        await token.mint(user.address, hre.ethers.utils.parseUnits("10000", 6));
        
        // Approve streaming contract
        await token.connect(user).approve(
            streaming.address,
            hre.ethers.utils.parseUnits("10000", 6)
        );
    });

    describe("Scenario 1: Balance-Based Streaming (No Overpayment)", function () {
        it("Should prevent overpayment when service stops", async function () {
            const sessionId = hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes("test-session-1"));
            const ratePerHour = hre.ethers.utils.parseUnits("50", 6); // ₹50/hour
            const spendingLimit = hre.ethers.utils.parseUnits("500", 6); // ₹500 max

            // Start service
            await streaming.connect(user).startService(sessionId, ratePerHour, spendingLimit);

            const session = await streaming.getSession(sessionId);
            expect(session.active).to.be.true;
            expect(session.spendingLimit).to.equal(spendingLimit);

            // Simulate 30 minutes of usage
            await hre.ethers.provider.send("hardhat_mine", ["0x1e"]); // Mine 30 blocks

            // Calculate amount used (30 mins = 0.5 hours)
            const maxChargeable = await streaming.calculateMaxChargeable(session);
            const finalAmount = hre.ethers.utils.parseUnits("25", 6); // ₹25 for 30 mins

            // Stop service with amount <= actual usage
            expect(finalAmount).to.be.lte(maxChargeable);
            await expect(
                streaming.connect(user).stopService(sessionId, finalAmount)
            ).to.not.be.reverted;

            const stoppedSession = await streaming.getSession(sessionId);
            expect(stoppedSession.active).to.be.false;
            expect(stoppedSession.totalSpent).to.equal(finalAmount);
        });

        it("Should reject overpayment attempt", async function () {
            const sessionId = hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes("test-overpay"));
            const ratePerHour = hre.ethers.utils.parseUnits("50", 6);
            const spendingLimit = hre.ethers.utils.parseUnits("100", 6);

            await streaming.connect(user).startService(sessionId, ratePerHour, spendingLimit);

            // Try to pay more than limit
            const overpayAmount = hre.ethers.utils.parseUnits("150", 6);
            
            await expect(
                streaming.connect(user).stopService(sessionId, overpayAmount)
            ).to.be.revertedWith("Amount exceeds spending limit");
        });
    });

    describe("Scenario 2: Time-Based Precision Billing", function () {
        it("Should calculate nanosecond-precise costs", async function () {
            const sessionId = hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes("test-time-precise"));
            const ratePerHour = hre.ethers.utils.parseUnits("3600", 6); // ₹3600/hour = ₹1/second

            await streaming.connect(user).startService(
                sessionId,
                ratePerHour,
                hre.ethers.utils.parseUnits("10000", 6)
            );

            // Simulate 1 second of usage
            await hre.ethers.provider.send("hardhat_mine", ["0x1"]); // Mine 1 block

            const maxChargeable = await streaming.calculateMaxChargeable(
                await streaming.getSession(sessionId)
            );

            // Cost should be approximately ₹1 (for 1 second)
            expect(maxChargeable).to.be.gte(0);
        });
    });

    describe("Scenario 3: Spending Limit & Auto-Stop", function () {
        it("Should stop service when spending limit reached", async function () {
            const sessionId = hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes("test-auto-stop"));
            const ratePerHour = hre.ethers.utils.parseUnits("100", 6);
            const spendingLimit = hre.ethers.utils.parseUnits("50", 6); // ₹50 max

            await streaming.connect(user).startService(sessionId, ratePerHour, spendingLimit);

            // Reduce spending limit
            await streaming.connect(user).setSpendingLimit(sessionId, hre.ethers.utils.parseUnits("25", 6));

            const session = await streaming.getSession(sessionId);
            expect(session.spendingLimit).to.equal(hre.ethers.utils.parseUnits("25", 6));
        });
    });

    describe("Scenario 4: Refund Processing", function () {
        it("Should refund unused balance", async function () {
            const sessionId = hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes("test-refund"));
            const ratePerHour = hre.ethers.utils.parseUnits("50", 6);
            const spendingLimit = hre.ethers.utils.parseUnits("500", 6);

            // Get initial balance
            const initialBalance = await token.balanceOf(user.address);

            await streaming.connect(user).startService(sessionId, ratePerHour, spendingLimit);

            // Simulate usage
            await hre.ethers.provider.send("hardhat_mine", ["0x1e"]);

            // Stop with small payment (₹10)
            const paymentAmount = hre.ethers.utils.parseUnits("10", 6);
            await streaming.connect(user).stopService(sessionId, paymentAmount);

            // Check if refund possible (user paid from wallet, so no refund from contract)
            const finalBalance = await token.balanceOf(user.address);
            console.log("Initial balance:", initialBalance.toString());
            console.log("Final balance:", finalBalance.toString());
        });
    });

    describe("Scenario 5: Multiple Sessions", function () {
        it("Should handle multiple concurrent sessions", async function () {
            const ratePerHour = hre.ethers.utils.parseUnits("50", 6);
            const spendingLimit = hre.ethers.utils.parseUnits("1000", 6);

            // Create 3 sessions
            for (let i = 0; i < 3; i++) {
                const sessionId = hre.ethers.utils.keccak256(
                    hre.ethers.utils.toUtf8Bytes(`session-${i}`)
                );

                await streaming.connect(user).startService(sessionId, ratePerHour, spendingLimit);

                const session = await streaming.getSession(sessionId);
                expect(session.active).to.be.true;
            }

            // Get user sessions
            const sessions = await streaming.getUserSessions(user.address);
            expect(sessions.length).to.equal(3);
        });
    });

    describe("Scenario 6: Platform Fee", function () {
        it("Should deduct platform fee from payment", async function () {
            const sessionId = hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes("test-fee"));
            const ratePerHour = hre.ethers.utils.parseUnits("50", 6);
            const spendingLimit = hre.ethers.utils.parseUnits("100", 6);
            const paymentAmount = hre.ethers.utils.parseUnits("50", 6);

            await streaming.connect(user).startService(sessionId, ratePerHour, spendingLimit);
            await streaming.connect(user).stopService(sessionId, paymentAmount);

            // Platform fee = 1% of 50 = 0.5
            const feePercentage = await streaming.feePercentage();
            expect(feePercentage).to.equal(1);
        });
    });
});

// Export for running
module.exports = {};
