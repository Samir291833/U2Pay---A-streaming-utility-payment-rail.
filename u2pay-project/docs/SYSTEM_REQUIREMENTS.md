# 🔐 U2PAY System Requirements - Phase 3 Update

## Core Requirement (MANDATORY)

```
Before ANY billing can occur, the system REQUIRES:
┌──────────────────────────────────────────────────┐
│ SERVICE COST DEFINITION (Cannot be skipped)      │
├──────────────────────────────────────────────────┤
│ ✓ Service Name (text, e.g., "Wi-Fi")            │
│ ✓ Service Cost Value (number, must be > 0)      │
│ ✓ Currency (INR, USD, or EUR only)              │
│ ✓ Time Unit (minute, hour, or day only)         │
└──────────────────────────────────────────────────┘
```

## What This Means for Users

### ❌ User CANNOT Do
1. ❌ Start service without defining cost
2. ❌ Use balance-based mode without cost defined
3. ❌ Use time-based mode without cost defined
4. ❌ Click mode buttons until cost is defined
5. ❌ Set spending limit without knowing service cost

### ✅ User MUST Do
1. ✅ Define service cost first (mandatory)
2. ✅ Provide all required service cost fields
3. ✅ Use only supported currencies (INR/USD/EUR)
4. ✅ Use only supported time units (minute/hour/day)
5. ✅ Click "✓ Define Cost" button

### ✅ User CAN Then Do
1. ✅ Select billing mode (balance-based or time-based)
2. ✅ Start service
3. ✅ Monitor cost in real-time
4. ✅ Stop service and settle payment

---

## Economic Validity Guarantee

### Before Phase 3
**Problem**: "System allows spending limits without defining service cost"
- User could set max_spend = ₹500 with NO knowledge of actual cost
- Question unanswerable: "How much service time is that?"
- Calculations were mathematically meaningless

### After Phase 3
**Solution**: Service cost is the SOURCE OF TRUTH
```
Service Cost: ₹50/Hour
               ↓
    cost_per_nanosecond = (50/3600)/1e9
               ↓
    max_time = spending_limit / cost_per_nanosecond
               ↓
    For ₹500 max: 500/(50/hour) = 10 hours
               ↓
    User knows EXACTLY what they're paying for
```

---

## Single Source of Truth

### Both Billing Modes Use SAME Formula

**Balance-Based Mode**:
```
cost = elapsed_nanoseconds × cost_per_nanosecond
```

**Time-Based Mode**:
```
cost = elapsed_nanoseconds × cost_per_nanosecond
```

**Same calculation** = Fair pricing regardless of mode

---

## Locked Design (By Requirement)

### Currencies (No Other Options)
| Code | Symbol | Supported |
|------|--------|-----------|
| INR  | ₹      | ✅ YES   |
| USD  | $      | ✅ YES   |
| EUR  | €      | ✅ YES   |
| GBP  | £      | ❌ NO    |
| JPY  | ¥      | ❌ NO    |
| CNY  | ¥      | ❌ NO    |
| AUD  | $      | ❌ NO    |
| CAD  | $      | ❌ NO    |
| Others | -    | ❌ NO    |

### Time Units (No Other Options)
| Unit   | Seconds | Supported |
|--------|---------|-----------|
| Second | 1       | ❌ NO    |
| Minute | 60      | ✅ YES   |
| Hour   | 3600    | ✅ YES   |
| Day    | 86400   | ✅ YES   |
| Week   | 604800  | ❌ NO    |
| Month  | varies  | ❌ NO    |
| Year   | varies  | ❌ NO    |

**Rationale**: Only practical units for real-world services

---

## Required Validations

System enforces at EVERY entry point:

```
1. Service Cost Definition
   ├─ Service name: Required, non-empty
   ├─ Service cost: Required, positive number (no zero, no negative)
   ├─ Currency: Must be in {INR, USD, EUR}
   └─ Time unit: Must be in {minute, hour, day}

2. Mode Button Click
   └─ serviceCostDefined must be true (pre-check at construction)

3. Set Maximum Amount (Balance Mode)
   ├─ serviceCostDefined must be true
   └─ amount must be > 0

4. Set Time Rate (Time Mode)
   └─ serviceCostDefined must be true

5. Start Service
   └─ serviceCostDefined must be true
```

---

## Error Handling

### All Validation Errors Show Clear Messages

| Scenario | Error Message | User Action |
|----------|---------------|------------|
| Empty name | "❌ Service name is required" | Enter service name |
| Cost ≤ 0 | "❌ Service cost must be a positive number" | Enter valid cost |
| Wrong currency | "❌ Currency must be INR, USD, or EUR" | Select valid currency |
| Wrong time unit | "❌ Time unit must be minute, hour, or day" | Select valid unit |
| Cost not defined | "❌ Service cost must be defined first!" | Define cost first |

---

## Key Numbers

### Time Constants
- 1 second = 1,000,000,000 nanoseconds (1e9)
- 1 minute = 60 seconds
- 1 hour = 3,600 seconds
- 1 day = 86,400 seconds
- Max displayable time: 99:59:59 (≈4.17 days)

### Scaling Factor
- Internal: BigInt for nanosecond precision
- Scaling: 1e10 (preserves 10 decimal places)
- Display: Always HH:MM:SS (never nanoseconds)

### Formula Precision
```javascript
cost_per_nanosecond = (service_cost / time_in_seconds) / 1,000,000,000

Example: ₹50/Hour
         (50 / 3600) / 1e9
         = 0.01389 / 1e9
         ≈ 1.389e-11 (per nanosecond)
```

---

## Integration Points

### What Changed
- ✅ **UI**: Service cost definition section added
- ✅ **Logic**: Cost normalization implemented
- ✅ **Validation**: Mandatory checks at 3 locations
- ✅ **Calculations**: Both modes use costPerNanosecond
- ✅ **Display**: Time shown as HH:MM:SS

### What Stayed Same
- ❌ **Wallet connection**: Unchanged
- ❌ **Session tracking**: Unchanged
- ❌ **Payment settlement**: Unchanged (for now)
- ❌ **ETH conversion**: Unchanged
- ❌ **Device simulator**: Unchanged
- ❌ **All other features**: Unchanged

---

## For Developers

### State Management
```javascript
// Service cost state
this.serviceCostDefined = false;      // boolean
this.serviceName = '';                // string
this.serviceCostValue = 0;            // number
this.serviceCostCurrency = 'INR';     // string
this.serviceCostTimeUnit = 'minute';  // string
this.costPerNanosecond = 0n;          // BigInt
```

### Methods to Use
```javascript
// Define service cost (user calls via button)
this.defineServiceCost()
  → validates inputs
  → calculates costPerNanosecond
  → enables mode buttons

// Format nanoseconds for display (internal)
this.formatNanosecondsToTime(nanoseconds)
  → returns "HH:MM:SS" string

// Calculate cost (automatic in update loops)
cost = elapsedNanoseconds * costPerNanosecond
```

### Mandatory Checks
```javascript
if (!this.serviceCostDefined) {
    alert('Service cost must be defined first!');
    return;
}
```

---

## For QA Testing

### Must Test
1. ✅ Service cost definition with all field combinations
2. ✅ Error messages for invalid inputs
3. ✅ Mode buttons disabled on load
4. ✅ Mode buttons enabled after cost definition
5. ✅ Cannot start service without cost defined
6. ✅ Cannot set max amount without cost defined
7. ✅ Cost calculation matches formula
8. ✅ Time displays as HH:MM:SS only

### Edge Cases
1. ✅ Cost = 0 (should fail validation)
2. ✅ Negative cost (should fail validation)
3. ✅ Very large cost (₹999,999)
4. ✅ Very small cost (₹0.01)
5. ✅ Missing fields (should fail validation)
6. ✅ Rapid mode switching (should work)

### Performance
1. ✅ Cost calculation speed < 1ms
2. ✅ No UI lag during billing
3. ✅ Real-time display 100ms (no change)

---

## System Guarantee

### Economic Validity ✅
```
"System cannot function unless it knows:
  How much the real-world service costs per unit time"
  
GUARANTEE: This is now ENFORCED
```

### Fair Pricing ✅
```
"Both balance-based and time-based modes use
  the SAME cost_per_nanosecond calculation"
  
GUARANTEE: This is now ENFORCED
```

### User Control ✅
```
"Users explicitly define service cost
  before ANY billing can occur"
  
GUARANTEE: This is now ENFORCED
```

---

## Success Criteria

✅ All requirements met:
- Service cost definition is MANDATORY
- Formula implemented correctly
- Both modes use same cost_per_nanosecond
- Currencies locked to 3 options
- Time units locked to 3 options
- No hardcoded rates or defaults
- Clear validation at every entry point
- User-friendly error messages
- Time displayed as HH:MM:SS only
- Complete documentation

**Status: PHASE 3 COMPLETE ✅**

