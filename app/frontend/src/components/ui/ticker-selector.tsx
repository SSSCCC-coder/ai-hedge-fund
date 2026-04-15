import { Check, ChevronDown, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

// ─── Popular stocks list ───────────────────────────────────────────────────
export interface StockInfo {
  ticker: string;
  name: string;
  sector: string;
}

export const POPULAR_STOCKS: StockInfo[] = [
  // Technology
  { ticker: 'AAPL',  name: 'Apple Inc.',                  sector: 'Technology' },
  { ticker: 'MSFT',  name: 'Microsoft Corporation',       sector: 'Technology' },
  { ticker: 'NVDA',  name: 'NVIDIA Corporation',          sector: 'Technology' },
  { ticker: 'GOOGL', name: 'Alphabet Inc.',               sector: 'Technology' },
  { ticker: 'META',  name: 'Meta Platforms Inc.',         sector: 'Technology' },
  { ticker: 'AMZN',  name: 'Amazon.com Inc.',             sector: 'Technology' },
  { ticker: 'TSLA',  name: 'Tesla Inc.',                  sector: 'Technology' },
  { ticker: 'AVGO',  name: 'Broadcom Inc.',               sector: 'Technology' },
  { ticker: 'ORCL',  name: 'Oracle Corporation',          sector: 'Technology' },
  { ticker: 'AMD',   name: 'Advanced Micro Devices',      sector: 'Technology' },
  { ticker: 'INTC',  name: 'Intel Corporation',           sector: 'Technology' },
  { ticker: 'QCOM',  name: 'Qualcomm Inc.',               sector: 'Technology' },
  { ticker: 'CRM',   name: 'Salesforce Inc.',             sector: 'Technology' },
  { ticker: 'ADBE',  name: 'Adobe Inc.',                  sector: 'Technology' },
  { ticker: 'NFLX',  name: 'Netflix Inc.',                sector: 'Technology' },
  { ticker: 'IBM',   name: 'IBM Corporation',             sector: 'Technology' },
  { ticker: 'PYPL',  name: 'PayPal Holdings Inc.',        sector: 'Technology' },
  { ticker: 'NOW',   name: 'ServiceNow Inc.',             sector: 'Technology' },
  // Finance
  { ticker: 'BRK.B', name: 'Berkshire Hathaway B',       sector: 'Finance' },
  { ticker: 'JPM',   name: 'JPMorgan Chase & Co.',        sector: 'Finance' },
  { ticker: 'V',     name: 'Visa Inc.',                   sector: 'Finance' },
  { ticker: 'MA',    name: 'Mastercard Inc.',             sector: 'Finance' },
  { ticker: 'BAC',   name: 'Bank of America Corp.',       sector: 'Finance' },
  { ticker: 'WFC',   name: 'Wells Fargo & Company',      sector: 'Finance' },
  { ticker: 'GS',    name: 'Goldman Sachs Group',         sector: 'Finance' },
  { ticker: 'MS',    name: 'Morgan Stanley',              sector: 'Finance' },
  { ticker: 'BLK',   name: 'BlackRock Inc.',              sector: 'Finance' },
  { ticker: 'AXP',   name: 'American Express Co.',        sector: 'Finance' },
  // Healthcare
  { ticker: 'LLY',   name: 'Eli Lilly and Company',      sector: 'Healthcare' },
  { ticker: 'UNH',   name: 'UnitedHealth Group',         sector: 'Healthcare' },
  { ticker: 'JNJ',   name: 'Johnson & Johnson',          sector: 'Healthcare' },
  { ticker: 'ABBV',  name: 'AbbVie Inc.',                sector: 'Healthcare' },
  { ticker: 'MRK',   name: 'Merck & Co. Inc.',           sector: 'Healthcare' },
  { ticker: 'PFE',   name: 'Pfizer Inc.',                sector: 'Healthcare' },
  { ticker: 'TMO',   name: 'Thermo Fisher Scientific',   sector: 'Healthcare' },
  { ticker: 'ABT',   name: 'Abbott Laboratories',        sector: 'Healthcare' },
  { ticker: 'AMGN',  name: 'Amgen Inc.',                 sector: 'Healthcare' },
  // Consumer
  { ticker: 'COST',  name: 'Costco Wholesale Corp.',     sector: 'Consumer' },
  { ticker: 'WMT',   name: 'Walmart Inc.',               sector: 'Consumer' },
  { ticker: 'PG',    name: 'Procter & Gamble Co.',       sector: 'Consumer' },
  { ticker: 'KO',    name: 'Coca-Cola Company',          sector: 'Consumer' },
  { ticker: 'PEP',   name: 'PepsiCo Inc.',               sector: 'Consumer' },
  { ticker: 'MCD',   name: "McDonald's Corporation",     sector: 'Consumer' },
  { ticker: 'NKE',   name: 'Nike Inc.',                  sector: 'Consumer' },
  { ticker: 'HD',    name: 'Home Depot Inc.',            sector: 'Consumer' },
  { ticker: 'SBUX',  name: 'Starbucks Corporation',      sector: 'Consumer' },
  { ticker: 'TGT',   name: 'Target Corporation',         sector: 'Consumer' },
  // Energy
  { ticker: 'XOM',   name: 'Exxon Mobil Corporation',   sector: 'Energy' },
  { ticker: 'CVX',   name: 'Chevron Corporation',        sector: 'Energy' },
  { ticker: 'COP',   name: 'ConocoPhillips',             sector: 'Energy' },
  { ticker: 'SLB',   name: 'SLB (Schlumberger)',         sector: 'Energy' },
  // Industrial
  { ticker: 'CAT',   name: 'Caterpillar Inc.',           sector: 'Industrial' },
  { ticker: 'GE',    name: 'GE Aerospace',               sector: 'Industrial' },
  { ticker: 'HON',   name: 'Honeywell International',    sector: 'Industrial' },
  { ticker: 'BA',    name: 'Boeing Company',             sector: 'Industrial' },
  { ticker: 'UPS',   name: 'United Parcel Service',      sector: 'Industrial' },
  { ticker: 'DE',    name: 'Deere & Company',            sector: 'Industrial' },
  // ETFs
  { ticker: 'SPY',   name: 'SPDR S&P 500 ETF',          sector: 'ETF' },
  { ticker: 'QQQ',   name: 'Invesco QQQ (Nasdaq 100)',   sector: 'ETF' },
  { ticker: 'IWM',   name: 'iShares Russell 2000 ETF',  sector: 'ETF' },
  { ticker: 'GLD',   name: 'SPDR Gold Shares ETF',       sector: 'ETF' },
  { ticker: 'TLT',   name: 'iShares 20+ Year T-Bond',   sector: 'ETF' },
];

// ─── Sector label colors ───────────────────────────────────────────────────
const SECTOR_COLORS: Record<string, string> = {
  Technology: 'text-blue-400',
  Finance:    'text-green-400',
  Healthcare: 'text-pink-400',
  Consumer:   'text-orange-400',
  Energy:     'text-yellow-400',
  Industrial: 'text-purple-400',
  ETF:        'text-gray-400',
};

// ─── Single ticker select (for position rows) ─────────────────────────────
interface TickerInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function TickerInput({ value, onChange, placeholder = 'Ticker', className }: TickerInputProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = search.trim()
    ? POPULAR_STOCKS.filter(s =>
        s.ticker.toLowerCase().includes(search.toLowerCase()) ||
        s.name.toLowerCase().includes(search.toLowerCase())
      )
    : POPULAR_STOCKS;

  const grouped = filtered.reduce<Record<string, StockInfo[]>>((acc, stock) => {
    if (!acc[stock.sector]) acc[stock.sector] = [];
    acc[stock.sector].push(stock);
    return acc;
  }, {});

  const handleSelect = (ticker: string) => {
    onChange(ticker);
    setSearch('');
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && search.trim()) {
      e.preventDefault();
      const custom = search.trim().toUpperCase().replace(/,/g, '');
      if (custom) { onChange(custom); setSearch(''); setOpen(false); }
    }
    if (e.key === 'Escape') setOpen(false);
  };

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else setSearch('');
  }, [open]);

  const selected = value ? POPULAR_STOCKS.find(s => s.ticker === value) : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          className={cn(
            'flex h-9 w-full items-center gap-1.5 rounded-md border border-input bg-transparent px-3 py-1.5 text-sm cursor-pointer',
            'hover:border-ring focus-within:ring-1 focus-within:ring-ring transition-colors',
            open && 'ring-1 ring-ring border-ring',
            className
          )}
          onClick={() => setOpen(true)}
        >
          {value ? (
            <>
              <span className="font-mono text-xs font-semibold truncate flex-1">{value}</span>
              {selected && (
                <span className="text-[10px] text-muted-foreground hidden sm:block truncate max-w-[80px]">{selected.name}</span>
              )}
            </>
          ) : (
            <span className="text-muted-foreground text-xs select-none flex-1">{placeholder}</span>
          )}
          <ChevronDown className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </div>
      </PopoverTrigger>

      <PopoverContent
        className="w-72 p-0 bg-node border border-border shadow-xl"
        align="start"
        sideOffset={4}
      >
        {/* Search input */}
        <div className="p-2 border-b border-border">
          <Input
            ref={inputRef}
            placeholder="Search ticker or company name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-8 text-xs bg-transparent border-border"
          />
          {search.trim() && !POPULAR_STOCKS.find(s => s.ticker === search.trim().toUpperCase()) && (
            <p className="text-xs text-muted-foreground mt-1 px-1">
              Press <kbd className="bg-muted px-1 rounded text-[10px]">Enter</kbd> to add <span className="font-mono text-foreground">{search.trim().toUpperCase()}</span>
            </p>
          )}
        </div>

        {/* Stock list */}
        <div className="max-h-56 overflow-y-auto py-1">
          {Object.keys(grouped).length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              No stocks found. Press Enter to add custom ticker.
            </div>
          ) : (
            Object.entries(grouped).map(([sector, stocks]) => (
              <div key={sector}>
                <div className={cn('px-3 py-1 text-[10px] font-semibold uppercase tracking-wider sticky top-0 bg-node', SECTOR_COLORS[sector] ?? 'text-muted-foreground')}>
                  {sector}
                </div>
                {stocks.map(stock => {
                  const isSelected = value === stock.ticker;
                  return (
                    <div
                      key={stock.ticker}
                      className={cn(
                        'flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-accent transition-colors',
                        isSelected && 'bg-accent/50'
                      )}
                      onClick={() => handleSelect(stock.ticker)}
                    >
                      <span className={cn(
                        'font-mono text-xs font-semibold w-14 shrink-0',
                        isSelected ? 'text-foreground' : 'text-muted-foreground'
                      )}>
                        {stock.ticker}
                      </span>
                      <span className="text-xs text-muted-foreground truncate flex-1">{stock.name}</span>
                      {isSelected && <Check className="h-3 w-3 shrink-0 text-primary" />}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Props ─────────────────────────────────────────────────────────────────
interface TickerSelectorProps {
  /** Comma-separated tickers string, e.g. "AAPL,NVDA,TSLA" */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

// ─── Component ─────────────────────────────────────────────────────────────
export function TickerSelector({ value, onChange, placeholder = 'Search or enter tickers...' }: TickerSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Parse current tickers from comma-separated string
  const selectedTickers = value
    ? value.split(',').map(t => t.trim().toUpperCase()).filter(Boolean)
    : [];

  // Filter stocks by search query (ticker or name)
  const filtered = search.trim()
    ? POPULAR_STOCKS.filter(s =>
        s.ticker.toLowerCase().includes(search.toLowerCase()) ||
        s.name.toLowerCase().includes(search.toLowerCase())
      )
    : POPULAR_STOCKS;

  // Group filtered results by sector
  const grouped = filtered.reduce<Record<string, StockInfo[]>>((acc, stock) => {
    if (!acc[stock.sector]) acc[stock.sector] = [];
    acc[stock.sector].push(stock);
    return acc;
  }, {});

  const toggleTicker = (ticker: string) => {
    const upper = ticker.toUpperCase();
    const next = selectedTickers.includes(upper)
      ? selectedTickers.filter(t => t !== upper)
      : [...selectedTickers, upper];
    onChange(next.join(','));
  };

  const removeTicker = (ticker: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = selectedTickers.filter(t => t !== ticker.toUpperCase());
    onChange(next.join(','));
  };

  // Handle custom ticker entry: press Enter or comma to add
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && search.trim()) {
      e.preventDefault();
      const custom = search.trim().toUpperCase().replace(/,/g, '');
      if (custom && !selectedTickers.includes(custom)) {
        onChange([...selectedTickers, custom].join(','));
      }
      setSearch('');
    }
    if (e.key === 'Backspace' && !search && selectedTickers.length > 0) {
      const next = selectedTickers.slice(0, -1);
      onChange(next.join(','));
    }
  };

  // Focus search input when popover opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {/* ── Trigger area ─────────────────────────────────────── */}
      <PopoverTrigger asChild>
        <div
          className={cn(
            'flex min-h-9 w-full flex-wrap items-center gap-1 rounded-md border border-input bg-transparent px-3 py-1.5 text-sm cursor-pointer',
            'hover:border-ring focus-within:ring-1 focus-within:ring-ring transition-colors',
            open && 'ring-1 ring-ring border-ring'
          )}
          onClick={() => setOpen(true)}
        >
          {selectedTickers.length === 0 && (
            <span className="text-muted-foreground text-xs select-none">
              {placeholder}
            </span>
          )}
          {selectedTickers.map(ticker => (
            <Badge
              key={ticker}
              variant="secondary"
              className="flex items-center gap-0.5 px-1.5 py-0 text-xs font-mono h-5"
            >
              {ticker}
              <button
                type="button"
                onClick={(e) => removeTicker(ticker, e)}
                className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
          <ChevronDown className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </div>
      </PopoverTrigger>

      {/* ── Dropdown panel ───────────────────────────────────── */}
      <PopoverContent
        className="w-80 p-0 bg-node border border-border shadow-xl"
        align="start"
        sideOffset={4}
      >
        {/* Search input */}
        <div className="p-2 border-b border-border">
          <Input
            ref={inputRef}
            placeholder="Search ticker or company name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="h-8 text-xs bg-transparent border-border"
          />
          {search.trim() && !POPULAR_STOCKS.find(s => s.ticker === search.trim().toUpperCase()) && (
            <p className="text-xs text-muted-foreground mt-1 px-1">
              Press <kbd className="bg-muted px-1 rounded text-[10px]">Enter</kbd> to add <span className="font-mono text-foreground">{search.trim().toUpperCase()}</span>
            </p>
          )}
        </div>

        {/* Stock list */}
        <div className="max-h-64 overflow-y-auto py-1">
          {Object.keys(grouped).length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              No stocks found. Press Enter to add custom ticker.
            </div>
          ) : (
            Object.entries(grouped).map(([sector, stocks]) => (
              <div key={sector}>
                {/* Sector header */}
                <div className={cn('px-3 py-1 text-[10px] font-semibold uppercase tracking-wider sticky top-0 bg-node', SECTOR_COLORS[sector] ?? 'text-muted-foreground')}>
                  {sector}
                </div>
                {stocks.map(stock => {
                  const isSelected = selectedTickers.includes(stock.ticker);
                  return (
                    <div
                      key={stock.ticker}
                      className={cn(
                        'flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-accent transition-colors',
                        isSelected && 'bg-accent/50'
                      )}
                      onClick={() => toggleTicker(stock.ticker)}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleTicker(stock.ticker)}
                        className="h-3.5 w-3.5 shrink-0"
                        onClick={e => e.stopPropagation()}
                      />
                      <span className={cn(
                        'font-mono text-xs font-semibold w-14 shrink-0',
                        isSelected ? 'text-foreground' : 'text-muted-foreground'
                      )}>
                        {stock.ticker}
                      </span>
                      <span className="text-xs text-muted-foreground truncate flex-1">
                        {stock.name}
                      </span>
                      {isSelected && <Check className="h-3 w-3 shrink-0 text-primary" />}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer: selected count */}
        {selectedTickers.length > 0 && (
          <div className="border-t border-border px-3 py-1.5 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {selectedTickers.length} ticker{selectedTickers.length > 1 ? 's' : ''} selected
            </span>
            <button
              type="button"
              className="text-xs text-destructive hover:underline"
              onClick={() => onChange('')}
            >
              Clear all
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
