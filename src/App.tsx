import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Trophy, Play, RotateCcw, UserPlus, X, Hammer } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { searchHiveUser, getTrendingUsers, type HiveUser } from './services/hiveService';
import { cn } from './lib/utils';

const GAME_DURATION = 30; // seconds
const GRID_SIZE = 9;
const INITIAL_SPEED = 1000;
const MIN_SPEED = 400;

export default function App() {
  const [gameState, setGameState] = useState<'setup' | 'playing' | 'finished'>('setup');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [moles, setMoles] = useState<HiveUser[]>([]);
  const [activeMoleIndex, setActiveMoleIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [trendingUsers, setTrendingUsers] = useState<HiveUser[]>([]);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('hive-whacker-highscore');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [currentUser, setCurrentUser] = useState<HiveUser | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);

  const loginWithKeychain = () => {
    if (!(window as any).hive_keychain) {
      alert('Please install Hive Keychain extension to sign in!');
      return;
    }

    const username = prompt('Enter your Hive username:');
    if (!username) return;

    (window as any).hive_keychain.requestSignBuffer(
      username,
      'Login to Hive Whacker',
      'Posting',
      async (response: any) => {
        if (response.success) {
          const user = await searchHiveUser(username.toLowerCase());
          if (user) {
            setCurrentUser(user);
            // Optionally add self to moles
            if (!moles.find(m => m.name === user.name)) {
              setMoles(prev => [...prev, user]);
            }
          }
        } else {
          alert('Login failed: ' + response.message);
        }
      }
    );
  };

  const logout = () => {
    setCurrentUser(null);
  };

  useEffect(() => {
    const fetchTrending = async () => {
      const users = await getTrendingUsers();
      setTrendingUsers(users);
    };
    fetchTrending();
  }, []);

  const startGame = () => {
    if (moles.length === 0) return;
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setGameState('playing');
    
    // Start timer
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Start game loop
    spawnMole();
  };

  const spawnMole = useCallback(() => {
    if (gameState !== 'playing' && timeLeft <= 0) return;

    const nextIndex = Math.floor(Math.random() * GRID_SIZE);
    setActiveMoleIndex(nextIndex);

    // Calculate speed based on time left
    const speed = Math.max(MIN_SPEED, INITIAL_SPEED - (GAME_DURATION - timeLeft) * 20);
    
    gameLoopRef.current = setTimeout(() => {
      setActiveMoleIndex(null);
      // Wait a bit before spawning next
      setTimeout(spawnMole, Math.random() * 500 + 200);
    }, speed);
  }, [gameState, timeLeft]);

  const endGame = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (gameLoopRef.current) clearTimeout(gameLoopRef.current);
    setGameState('finished');
    setActiveMoleIndex(null);
  };

  useEffect(() => {
    if (gameState === 'finished' && score > highScore) {
      setHighScore(score);
      localStorage.setItem('hive-whacker-highscore', score.toString());
    }
  }, [gameState, score, highScore]);

  const handleWhack = (index: number) => {
    if (index === activeMoleIndex) {
      setScore((prev) => prev + 10);
      setActiveMoleIndex(null);
      if (gameLoopRef.current) clearTimeout(gameLoopRef.current);
      spawnMole();
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    const user = await searchHiveUser(searchQuery.trim().toLowerCase());
    setIsSearching(false);
    
    if (user) {
      if (!moles.find(m => m.name === user.name)) {
        setMoles([...moles, user]);
      }
      setSearchQuery('');
    } else {
      alert('User not found on Hive!');
    }
  };

  const addMole = (user: HiveUser) => {
    if (!moles.find(m => m.name === user.name)) {
      setMoles([...moles, user]);
    }
  };

  const removeMole = (name: string) => {
    setMoles(moles.filter(m => m.name !== name));
  };

  const getRandomMole = () => {
    if (moles.length === 0) return null;
    return moles[Math.floor(Math.random() * moles.length)];
  };

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#E31337] selection:text-white">
      {/* Header */}
      <header className="border-b border-[#141414] p-6 flex justify-between items-center bg-white">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="font-display text-4xl uppercase tracking-tighter leading-none">Hive Whacker</h1>
            <p className="font-mono text-xs opacity-60 mt-1 uppercase tracking-widest">Built on Hive Blockchain</p>
          </div>
          
          {currentUser ? (
            <div className="flex items-center gap-3 bg-zinc-100 p-2 border border-[#141414]">
              <img src={currentUser.avatar} alt={currentUser.name} className="w-8 h-8 rounded-full border border-[#141414]" referrerPolicy="no-referrer" />
              <div className="flex flex-col">
                <span className="font-mono text-[10px] uppercase opacity-50">Whacker</span>
                <span className="font-display text-sm">@{currentUser.name}</span>
              </div>
              <button 
                onClick={logout}
                className="ml-4 font-mono text-[10px] uppercase hover:text-[#E31337] transition-colors"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button 
              onClick={loginWithKeychain}
              className="bg-[#141414] text-white px-4 py-2 font-display uppercase tracking-wider hover:bg-[#E31337] transition-colors"
            >
              Sign In with Keychain
            </button>
          )}
        </div>
        <div className="flex gap-8 items-center">
          <div className="text-right">
            <p className="font-mono text-[10px] opacity-50 uppercase">High Score</p>
            <p className="font-display text-2xl">{highScore}</p>
          </div>
          {gameState === 'playing' && (
            <div className="text-right">
              <p className="font-mono text-[10px] opacity-50 uppercase">Time Left</p>
              <p className={cn("font-display text-2xl", timeLeft < 10 && "text-[#E31337]")}>{timeLeft}s</p>
            </div>
          )}
          <div className="text-right">
            <p className="font-mono text-[10px] opacity-50 uppercase">Score</p>
            <p className="font-display text-2xl text-[#E31337]">{score}</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-8">
        {gameState === 'setup' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <section className="space-y-8">
              <div className="space-y-4">
                <h2 className="font-display text-3xl italic serif">Choose Your Moles</h2>
                <p className="text-lg opacity-80">Search for Hive users you want to whack. Their avatars will appear in the game.</p>
                
                <form onSubmit={handleSearch} className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Hive username..."
                      className="w-full bg-white border border-[#141414] py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-[#E31337]/20"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSearching}
                    className="bg-[#141414] text-white px-6 py-3 font-display uppercase tracking-wider hover:bg-[#E31337] transition-colors disabled:opacity-50"
                  >
                    {isSearching ? '...' : 'Search'}
                  </button>
                </form>
              </div>

              <div className="space-y-4">
                <h3 className="font-mono text-xs uppercase opacity-50 tracking-widest">Trending Targets</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {trendingUsers.map((user) => (
                    <button
                      key={user.name}
                      onClick={() => addMole(user)}
                      className="group relative aspect-square bg-white border border-[#141414] overflow-hidden hover:border-[#E31337] transition-all"
                    >
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-[#141414] text-white p-1 text-[10px] font-mono truncate">
                        @{user.name}
                      </div>
                      <div className="absolute inset-0 bg-[#E31337]/0 group-hover:bg-[#E31337]/20 flex items-center justify-center transition-all">
                        <UserPlus className="w-6 h-6 text-white opacity-0 group-hover:opacity-100" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="space-y-8">
              <div className="bg-white border border-[#141414] p-8 min-h-[400px] flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="font-display text-3xl">Selected Targets</h2>
                  <span className="font-mono text-xs bg-[#141414] text-white px-2 py-1">{moles.length} Users</span>
                </div>

                {moles.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center opacity-30 text-center space-y-4">
                    <Hammer className="w-16 h-16" />
                    <p className="font-mono uppercase tracking-widest">No targets selected yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-4 flex-1">
                    {moles.map((mole) => (
                      <div key={mole.name} className="relative group aspect-square border border-[#141414]/10">
                        <img
                          src={mole.avatar}
                          alt={mole.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <button
                          onClick={() => removeMole(mole.name)}
                          className="absolute -top-2 -right-2 bg-[#E31337] text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <div className="absolute inset-x-0 bottom-0 bg-white/90 text-[10px] font-mono p-1 truncate border-t border-[#141414]">
                          @{mole.name}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={startGame}
                  disabled={moles.length === 0}
                  className="mt-8 w-full bg-[#E31337] text-white py-4 font-display text-2xl uppercase tracking-widest hover:bg-[#141414] transition-colors disabled:opacity-30 disabled:hover:bg-[#E31337]"
                >
                  Start Whacking
                </button>
              </div>
            </section>
          </div>
        )}

        {gameState === 'playing' && (
          <div className="max-w-2xl mx-auto">
            <div className="grid grid-cols-3 gap-4 md:gap-8 aspect-square">
              {Array.from({ length: GRID_SIZE }).map((_, i) => {
                const isMoleActive = i === activeMoleIndex;
                const mole = isMoleActive ? getRandomMole() : null;
                
                return (
                  <div
                    key={i}
                    className="mole-hole relative aspect-square bg-[#141414]/10 rounded-full border-4 border-[#141414] overflow-hidden shadow-inner"
                  >
                    <AnimatePresence>
                      {isMoleActive && mole && (
                        <motion.button
                          initial={{ y: '100%' }}
                          animate={{ y: '0%' }}
                          exit={{ y: '100%' }}
                          transition={{ type: 'spring', damping: 15, stiffness: 200 }}
                          onClick={() => handleWhack(i)}
                          className="absolute inset-0 w-full h-full cursor-crosshair z-10"
                        >
                          <div className="relative w-full h-full group">
                            <img
                              src={mole.avatar}
                              alt={mole.name}
                              className="w-full h-full object-cover rounded-full border-4 border-[#E31337]"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-[#E31337] text-white text-[10px] font-mono px-2 py-0.5 whitespace-nowrap">
                              @{mole.name}
                            </div>
                          </div>
                        </motion.button>
                      )}
                    </AnimatePresence>
                    {/* Hole depth effect */}
                    <div className="absolute inset-0 rounded-full shadow-[inset_0_10px_20px_rgba(0,0,0,0.4)] pointer-events-none" />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {gameState === 'finished' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md mx-auto bg-white border-4 border-[#141414] p-12 text-center space-y-8 shadow-[12px_12px_0px_#141414]"
          >
            <div className="space-y-2">
              <Trophy className="w-16 h-16 mx-auto text-[#E31337]" />
              <h2 className="font-display text-5xl uppercase">Game Over</h2>
              <p className="font-mono text-sm opacity-50 uppercase tracking-widest">Final Score</p>
            </div>

            <div className="font-display text-8xl text-[#E31337]">{score}</div>

            {score >= highScore && score > 0 && (
              <div className="bg-yellow-100 border border-yellow-400 p-2 font-mono text-xs uppercase animate-bounce">
                New Personal Best!
              </div>
            )}

            <div className="space-y-4 pt-4">
              <button
                onClick={startGame}
                className="w-full bg-[#141414] text-white py-4 font-display text-xl uppercase tracking-widest hover:bg-[#E31337] transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-5 h-5" /> Play Again
              </button>
              <button
                onClick={() => setGameState('setup')}
                className="w-full border-2 border-[#141414] py-4 font-display text-xl uppercase tracking-widest hover:bg-[#141414] hover:text-white transition-colors"
              >
                Change Targets
              </button>
            </div>
          </motion.div>
        )}
      </main>

      {/* Footer Decoration */}
      <footer className="fixed bottom-0 left-0 right-0 p-4 pointer-events-none overflow-hidden h-24">
        <div className="flex gap-4 opacity-5 animate-marquee whitespace-nowrap">
          {Array.from({ length: 20 }).map((_, i) => (
            <span key={i} className="font-display text-8xl uppercase">Whac-A-Mole Hive Edition</span>
          ))}
        </div>
      </footer>
    </div>
  );
}
