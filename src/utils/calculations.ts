export type TradeResult = { pnl: number }

/** Win rate as a decimal (0–1) */
export function calcWinRate(trades: TradeResult[]): number {
  if (trades.length === 0) return 0
  const wins = trades.filter(t => t.pnl > 0).length
  return wins / trades.length
}

/** Average gain across winning trades */
export function calcAvgGain(trades: TradeResult[]): number {
  const wins = trades.filter(t => t.pnl > 0)
  if (wins.length === 0) return 0
  return wins.reduce((sum, t) => sum + t.pnl, 0) / wins.length
}

/** Average loss across losing trades (returns negative number) */
export function calcAvgLoss(trades: TradeResult[]): number {
  const losses = trades.filter(t => t.pnl < 0)
  if (losses.length === 0) return 0
  return losses.reduce((sum, t) => sum + t.pnl, 0) / losses.length
}

/** Expectancy = (winRate * avgGain) + (lossRate * avgLoss) */
export function calcExpectancy(trades: TradeResult[]): number {
  if (trades.length === 0) return 0
  const winRate = calcWinRate(trades)
  const lossRate = 1 - winRate
  const avgGain = calcAvgGain(trades)
  const avgLoss = calcAvgLoss(trades)
  return winRate * avgGain + lossRate * avgLoss
}

/** Max drawdown: largest peak-to-trough decline in cumulative P&L */
export function calcMaxDrawdown(trades: TradeResult[]): number {
  if (trades.length === 0) return 0
  let peak = 0
  let maxDD = 0
  let cumulative = 0
  for (const trade of trades) {
    cumulative += trade.pnl
    if (cumulative > peak) peak = cumulative
    const dd = peak - cumulative
    if (dd > maxDD) maxDD = dd
  }
  return -maxDD  // returns negative number
}

/** Profit factor = gross profit / |gross loss| */
export function calcProfitFactor(trades: TradeResult[]): number {
  const grossProfit = trades.filter(t => t.pnl > 0).reduce((s, t) => s + t.pnl, 0)
  const grossLoss = Math.abs(trades.filter(t => t.pnl < 0).reduce((s, t) => s + t.pnl, 0))
  if (grossLoss === 0) return grossProfit > 0 ? Infinity : 0
  return grossProfit / grossLoss
}

/** Total P&L */
export function calcTotalPnl(trades: TradeResult[]): number {
  return trades.reduce((sum, t) => sum + t.pnl, 0)
}

/** Portfolio unrealized P&L for a single position */
export function calcUnrealizedPnl(entryPrice: number, currentPrice: number, quantity: number): number {
  return (currentPrice - entryPrice) * quantity
}

/** Portfolio unrealized P&L % for a single position */
export function calcUnrealizedPnlPct(entryPrice: number, currentPrice: number): number {
  if (entryPrice === 0) return 0
  return ((currentPrice - entryPrice) / entryPrice) * 100
}

/** Position cost basis */
export function calcCostBasis(entryPrice: number, quantity: number): number {
  return entryPrice * quantity
}

/** Position current value */
export function calcCurrentValue(currentPrice: number, quantity: number): number {
  return currentPrice * quantity
}

/** Allocation % for a position given total portfolio value */
export function calcAllocationPct(positionValue: number, totalPortfolioValue: number): number {
  if (totalPortfolioValue === 0) return 0
  return (positionValue / totalPortfolioValue) * 100
}

export type TradeForROC = { entry_price: number; strike: number | null; asset_type: string }

/** Average ROC across options trades: entry_price / strike * 100 (%) */
export function calcAvgROC(trades: TradeForROC[]): number {
  const opts = trades.filter(t => t.asset_type === 'option' && t.strike !== null && t.strike > 0)
  if (opts.length === 0) return 0
  const sum = opts.reduce((acc, t) => acc + (t.entry_price / t.strike!), 0)
  return (sum / opts.length) * 100
}
