# 🧪 Service Cost Definition - Test Scenarios

## Test Case 1: Valid Service Cost Definition

### Input:
- **Service Name**: "Wi-Fi Hotspot"
- **Service Cost Value**: 50
- **Currency**: INR (₹)
- **Time Unit**: Hour

### Expected Behavior:
1. ✅ All fields validated
2. ✅ Cost normalization calculated:
   - timeInSeconds = 3600 (hour)
   - costPerSecond = 50 / 3600 = 0.0139 (₹/second)
   - costPerNanosecond = 0.0139 / 1e9 ≈ 1.39e-11
3. ✅ Status shows: "✅ Service cost defined: ₹50/hour"
4. ✅ Mode buttons become ENABLED
5. ✅ Application ready for billing

### Cost Examples at ₹50/hour:
- 1 minute = ₹0.833
- 10 minutes = ₹8.33
- 1 hour = ₹50
- 1 day = ₹1200

---

## Test Case 2: Balance-Based Mode with ₹500 Limit

### Precondition:
- Service cost defined: ₹50/hour
- costPerNanosecond = 50 / 3600 / 1e9

### Input:
- **Max Spending Limit**: ₹500

### Calculation:
```
maxNanoseconds = (500 * 10e10) / costPerNanosecond
               = (5e12) / (50/3600/1e9)
               = (5e12 * 3600 * 1e9) / 50
               = 3.6e23 nanoseconds
               ≈ 10 hours (36,000 seconds)
```

### Expected Behavior:
1. ✅ Max spending validated: ₹500 > 0
2. ✅ System calculates user can afford ~10 hours
3. ✅ Alert shows: "✅ Spending limit set to ₹500 (approximately 10:00:00 of service)"
4. ✅ Service starts automatically using cost_per_ns
5. ✅ Auto-stops when reaching ₹500 spent

---

## Test Case 3: Time-Based Mode with ₹100/Day

### Precondition:
- Service cost defined: ₹100/day
- costPerNanosecond = 100 / 86400 / 1e9

### Input:
- User clicks "⏱️ Time-Based Precision Billing"

### Expected Behavior:
1. ✅ No manual rate input needed (cost already defined)
2. ✅ Alert shows: "✅ Time-based billing ready! Rate: ₹100/day"
3. ✅ Service tracks elapsed time in HH:MM:SS format
4. ✅ Calculates cost in real-time: cost = elapsed_ns * cost_per_ns
5. ✅ User sees: "Total Cost: ₹X.XX | Elapsed: HH:MM:SS"

### Cost Examples at ₹100/day:
- 1 minute ≈ ₹0.069
- 30 minutes ≈ ₹2.08
- 1 hour ≈ ₹4.17
- 8 hours ≈ ₹33.33
- 1 day = ₹100

---

## Test Case 4: Error Handling - Missing Service Name

### Input:
- **Service Name**: (empty)
- **Service Cost Value**: 50
- **Currency**: USD
- **Time Unit**: Minute

### Expected Behavior:
1. ❌ Validation fails
2. ✅ Error shows: "❌ Service name is required"
3. ❌ Status displays in red (error class)
4. ❌ Mode buttons remain DISABLED
5. ❌ No cost normalization occurs

---

## Test Case 5: Error Handling - Negative Cost

### Input:
- **Service Name**: "Invalid Service"
- **Service Cost Value**: -50
- **Currency**: EUR
- **Time Unit**: Day

### Expected Behavior:
1. ❌ Validation fails
2. ✅ Error shows: "❌ Service cost must be a positive number"
3. ❌ Status displays in red
4. ❌ Mode buttons remain DISABLED

---

## Test Case 6: Error Handling - Start Service Without Cost Definition

### Scenario:
- Page just loaded (serviceCostDefined = false)
- User tries to start service

### Expected Behavior:
1. ❌ Check fails: `if (!this.serviceCostDefined)`
2. ✅ Alert: "❌ Service cost must be defined first! Please define the service cost in the section above."
3. ❌ Service does not start
4. ❌ Wallet remains connected but unable to use service

---

## Test Case 7: Time Display Formatting (HH:MM:SS)

### Nanosecond Values → Display:
- 0 ns → 00:00:00
- 1,000,000,000 ns (1 second) → 00:00:01
- 60,000,000,000 ns (1 minute) → 00:01:00
- 3,600,000,000,000 ns (1 hour) → 01:00:00
- 86,400,000,000,000 ns (1 day) → 24:00:00
- 359,999,000,000,000 ns → 99:59:59

### Implementation Verification:
```javascript
formatNanosecondsToTime(1000000000n) 
// Returns: "00:00:01" ✅

formatNanosecondsToTime(3661000000000n) 
// Returns: "01:01:01" ✅

formatNanosecondsToTime(86400000000000n) 
// Returns: "24:00:00" ✅
```

---

## Test Case 8: Cost Consistency - Balance vs Time Mode

### Setup:
- Service cost: ₹60/minute (1 rupee per second)
- costPerNanosecond = 60 / 60 / 1e9 = 1e-9

### Balance Mode - Simulate 5 minutes:
- elapsedNanoseconds = 300e9
- amountSpent = (300e9 * 1e-9) / 10e10 = 300 / 10e10 = ₹3.0e-8 
- Wait, this calculation needs review...

**CORRECTION**: Let me recalculate the scaling:
- Service cost: ₹60/minute
- timeInSeconds = 60
- costBigInt = 60 * 1e10 = 6e11
- costPerSecond = 6e11 / 60 = 1e10
- costPerNanosecond = 1e10 / 1e9 = 10

So if elapsed = 300 seconds:
- costScaled = 300e9 * 10 = 3e12
- amountSpent = 3e12 / 10e10 = 300 / 10000 = ₹0.03... 

This doesn't match. Let me trace through the actual implementation again...

Actually, the scaling is:
```javascript
const costScaled = Number(this.elapsedNanoseconds * this.costPerNanosecond);
this.amountSpent = costScaled / 10000000000; // unscale
```

For 5 minutes (300 seconds = 300e9 nanoseconds) at ₹60/minute:
- costPerNanosecond = (60 / 60) / 1e9 = 1e-9 (but stored as BigInt)
- Actually in BigInt: (60*1e10 / 60) / 1e9 = 1e10 / 1e9 = 10
- costScaled = 300e9 * 10 = 3e12
- amountSpent = 3e12 / 1e10 = 300

So ₹300 for 5 minutes at ₹60/minute = ₹300 total. ✅ Correct!

---

## Test Case 9: Multiple Service Cost Changes (Not Allowed - Design Decision)

### Current Behavior:
- Once service cost defined, user cannot modify it during active session
- Rationale: Prevents billing anomalies during ongoing service
- Design: Modal window appears asking to stop service first

### Expected Behavior:
1. Service cost defined: ₹50/hour
2. Service active for 2 hours
3. User tries to redefine cost to ₹100/hour
4. ✅ Alert: "Cannot redefine cost during active session. Stop service first."
5. ❌ Cost not changed
6. Service continues with original ₹50/hour rate

*(This feature not yet implemented - for Phase 4)*

---

## Test Case 10: All Supported Currencies

### Test Inputs:
```
Currency: INR | Cost: 100 | Time: Minute
Currency: USD | Cost: 2.50 | Time: Hour
Currency: EUR | Cost: 2.25 | Time: Day
```

### Expected Behavior:
1. ✅ All three currencies accepted
2. ✅ Status shows correct symbol:
   - "✅ Service cost defined: ₹100/minute"
   - "✅ Service cost defined: $2.50/hour"
   - "✅ Service cost defined: €2.25/day"
3. ✅ Cost calculations use numeric value, not symbol
4. ❌ Any other currency rejected: "❌ Currency must be INR, USD, or EUR"

---

## Test Case 11: All Supported Time Units

### Test Inputs:
```
Service cost: 100
Time unit: Minute → seconds = 60
Time unit: Hour → seconds = 3600
Time unit: Day → seconds = 86400
```

### Expected Behavior:
1. ✅ All three time units accepted
2. ✅ Correct normalization for each:
   - Minute: 100/60 = 1.667 per second
   - Hour: 100/3600 = 0.0278 per second
   - Day: 100/86400 = 0.00116 per second
3. ✅ Cost calculations differ appropriately
4. ✅ Time unit selector locked to minute/hour/day only

---

## Test Case 12: Real-World Scenario - Public Charging Station

### Setup:
- Service Name: "Fast Charger Station A"
- Service Cost: ₹25
- Currency: INR
- Time Unit: Hour

### User Journey:
```
1. Define Cost: ₹25/hour
   ✅ Status: "Service cost defined: ₹25/hour"
   ✅ Mode buttons enabled

2. Select Balance-Based Mode
   ✅ Set max spending: ₹50

3. Alert: "Spending limit set to ₹50 (approximately 02:00:00 of service)"
   ✅ User can charge for 2 hours

4. Start Service
   ✅ Session begins, cost tracking starts

5. After 30 minutes:
   ✅ Display: "Elapsed: 00:30:00 | Cost: ₹12.50"
   ✅ Spending: ₹12.50 / ₹50 = 25%

6. After 2 hours (₹50 spent):
   ✅ Alert: "Spending limit reached"
   ✅ Service auto-stops
   ✅ Charger disconnects

7. Settle Payment
   ✅ Convert ₹50 to ETH at current rate
   ✅ Charge user exact amount
   ✅ Transaction complete
```

### Verification:
- ✅ Cost calculation: 2 hours * ₹25/hour = ₹50 ✅
- ✅ No hardcoded rates, everything derived from cost definition ✅
- ✅ Fair pricing regardless of currency or time unit ✅

---

## Regression Test: Existing Features Still Work

### Test Points:
- [ ] Wallet connection (MetaMask, WalletConnect, Gmail)
- [ ] Mode switching (Balance ↔ Time)
- [ ] Session tracking (ID, start time, elapsed time)
- [ ] Payment settlement and ETH conversion
- [ ] Theme toggle (Light/Dark mode)
- [ ] Export session data to JSON
- [ ] IoT device simulator
- [ ] Spending limit alerts and auto-stop
- [ ] Device data streaming
- [ ] UI responsiveness

---

## Performance Tests

### Calculation Precision:
- Nanosecond-level calculations maintain integrity
- BigInt prevents floating-point rounding errors
- Scaling factor (1e10) preserves decimals to 10 decimal places

### Memory:
- Service cost data: ~5 properties, minimal memory
- No memory leaks in cost calculation loops
- Intervals properly cleaned up on stop

### Speed:
- Cost normalization: < 1ms
- Real-time updates: 100ms interval (unchanged)
- No UI lag from cost calculations

---

## Notes for Testers

1. **Browser Console**: Monitor for errors with `F12` → Console tab
2. **BigInt Testing**: Test with very large cost values (₹1,000,000/day)
3. **Decimal Precision**: Test with costs like ₹0.01/minute
4. **Mobile**: Test responsive layout on small screens
5. **Wallets**: Test with different blockchain networks

