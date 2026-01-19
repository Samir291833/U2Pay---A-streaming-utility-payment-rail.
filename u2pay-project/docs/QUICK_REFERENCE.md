# 📋 Service Cost Definition - Quick Reference

## What Was Added?

A **mandatory service cost definition layer** that enforces economic validity before any billing can occur.

## Core Formula

```
cost_per_nanosecond = (service_cost / time_in_seconds) / 1_000_000_000
```

### Steps:
1. Convert time unit to seconds: minute→60, hour→3600, day→86400
2. Divide service cost by seconds to get cost per second
3. Divide by 1 billion (1e9) to get cost per nanosecond

## Key Rules

### ✅ MANDATORY
- [ ] Service cost MUST be defined before starting any service
- [ ] Both mode buttons are DISABLED until cost is defined
- [ ] All attempts to start service check: `if (!this.serviceCostDefined) return`

### 🔒 LOCKED (User Cannot Change)
**Currencies**: INR, USD, EUR only
**Time Units**: Minute, Hour, Day only

### 📊 Both Modes Use Same Cost
- Balance-Based: `cost = elapsed_ns * cost_per_ns`
- Time-Based: `cost = elapsed_ns * cost_per_ns`
- **Single source of truth**: costPerNanosecond

## Files Changed

| File | Changes |
|------|---------|
| `u2pay.html` | Added service cost definition UI section (lines 37-62) |
| `frontend/css/style.css` | Added styling for cost section, input group, disabled buttons |
| `frontend/js/app.js` | Added 3 new methods, modified 5 existing methods, added 5 properties |

## New JavaScript Methods

### `normalizeServiceCost(serviceCost, timeUnit)`
Converts user input to cost_per_nanosecond using the formula above.
- **Input**: Fiat amount + time unit
- **Output**: BigInt cost per nanosecond
- **Used By**: defineServiceCost()

### `defineServiceCost()`
Validates inputs, calculates cost, enables mode buttons.
- **Triggered By**: User clicks "✓ Define Cost" button
- **Checks**: Name, cost > 0, currency in {INR, USD, EUR}, unit in {minute, hour, day}
- **Sets**: serviceCostDefined = true, costPerNanosecond
- **Enables**: Mode buttons

### `formatNanosecondsToTime(nanoseconds)`
Displays nanoseconds as HH:MM:SS (never show raw nanoseconds).
- **Input**: BigInt nanoseconds
- **Output**: String "HH:MM:SS"
- **Example**: 3661000000000 ns → "01:01:01"

## Modified Methods

| Method | Change |
|--------|--------|
| `setMaxAmount()` | Now checks service cost defined first, calculates max time |
| `setTimeRate()` | Simplified to use pre-defined service cost |
| `startService()` | Checks service cost defined before starting |
| `updateBalanceMode()` | Uses costPerNanosecond instead of hardcoded rate |
| `updateTimeMode()` | Uses costPerNanosecond, formats time as HH:MM:SS |

## How It Works

```
User Flow:
┌─────────────────────────────────────────────┐
│ 1. Connect Wallet                           │
│    ✅ Enable billing interface              │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│ 2. Define Service Cost (NEW - MANDATORY)    │
│    ✅ Enter: Name, Cost, Currency, Time     │
│    ✅ System calculates: cost_per_ns        │
│    ✅ Enable: Mode buttons                  │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│ 3. Select Billing Mode                      │
│    ✅ Balance: Set max spending             │
│    ✅ Time: Cost already defined            │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│ 4. Start Service                            │
│    ✅ Track elapsed nanoseconds             │
│    ✅ Calculate: cost = ns * cost_per_ns   │
│    ✅ Display: HH:MM:SS (never ns)         │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│ 5. Monitor & Stop                           │
│    ✅ Real-time cost/time updates           │
│    ✅ Auto-stop if limit reached            │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│ 6. Settle Payment                           │
│    ✅ Convert total cost to ETH             │
│    ✅ Pay exact amount used                 │
└─────────────────────────────────────────────┘
```

## Examples

### Example 1: ₹50/Hour
```
Input: ₹50, Hour
Calculation:
  time_seconds = 3600
  cost_per_second = 50 / 3600 = 0.01389 ₹/s
  cost_per_nanosecond = 0.01389 / 1e9 ≈ 1.39e-11
```
**Cost for different durations**:
- 1 minute = ₹0.833
- 10 minutes = ₹8.33
- 1 hour = ₹50

### Example 2: $2.50/Minute
```
Input: $2.50, Minute
Calculation:
  time_seconds = 60
  cost_per_second = 2.50 / 60 = 0.04167 $/s
  cost_per_nanosecond = 0.04167 / 1e9 ≈ 4.17e-11
```
**Cost for different durations**:
- 10 seconds = $0.417
- 30 seconds = $1.25
- 1 minute = $2.50

### Example 3: €100/Day
```
Input: €100, Day
Calculation:
  time_seconds = 86400
  cost_per_second = 100 / 86400 = 0.001157 €/s
  cost_per_nanosecond = 0.001157 / 1e9 ≈ 1.16e-12
```
**Cost for different durations**:
- 1 hour ≈ €4.17
- 12 hours ≈ €50
- 1 day = €100

## Error Handling

User sees clear error messages:
- ❌ "Service name is required"
- ❌ "Service cost must be a positive number"
- ❌ "Currency must be INR, USD, or EUR"
- ❌ "Time unit must be minute, hour, or day"
- ❌ "Service cost must be defined first!"

## Testing Commands

```bash
# Validate JavaScript syntax
node -c frontend/js/app.js

# No output = ✅ Syntax OK
# Errors shown = ❌ Fix required
```

## Implementation Checklist

- [x] HTML: Service cost definition section added
- [x] CSS: Styling for service cost inputs and disabled buttons
- [x] JS: normalizeServiceCost() function
- [x] JS: defineServiceCost() function
- [x] JS: formatNanosecondsToTime() function
- [x] JS: Updated setMaxAmount() with mandatory check
- [x] JS: Updated setTimeRate() with mandatory check
- [x] JS: Updated startService() with mandatory check
- [x] JS: Updated updateBalanceMode() to use costPerNanosecond
- [x] JS: Updated updateTimeMode() to use costPerNanosecond
- [x] Validation: All mandatory checks in place
- [x] Syntax: No JavaScript errors
- [x] Documentation: Complete implementation guide

## Key Points to Remember

1. **Service cost is MANDATORY** - Cannot use service without defining it
2. **Single source of truth** - Both modes use same costPerNanosecond
3. **No defaults** - User must explicitly define every parameter
4. **Locked scope** - Only 3 currencies, 3 time units supported
5. **Precision** - BigInt nanosecond calculations prevent rounding errors
6. **Display** - Always show HH:MM:SS, never show raw nanoseconds
7. **Fair pricing** - Cost calculation is identical regardless of billing mode

## What's NOT Changed

- Wallet connection logic
- Session tracking
- Payment settlement
- ETH conversion
- Device simulator
- Theme toggle
- Export functionality

## Next Steps (Optional)

If user requests:
- [ ] Cost history tracking per service
- [ ] Service cost presets/templates
- [ ] Multi-service support in single session
- [ ] Cost modification during active service
- [ ] Settlement contract updates for cost normalization
- [ ] Advanced billing analytics

