import { describe, it, expect } from 'vitest'
import {
  calcWinRate,
  calcAvgGain,
  calcAvgLoss,
  calcExpectancy,
  calcMaxDrawdown,
  calcProfitFactor,
  calcTotalPnl,
  calcUnrealizedPnl,
  calcUnrealizedPnlPct,
  calcCostBasis,
  calcCurrentValue,
  calcAllocationPct,
} from '@/utils/calculations'

// ─────────────────────────────────────────────
// calcWinRate
// ─────────────────────────────────────────────
describe('calcWinRate', () => {
  it('returns 0 for empty array', () => {
    expect(calcWinRate([])).toBe(0)
  })

  it('returns 1.0 when all trades are wins', () => {
    expect(calcWinRate([{ pnl: 100 }, { pnl: 200 }])).toBe(1)
  })

  it('returns 0 when all trades are losses', () => {
    expect(calcWinRate([{ pnl: -100 }, { pnl: -50 }])).toBe(0)
  })

  it('returns 0.5 for equal wins and losses', () => {
    expect(calcWinRate([{ pnl: 100 }, { pnl: -100 }])).toBe(0.5)
  })

  it('counts pnl=0 as a loss (not a win)', () => {
    expect(calcWinRate([{ pnl: 100 }, { pnl: 0 }])).toBe(0.5)
  })

  it('calculates correctly with 3W/2L', () => {
    expect(
      calcWinRate([{ pnl: 50 }, { pnl: 100 }, { pnl: -20 }, { pnl: 80 }, { pnl: -30 }])
    ).toBe(0.6)
  })

  it('returns 1.0 for a single winning trade', () => {
    expect(calcWinRate([{ pnl: 1 }])).toBe(1)
  })

  it('returns 0 for a single losing trade', () => {
    expect(calcWinRate([{ pnl: -1 }])).toBe(0)
  })

  it('returns 0 for a single breakeven trade (pnl=0)', () => {
    expect(calcWinRate([{ pnl: 0 }])).toBe(0)
  })

  it('handles very large win rate numerics correctly', () => {
    const trades = Array.from({ length: 9 }, () => ({ pnl: 1 })).concat([{ pnl: -1 }])
    expect(calcWinRate(trades)).toBe(0.9)
  })
})

// ─────────────────────────────────────────────
// calcAvgGain
// ─────────────────────────────────────────────
describe('calcAvgGain', () => {
  it('returns 0 for empty array', () => {
    expect(calcAvgGain([])).toBe(0)
  })

  it('returns 0 when there are no winning trades', () => {
    expect(calcAvgGain([{ pnl: -100 }, { pnl: -50 }])).toBe(0)
  })

  it('returns 0 when all trades are breakeven (pnl=0)', () => {
    expect(calcAvgGain([{ pnl: 0 }, { pnl: 0 }])).toBe(0)
  })

  it('returns average of positive pnl trades', () => {
    expect(calcAvgGain([{ pnl: 100 }, { pnl: 200 }])).toBe(150)
  })

  it('ignores losing trades when computing average gain', () => {
    expect(calcAvgGain([{ pnl: 100 }, { pnl: 200 }, { pnl: -50 }])).toBe(150)
  })

  it('ignores breakeven trades (pnl=0) when computing average gain', () => {
    expect(calcAvgGain([{ pnl: 100 }, { pnl: 200 }, { pnl: 0 }])).toBe(150)
  })

  it('returns the single win value when only one winner exists', () => {
    expect(calcAvgGain([{ pnl: 75 }, { pnl: -25 }])).toBe(75)
  })

  it('handles fractional pnl values', () => {
    expect(calcAvgGain([{ pnl: 33.33 }, { pnl: 66.67 }])).toBeCloseTo(50, 5)
  })
})

// ─────────────────────────────────────────────
// calcAvgLoss
// ─────────────────────────────────────────────
describe('calcAvgLoss', () => {
  it('returns 0 for empty array', () => {
    expect(calcAvgLoss([])).toBe(0)
  })

  it('returns 0 when there are no losing trades', () => {
    expect(calcAvgLoss([{ pnl: 100 }, { pnl: 200 }])).toBe(0)
  })

  it('returns 0 when all trades are breakeven (pnl=0)', () => {
    expect(calcAvgLoss([{ pnl: 0 }, { pnl: 0 }])).toBe(0)
  })

  it('returns a negative number representing the average loss', () => {
    const result = calcAvgLoss([{ pnl: -100 }, { pnl: -50 }])
    expect(result).toBe(-75)
    expect(result).toBeLessThan(0)
  })

  it('ignores winning trades when computing average loss', () => {
    expect(calcAvgLoss([{ pnl: 100 }, { pnl: -100 }, { pnl: -50 }])).toBe(-75)
  })

  it('does not count pnl=0 as a loss', () => {
    expect(calcAvgLoss([{ pnl: 0 }, { pnl: -100 }])).toBe(-100)
  })

  it('returns the single loss value when only one loser exists', () => {
    expect(calcAvgLoss([{ pnl: 100 }, { pnl: -40 }])).toBe(-40)
  })

  it('handles fractional loss values', () => {
    expect(calcAvgLoss([{ pnl: -33.33 }, { pnl: -66.67 }])).toBeCloseTo(-50, 5)
  })
})

// ─────────────────────────────────────────────
// calcExpectancy
// ─────────────────────────────────────────────
describe('calcExpectancy', () => {
  it('returns 0 for empty array', () => {
    expect(calcExpectancy([])).toBe(0)
  })

  it('returns positive expectancy when wins dominate', () => {
    // winRate=0.5, avgGain=100, lossRate=0.5, avgLoss=-50 → 0.5*100 + 0.5*(-50) = 25
    const result = calcExpectancy([{ pnl: 100 }, { pnl: -50 }])
    expect(result).toBe(25)
  })

  it('returns negative expectancy when losses dominate', () => {
    // winRate=0.5, avgGain=50, lossRate=0.5, avgLoss=-100 → 0.5*50 + 0.5*(-100) = -25
    const result = calcExpectancy([{ pnl: 50 }, { pnl: -100 }])
    expect(result).toBe(-25)
  })

  it('returns 100 expectancy when all trades win at 100 each', () => {
    // winRate=1, avgGain=100, lossRate=0, avgLoss=0 → 100
    expect(calcExpectancy([{ pnl: 100 }, { pnl: 100 }])).toBe(100)
  })

  it('returns -100 expectancy when all trades lose at -100 each', () => {
    // winRate=0, avgGain=0, lossRate=1, avgLoss=-100 → -100
    expect(calcExpectancy([{ pnl: -100 }, { pnl: -100 }])).toBe(-100)
  })

  it('handles single breakeven trade (pnl=0)', () => {
    // winRate=0, avgGain=0, lossRate=1, avgLoss=0 → 0
    expect(calcExpectancy([{ pnl: 0 }])).toBe(0)
  })

  it('computes correctly with 3W/2L mixed scenario', () => {
    // wins: [50, 100, 80] avg=76.67; losses: [-20, -30] avg=-25; winRate=0.6, lossRate=0.4
    // 0.6*76.67 + 0.4*(-25) = 46 - 10 = 36
    const trades = [{ pnl: 50 }, { pnl: 100 }, { pnl: -20 }, { pnl: 80 }, { pnl: -30 }]
    expect(calcExpectancy(trades)).toBeCloseTo(36, 2)
  })
})

// ─────────────────────────────────────────────
// calcMaxDrawdown
// ─────────────────────────────────────────────
describe('calcMaxDrawdown', () => {
  it('returns 0 for empty array', () => {
    expect(calcMaxDrawdown([])).toBe(0)
  })

  it('returns 0 for a sequence of all winning trades (no trough)', () => {
    expect(calcMaxDrawdown([{ pnl: 100 }, { pnl: 50 }, { pnl: 200 }])).toBe(0)
  })

  it('returns 0 for a single winning trade', () => {
    expect(calcMaxDrawdown([{ pnl: 100 }])).toBe(0)
  })

  it('returns negative value equal to the loss for a single losing trade', () => {
    expect(calcMaxDrawdown([{ pnl: -75 }])).toBe(-75)
  })

  it('computes classic peak-to-trough scenario: [100, 50, -200, 100]', () => {
    // cumulative: 100, 150, -50 → drawdown from peak 150 to -50 = 200
    expect(calcMaxDrawdown([{ pnl: 100 }, { pnl: 50 }, { pnl: -200 }, { pnl: 100 }])).toBe(-200)
  })

  it('returns a negative number (not positive)', () => {
    const result = calcMaxDrawdown([{ pnl: 100 }, { pnl: -300 }, { pnl: 100 }])
    expect(result).toBeLessThan(0)
  })

  it('picks the largest drawdown across multiple troughs', () => {
    // cumulative: 100, 50 (dd=50), 150, -50 (dd from 150=200), 100
    const result = calcMaxDrawdown([
      { pnl: 100 }, { pnl: -50 }, { pnl: 100 }, { pnl: -200 }, { pnl: 150 },
    ])
    expect(result).toBe(-200)
  })

  it('handles a sequence that ends at a new low', () => {
    // cumulative: 100, -50 → drawdown from peak 100 to -50 = 150
    expect(calcMaxDrawdown([{ pnl: 100 }, { pnl: -150 }])).toBe(-150)
  })

  it('handles all-loss trades: max drawdown equals total loss', () => {
    // cumulative: -10, -20, -30 → max dd from peak 0 to -30 = 30
    expect(calcMaxDrawdown([{ pnl: -10 }, { pnl: -10 }, { pnl: -10 }])).toBe(-30)
  })

  it('handles breakeven trade (pnl=0) without introducing drawdown', () => {
    expect(calcMaxDrawdown([{ pnl: 100 }, { pnl: 0 }, { pnl: 100 }])).toBe(0)
  })
})

// ─────────────────────────────────────────────
// calcProfitFactor
// ─────────────────────────────────────────────
describe('calcProfitFactor', () => {
  it('returns 0 for empty array', () => {
    expect(calcProfitFactor([])).toBe(0)
  })

  it('returns Infinity when there are only winning trades', () => {
    expect(calcProfitFactor([{ pnl: 100 }, { pnl: 200 }])).toBe(Infinity)
  })

  it('returns 0 when there are only losing trades', () => {
    expect(calcProfitFactor([{ pnl: -100 }, { pnl: -50 }])).toBe(0)
  })

  it('returns 0 when all trades are breakeven', () => {
    expect(calcProfitFactor([{ pnl: 0 }, { pnl: 0 }])).toBe(0)
  })

  it('computes correctly with 3 wins and 2 losses', () => {
    // grossProfit=300, grossLoss=150 → PF=2.0
    const trades = [
      { pnl: 100 }, { pnl: 100 }, { pnl: 100 },
      { pnl: -100 }, { pnl: -50 },
    ]
    expect(calcProfitFactor(trades)).toBeCloseTo(2.0, 5)
  })

  it('returns exactly 1.0 when gross profit equals gross loss', () => {
    expect(calcProfitFactor([{ pnl: 100 }, { pnl: -100 }])).toBe(1)
  })

  it('returns less than 1 when losses outweigh gains', () => {
    const result = calcProfitFactor([{ pnl: 50 }, { pnl: -100 }])
    expect(result).toBeCloseTo(0.5, 5)
    expect(result).toBeLessThan(1)
  })

  it('does not count pnl=0 trades in gross profit or gross loss', () => {
    // same as the no-losses path: Infinity
    expect(calcProfitFactor([{ pnl: 100 }, { pnl: 0 }])).toBe(Infinity)
  })
})

// ─────────────────────────────────────────────
// calcTotalPnl
// ─────────────────────────────────────────────
describe('calcTotalPnl', () => {
  it('returns 0 for empty array', () => {
    expect(calcTotalPnl([])).toBe(0)
  })

  it('sums all positive pnl values', () => {
    expect(calcTotalPnl([{ pnl: 100 }, { pnl: 200 }, { pnl: 50 }])).toBe(350)
  })

  it('sums all negative pnl values', () => {
    expect(calcTotalPnl([{ pnl: -100 }, { pnl: -50 }])).toBe(-150)
  })

  it('sums mixed wins and losses', () => {
    expect(calcTotalPnl([{ pnl: 100 }, { pnl: -40 }])).toBe(60)
  })

  it('returns 0 for a single breakeven trade', () => {
    expect(calcTotalPnl([{ pnl: 0 }])).toBe(0)
  })

  it('includes breakeven trades without affecting the total', () => {
    expect(calcTotalPnl([{ pnl: 100 }, { pnl: 0 }, { pnl: -50 }])).toBe(50)
  })

  it('handles fractional pnl values', () => {
    expect(calcTotalPnl([{ pnl: 33.33 }, { pnl: 66.67 }])).toBeCloseTo(100, 5)
  })
})

// ─────────────────────────────────────────────
// calcUnrealizedPnl
// ─────────────────────────────────────────────
describe('calcUnrealizedPnl', () => {
  it('returns positive pnl for a price increase', () => {
    expect(calcUnrealizedPnl(100, 120, 10)).toBe(200)
  })

  it('returns negative pnl for a price decrease', () => {
    expect(calcUnrealizedPnl(100, 80, 10)).toBe(-200)
  })

  it('returns 0 when current price equals entry price', () => {
    expect(calcUnrealizedPnl(100, 100, 10)).toBe(0)
  })

  it('returns 0 for zero quantity', () => {
    expect(calcUnrealizedPnl(100, 150, 0)).toBe(0)
  })

  it('scales linearly with quantity', () => {
    expect(calcUnrealizedPnl(50, 60, 100)).toBe(1000)
  })

  it('handles fractional quantity (e.g. options contracts)', () => {
    expect(calcUnrealizedPnl(1.5, 2.5, 10)).toBe(10)
  })

  it('handles zero entry price', () => {
    // (current - 0) * qty = current * qty
    expect(calcUnrealizedPnl(0, 50, 5)).toBe(250)
  })
})

// ─────────────────────────────────────────────
// calcUnrealizedPnlPct
// ─────────────────────────────────────────────
describe('calcUnrealizedPnlPct', () => {
  it('returns 20% for a 20% price increase', () => {
    expect(calcUnrealizedPnlPct(100, 120)).toBe(20)
  })

  it('returns -20% for a 20% price decrease', () => {
    expect(calcUnrealizedPnlPct(100, 80)).toBe(-20)
  })

  it('returns 0 when entry price equals current price', () => {
    expect(calcUnrealizedPnlPct(100, 100)).toBe(0)
  })

  it('returns 0 when entry price is 0 (div-by-zero guard)', () => {
    expect(calcUnrealizedPnlPct(0, 100)).toBe(0)
  })

  it('handles a 100% gain correctly', () => {
    expect(calcUnrealizedPnlPct(50, 100)).toBe(100)
  })

  it('handles a 50% loss correctly', () => {
    expect(calcUnrealizedPnlPct(200, 100)).toBe(-50)
  })

  it('handles fractional prices', () => {
    // entry=1.00, current=1.50 → 50%
    expect(calcUnrealizedPnlPct(1.0, 1.5)).toBeCloseTo(50, 5)
  })
})

// ─────────────────────────────────────────────
// calcCostBasis
// ─────────────────────────────────────────────
describe('calcCostBasis', () => {
  it('returns entry price multiplied by quantity', () => {
    expect(calcCostBasis(100, 10)).toBe(1000)
  })

  it('returns 0 for zero quantity', () => {
    expect(calcCostBasis(100, 0)).toBe(0)
  })

  it('returns 0 for zero entry price', () => {
    expect(calcCostBasis(0, 10)).toBe(0)
  })

  it('handles fractional entry price', () => {
    expect(calcCostBasis(1.5, 4)).toBe(6)
  })

  it('handles fractional quantity', () => {
    expect(calcCostBasis(100, 0.5)).toBe(50)
  })

  it('is commutative with calcCurrentValue for equal prices', () => {
    expect(calcCostBasis(75, 8)).toBe(calcCurrentValue(75, 8))
  })
})

// ─────────────────────────────────────────────
// calcCurrentValue
// ─────────────────────────────────────────────
describe('calcCurrentValue', () => {
  it('returns current price multiplied by quantity', () => {
    expect(calcCurrentValue(120, 10)).toBe(1200)
  })

  it('returns 0 for zero quantity', () => {
    expect(calcCurrentValue(120, 0)).toBe(0)
  })

  it('returns 0 for zero current price', () => {
    expect(calcCurrentValue(0, 10)).toBe(0)
  })

  it('handles fractional prices', () => {
    expect(calcCurrentValue(2.5, 4)).toBe(10)
  })

  it('equals cost basis when current price equals entry price', () => {
    expect(calcCurrentValue(50, 20)).toBe(calcCostBasis(50, 20))
  })
})

// ─────────────────────────────────────────────
// calcAllocationPct
// ─────────────────────────────────────────────
describe('calcAllocationPct', () => {
  it('returns 20% when position is 1000 of a 5000 portfolio', () => {
    expect(calcAllocationPct(1000, 5000)).toBe(20)
  })

  it('returns 100% when position equals the entire portfolio', () => {
    expect(calcAllocationPct(5000, 5000)).toBe(100)
  })

  it('returns 0 when total portfolio value is 0 (div-by-zero guard)', () => {
    expect(calcAllocationPct(1000, 0)).toBe(0)
  })

  it('returns 0 when position value is 0', () => {
    expect(calcAllocationPct(0, 5000)).toBe(0)
  })

  it('handles fractional percentages', () => {
    expect(calcAllocationPct(333.33, 1000)).toBeCloseTo(33.333, 3)
  })

  it('can return a value over 100% if position exceeds portfolio (leveraged scenario)', () => {
    // Edge case: no guard for over-allocation
    expect(calcAllocationPct(6000, 5000)).toBe(120)
  })

  it('returns 50% for equal position and remaining portfolio', () => {
    expect(calcAllocationPct(500, 1000)).toBe(50)
  })
})
