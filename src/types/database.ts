export type AssetType = 'option' | 'equity'

export type TradeStrategy =
  | 'csp'
  | 'covered_call'
  | 'iron_condor'
  | 'debit_spread'
  | 'credit_spread'
  | 'long_call'
  | 'long_put'
  | 'collar'
  | 'calendar'
  | 'strangle'
  | 'straddle'
  | 'equity_long'
  | 'equity_short'

export type WheelCycleStatus = 'ACTIVE' | 'COMPLETED' | 'ABANDONED'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          user_id: string
          username: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          username: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      trade_groups: {
        Row: {
          id: string
          user_id: string
          label: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          label: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          label?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      wheel_cycles: {
        Row: {
          id: string
          user_id: string
          ticker: string
          status: WheelCycleStatus
          start_date: string
          end_date: string | null
          shares_quantity: number | null
          shares_cost_basis: number | null
          shares_exit_price: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          ticker: string
          status?: WheelCycleStatus
          start_date: string
          end_date?: string | null
          shares_quantity?: number | null
          shares_cost_basis?: number | null
          shares_exit_price?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          ticker?: string
          status?: WheelCycleStatus
          start_date?: string
          end_date?: string | null
          shares_quantity?: number | null
          shares_cost_basis?: number | null
          shares_exit_price?: number | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      trades: {
        Row: {
          id: string
          user_id: string
          date: string
          ticker: string
          asset_type: AssetType
          strategy: TradeStrategy | string
          entry_price: number
          exit_price: number | null
          quantity: number
          pnl: number | null
          pnl_pct: number | null
          strike: number | null
          expiration: string | null
          delta: number | null
          dte: number | null
          notes: string | null
          cycle_id: string | null
          group_id: string | null
          mistake_tags: string[] | null
          close_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          ticker: string
          asset_type: AssetType
          strategy: TradeStrategy | string
          entry_price: number
          exit_price?: number | null
          quantity?: number
          pnl?: number | null
          pnl_pct?: number | null
          strike?: number | null
          expiration?: string | null
          delta?: number | null
          dte?: number | null
          notes?: string | null
          cycle_id?: string | null
          group_id?: string | null
          mistake_tags?: string[] | null
          close_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          ticker?: string
          asset_type?: AssetType
          strategy?: TradeStrategy | string
          entry_price?: number
          exit_price?: number | null
          quantity?: number
          pnl?: number | null
          pnl_pct?: number | null
          strike?: number | null
          expiration?: string | null
          delta?: number | null
          dte?: number | null
          notes?: string | null
          cycle_id?: string | null
          group_id?: string | null
          mistake_tags?: string[] | null
          close_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      portfolio_positions: {
        Row: {
          id: string
          user_id: string
          ticker: string
          asset_type: AssetType
          entry_price: number
          current_price: number | null
          quantity: number
          notes: string | null
          cycle_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          ticker: string
          asset_type: AssetType
          entry_price: number
          current_price?: number | null
          quantity?: number
          notes?: string | null
          cycle_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          ticker?: string
          asset_type?: AssetType
          entry_price?: number
          current_price?: number | null
          quantity?: number
          notes?: string | null
          cycle_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      watchlist: {
        Row: {
          id: string
          user_id: string
          ticker: string
          notes: string | null
          price_target: number | null
          current_price: number | null
          is_flagged: boolean
          list_id: string | null
          bias: 'Bullish' | 'Bearish' | 'Neutral' | null
          status_type: 'Watching' | 'Ready' | 'In Trade' | 'Avoid' | null
          entry_price: number | null
          target_price: number | null
          stop_price: number | null
          earnings_date: string | null
          thesis: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          ticker: string
          notes?: string | null
          price_target?: number | null
          current_price?: number | null
          is_flagged?: boolean
          list_id?: string | null
          bias?: 'Bullish' | 'Bearish' | 'Neutral' | null
          status_type?: 'Watching' | 'Ready' | 'In Trade' | 'Avoid' | null
          entry_price?: number | null
          target_price?: number | null
          stop_price?: number | null
          earnings_date?: string | null
          thesis?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          ticker?: string
          notes?: string | null
          price_target?: number | null
          current_price?: number | null
          is_flagged?: boolean
          list_id?: string | null
          bias?: 'Bullish' | 'Bearish' | 'Neutral' | null
          status_type?: 'Watching' | 'Ready' | 'In Trade' | 'Avoid' | null
          entry_price?: number | null
          target_price?: number | null
          stop_price?: number | null
          earnings_date?: string | null
          thesis?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      watchlist_lists: {
        Row: {
          id: string
          user_id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
        }
        Relationships: []
      }
      portfolio_snapshots: {
        Row: {
          id: string
          user_id: string
          snapshot_date: string
          total_market_value: number | null
          total_cost_basis: number | null
          unrealized_pnl: number | null
          position_count: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          snapshot_date: string
          total_market_value?: number | null
          total_cost_basis?: number | null
          unrealized_pnl?: number | null
          position_count?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          snapshot_date?: string
          total_market_value?: number | null
          total_cost_basis?: number | null
          unrealized_pnl?: number | null
          position_count?: number | null
        }
        Relationships: []
      }
      feedback: {
        Row: {
          id: string
          user_id: string
          type: 'bug' | 'suggestion'
          title: string
          description: string | null
          status: 'open' | 'in_progress' | 'resolved'
          admin_response: string | null
          responded_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'bug' | 'suggestion'
          title: string
          description?: string | null
          status?: 'open' | 'in_progress' | 'resolved'
          admin_response?: string | null
          responded_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'bug' | 'suggestion'
          title?: string
          description?: string | null
          status?: 'open' | 'in_progress' | 'resolved'
          admin_response?: string | null
          responded_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      admins: {
        Row: { user_id: string }
        Insert: { user_id: string }
        Update: { user_id?: string }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Convenience row types
export type Trade = Database['public']['Tables']['trades']['Row']
export type InsertTrade = Database['public']['Tables']['trades']['Insert']
export type UpdateTrade = Database['public']['Tables']['trades']['Update']

export type PortfolioPosition = Database['public']['Tables']['portfolio_positions']['Row']
export type InsertPortfolioPosition = Database['public']['Tables']['portfolio_positions']['Insert']
export type UpdatePortfolioPosition = Database['public']['Tables']['portfolio_positions']['Update']

export type WatchlistItem = Database['public']['Tables']['watchlist']['Row']
export type InsertWatchlistItem = Database['public']['Tables']['watchlist']['Insert']
export type UpdateWatchlistItem = Database['public']['Tables']['watchlist']['Update']

export type WatchlistList = Database['public']['Tables']['watchlist_lists']['Row']
export type InsertWatchlistList = Database['public']['Tables']['watchlist_lists']['Insert']
export type UpdateWatchlistList = Database['public']['Tables']['watchlist_lists']['Update']

export type PortfolioSnapshot = Database['public']['Tables']['portfolio_snapshots']['Row']
export type InsertPortfolioSnapshot = Database['public']['Tables']['portfolio_snapshots']['Insert']

export type WheelCycle = Database['public']['Tables']['wheel_cycles']['Row']
export type InsertWheelCycle = Database['public']['Tables']['wheel_cycles']['Insert']
export type UpdateWheelCycle = Database['public']['Tables']['wheel_cycles']['Update']

export type Feedback = Database['public']['Tables']['feedback']['Row']
export type InsertFeedback = Database['public']['Tables']['feedback']['Insert']

export type Profile = Database['public']['Tables']['profiles']['Row']

export type TradeGroup = Database['public']['Tables']['trade_groups']['Row']
export type InsertTradeGroup = Database['public']['Tables']['trade_groups']['Insert']
export type UpdateTradeGroup = Database['public']['Tables']['trade_groups']['Update']

// Strategy display labels
export const STRATEGY_LABELS: Record<string, string> = {
  csp: 'Cash Secured Put',
  covered_call: 'Covered Call',
  iron_condor: 'Iron Condor',
  debit_spread: 'Debit Spread',
  credit_spread: 'Credit Spread',
  long_call: 'Long Call',
  long_put: 'Long Put',
  collar: 'Collar',
  calendar: 'Calendar Spread',
  strangle: 'Strangle',
  straddle: 'Straddle',
  equity_long: 'Long Equity',
  equity_short: 'Short Equity',
  portfolio_close: 'Portfolio Close',
}

export const OPTION_STRATEGIES: TradeStrategy[] = [
  'csp', 'covered_call', 'iron_condor', 'debit_spread',
  'credit_spread', 'long_call', 'long_put', 'collar',
  'calendar', 'strangle', 'straddle',
]

export const EQUITY_STRATEGIES: TradeStrategy[] = ['equity_long', 'equity_short']
