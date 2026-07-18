import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ChevronDown, Flame, Layers, PlusSquare, Receipt, User } from 'lucide-react';
import { useMarkets } from '../../store/markets';
import { SwipeDeck } from '../SwipeDeck';
import { CreateMarket } from './CreateMarket';
import { MyBets } from './MyBets';

type Tab = 'deck' | 'create' | 'bets';

const TABS: { id: Tab; label: string; icon: typeof Layers }[] = [
  { id: 'deck', label: 'Deck', icon: Layers },
  { id: 'create', label: 'Create', icon: PlusSquare },
  { id: 'bets', label: 'My Bets', icon: Receipt },
];

function formatAccountName(name: string) {
  return name
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function AppPage({ onExit }: { onExit: () => void }) {
  const [tab, setTab] = useState<Tab>('deck');
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const { balance, positions, source, error, accounts, activeAccount, switchAccount, loading } =
    useMarkets();

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setAccountMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return (
    <div className="min-h-screen bg-neo-bg font-mono text-neo-dark">
      <nav className="sticky top-0 z-50 w-full border-b-4 border-neo-dark bg-white">
        <div className="flex flex-col gap-3 p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={onExit}
              className="flex items-center gap-2 text-xl font-black tracking-tighter uppercase transition-colors hover:text-neo-red sm:text-2xl"
            >
              <ArrowLeft size={22} />
              <Flame className="text-neo-red" size={26} />
              <span className="hidden sm:inline">SpiteBet</span>
            </button>

            <span
              title={error ?? undefined}
              className={`neo-border px-2 py-1.5 text-[10px] font-black uppercase sm:px-3 sm:py-2 sm:text-xs lg:hidden ${
                source === 'bento'
                  ? 'bg-neo-green'
                  : source === 'loading'
                    ? 'bg-white'
                    : 'bg-neo-red'
              }`}
            >
              {source === 'bento' ? '● Bento live' : source === 'loading' ? '…' : '● local'}
            </span>
          </div>

          <div className="flex flex-col gap-3 lg:flex-1 lg:flex-row lg:items-center lg:justify-end lg:gap-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end lg:flex-none lg:flex-nowrap">
              {accounts.length > 0 && (
                <div className="relative w-full sm:w-auto" ref={accountMenuRef}>
                  <button
                    type="button"
                    onClick={() => setAccountMenuOpen((open) => !open)}
                    className="group flex w-full min-w-0 items-center gap-3 bg-white neo-border px-3 py-2 text-left shadow-neo-sm transition-all hover:-translate-y-0.5 hover:shadow-neo focus:outline-none sm:min-w-[220px]"
                    aria-haspopup="listbox"
                    aria-expanded={accountMenuOpen}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center bg-neo-yellow neo-border shadow-neo-sm">
                      <User size={16} />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col leading-none">
                      <span className="hidden text-[10px] font-black uppercase tracking-[0.2em] text-neo-dark/70 sm:inline">
                        Playing as
                      </span>
                      <span className="truncate font-black uppercase text-xs tracking-wide text-neo-dark">
                        {formatAccountName(activeAccount?.name ?? '')}
                      </span>
                    </span>
                    <ChevronDown
                      size={15}
                      className={`shrink-0 text-neo-dark/70 transition-transform ${
                        accountMenuOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {accountMenuOpen && (
                    <div className="absolute left-0 top-[calc(100%+10px)] z-50 min-w-full overflow-hidden bg-white neo-border shadow-neo-lg">
                      <div className="border-b-4 border-neo-dark bg-neo-bg px-3 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-neo-dark/60">
                        Switch account
                      </div>
                      <div className="p-2">
                        {accounts.map((account) => {
                          const isActive = account.name === activeAccount?.name;
                          return (
                            <button
                              key={account.name}
                              type="button"
                              onClick={() => {
                                switchAccount(account.name);
                                setAccountMenuOpen(false);
                              }}
                              className={`flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition-colors ${
                                isActive ? 'bg-neo-dark text-white' : 'text-neo-dark hover:bg-neo-yellow'
                              }`}
                              role="option"
                              aria-selected={isActive}
                            >
                              <span className="font-black uppercase tracking-wide">
                                {formatAccountName(account.name)}
                              </span>
                              {isActive && (
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                                  Active
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <span
                title={error ?? undefined}
                className={`hidden neo-border px-3 py-2 font-black uppercase text-xs lg:inline-block ${
                  source === 'bento'
                    ? 'bg-neo-green'
                    : source === 'loading'
                      ? 'bg-white'
                      : 'bg-neo-red'
                }`}
              >
                {source === 'bento' ? '● Bento live' : source === 'loading' ? '… connecting' : '● local'}
              </span>

              <div className="bg-neo-yellow neo-border px-4 py-2 text-center font-black uppercase text-xs shadow-neo-sm sm:text-sm">
                {loading ? '…' : `${balance} credits`}
              </div>
            </div>

            <div className="overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch] lg:flex-none lg:overflow-visible lg:pb-0">
              <div className="mx-auto flex min-w-max border-t-4 border-b-4 border-neo-dark bg-white lg:min-w-0 lg:justify-end lg:border-0 lg:bg-transparent lg:flex-nowrap lg:gap-2">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`flex min-w-[108px] flex-1 items-center justify-center gap-2 border-neo-dark px-4 py-3 text-sm font-black uppercase transition-colors cursor-pointer sm:min-w-[140px] lg:flex-none lg:px-5 lg:py-2 ${
                      tab === t.id ? 'bg-neo-yellow lg:border-b-8' : 'hover:bg-neo-bg'
                    }`}
                  >
                    <t.icon size={16} />
                    {t.label}
                    {t.id === 'bets' && positions.length > 0 && (
                      <span className="rounded-full bg-neo-dark px-2 text-xs text-white">
                        {positions.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="px-3 py-6 sm:px-4 sm:py-10">
        {tab === 'deck' && <SwipeDeck onSeeBets={() => setTab('bets')} />}
        {tab === 'create' && <CreateMarket onCreated={() => setTab('deck')} />}
        {tab === 'bets' && <MyBets onGoSwipe={() => setTab('deck')} />}
      </main>
    </div>
  );
}
