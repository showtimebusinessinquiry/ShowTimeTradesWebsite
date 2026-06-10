export const MISTAKE_TAGS = [
  { value: 'fomo',           label: 'FOMO',              cls: 'text-amber bg-amber/10 border-amber/30' },
  { value: 'revenge',        label: 'Revenge Trade',     cls: 'text-loss bg-loss/10 border-loss/30' },
  { value: 'oversize',       label: 'Oversize Position', cls: 'text-loss bg-loss/10 border-loss/30' },
  { value: 'early_exit',     label: 'Too Early',         cls: 'text-amber bg-amber/10 border-amber/30' },
  { value: 'late_exit',      label: 'Held Too Long',     cls: 'text-amber bg-amber/10 border-amber/30' },
  { value: 'no_plan',        label: 'No Plan',           cls: 'text-accent bg-accent/10 border-accent/30' },
  { value: 'chased',         label: 'Chased Entry',      cls: 'text-amber bg-amber/10 border-amber/30' },
  { value: 'broke_rules',    label: 'Broke Rules',       cls: 'text-loss bg-loss/10 border-loss/30' },
  { value: 'emotional',      label: 'Emotional',         cls: 'text-accent bg-accent/10 border-accent/30' },
  { value: 'over_leveraged', label: 'Over-leveraged',    cls: 'text-loss bg-loss/10 border-loss/30' },
] as const
