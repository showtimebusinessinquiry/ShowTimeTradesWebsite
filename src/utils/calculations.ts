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

/** Best and worst single-day P&L across all closed trades */
export function calcBestWorstDay(
  trades: Array<{ date: string; pnl: number }>,
): { best: number; bestDate: string; worst: number; worstDate: string } | null {
  if (trades.length === 0) return null
  const map: Record<string, number> = {}
  for (const t of trades) {
    map[t.date] = (map[t.date] ?? 0) + t.pnl
  }
  const entries = Object.entries(map)
  let best = -Infinity, bestDate = '', worst = Infinity, worstDate = ''
  for (const [date, pnl] of entries) {
    if (pnl > best) { best = pnl; bestDate = date }
    if (pnl < worst) { worst = pnl; worstDate = date }
  }
  return { best, bestDate, worst, worstDate }
}

/** Kelly criterion: fraction of capital to risk. Clamped to [-0.5, 1]. */
export function calcKelly(winRate: number, avgGain: number, avgLoss: number): number | null {
  if (avgLoss === 0 || avgGain === 0 || winRate === 0 || winRate === 1) return null
  const payoffRatio = avgGain / Math.abs(avgLoss)
  const k = winRate - (1 - winRate) / payoffRatio
  return Math.min(1, Math.max(-0.5, k))
}

/** Average holding period in days for closed trades that have a close_date */
export function calcAvgHoldingPeriod(
  trades: Array<{ date: string; close_date?: string | null }>,
): number | null {
  const withClose = trades.filter(t => t.close_date)
  if (withClose.length === 0) return null
  const total = withClose.reduce(
    (sum, t) => sum + (Date.parse(t.close_date!) - Date.parse(t.date)) / 86400000,
    0,
  )
  return total / withClose.length
}

/** Average ROC across options trades: entry_price / strike * 100 (%) */
export function calcAvgROC(trades: TradeForROC[]): number {
  const opts = trades.filter(t => t.asset_type === 'option' && t.strike !== null && t.strike > 0)
  if (opts.length === 0) return 0
  const sum = opts.reduce((acc, t) => acc + (t.entry_price / t.strike!), 0)
  return (sum / opts.length) * 100
}
