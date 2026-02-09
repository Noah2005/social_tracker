import { useState, useEffect } from 'react';
import Login from './Login';
import { supabase } from './supabaseClient';
import { 
  LayoutDashboard, 
  Trophy, 
  Users, 
  LogOut, 
  TrendingDown, 
  Smartphone,
  Activity,
  Menu,
  X,
  ChevronRight,
  Loader2,
  Settings,
  Save, 
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- HELPER ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- TYPEN ---
interface DailyStat {
  date: string;
  total_minutes: number;
  dayName: string;
}

interface LeaderboardUser {
  rank: number;
  username: string;
  score: number;
  avatarColor: string; // Wir speichern hier die Farbklasse
  isCurrentUser: boolean;
}

// --- FARB-OPTIONEN FÜR AVATARE ---
const AVATAR_COLORS = [
  { name: 'Lila', class: 'bg-brand-100 text-brand-700' },
  { name: 'Blau', class: 'bg-blue-100 text-blue-700' },
  { name: 'Grün', class: 'bg-emerald-100 text-emerald-700' },
  { name: 'Orange', class: 'bg-orange-100 text-orange-700' },
  { name: 'Rot', class: 'bg-red-100 text-red-700' },
  { name: 'Pink', class: 'bg-pink-100 text-pink-700' },
];

// --- COMPONENTS ---

const StatCard = ({ title, value, subtext, icon: Icon, colorClass }: any) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-gray-500 text-sm font-medium mb-1">{title}</p>
        <h3 className="text-3xl font-bold text-gray-900 tracking-tight">{value}</h3>
        <p className={cn("text-xs mt-2 font-bold px-2 py-1 rounded-full inline-block bg-opacity-10", colorClass.replace('text-', 'bg-'), colorClass)}>
          {subtext}
        </p>
      </div>
      <div className={cn("p-3 rounded-xl bg-opacity-10", colorClass.replace('text-', 'bg-'))}>
        <Icon className={cn("w-6 h-6", colorClass)} />
      </div>
    </div>
  </div>
);

// --- HAUPT APP ---

function App() {
  const [session, setSession] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'leaderboard' | 'settings'>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // USER DATEN
  const [myStats, setMyStats] = useState<DailyStat[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [todayUsage, setTodayUsage] = useState(0);
  const [currentUserProfile, setCurrentUserProfile] = useState({ username: '', avatarColor: '' });

  // 1. Session Check & Daten laden
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchData(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchData(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Funktion um Daten aus Supabase zu holen
  // 2. Funktion um Daten aus Supabase zu holen
  // showLoadingScreen = true (Standard) -> Zeigt großen Lader
  // showLoadingScreen = false -> Zeigt nur Button-Animation
  const fetchData = async (userId: string, showLoadingScreen = true) => {
    if (showLoadingScreen) setLoading(true);
    
    try {
      // A) PROFIL LADEN ... (Dein Code hier bleibt gleich)
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', userId)
        .single();
      
      if (profile) {
        setCurrentUserProfile({
          username: profile.username || '',
          avatarColor: profile.avatar_url || 'bg-brand-100 text-brand-700'
        });
      }

      // B) HEUTIGE NUTZUNG ... (Dein Code hier bleibt gleich)
      const today = new Date().toISOString().split('T')[0];
      const { data: todayData } = await supabase
        .from('daily_stats')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .single();

      if (todayData) {
        const total = (todayData.instagram_min || 0) + (todayData.tiktok_min || 0) + (todayData.youtube_min || 0) + (todayData.snapchat_min || 0);
        setTodayUsage(total);
      }

      // C) STATS FÜR CHART ... (Dein Code hier bleibt gleich)
      const { data: statsData } = await supabase
        .from('daily_stats')
        .select('date, instagram_min, tiktok_min, youtube_min, snapchat_min')
        .eq('user_id', userId)
        .order('date', { ascending: true })
        .limit(7);

      if (statsData) {
        const formattedStats = statsData.map((stat: any) => {
          const dateObj = new Date(stat.date);
          const dayName = dateObj.toLocaleDateString('de-DE', { weekday: 'short' });
          const total = (stat.instagram_min || 0) + (stat.tiktok_min || 0) + (stat.youtube_min || 0) + (stat.snapchat_min || 0);
          return { date: stat.date, total_minutes: total, dayName };
        });
        setMyStats(formattedStats);
      }

      // D) LEADERBOARD ... (Dein Code hier bleibt gleich)
      const { data: lbData } = await supabase
        .from('daily_stats')
        .select(`daily_score, user_id, profiles (username, avatar_url)`)
        .eq('date', today)
        .order('daily_score', { ascending: false });

      if (lbData) {
        const formattedLb = lbData.map((entry: any, index: number) => ({
          rank: index + 1,
          username: entry.profiles?.username || 'Unbekannt',
          score: entry.daily_score || 0,
          isCurrentUser: entry.user_id === userId,
          avatarColor: entry.profiles?.avatar_url || 'bg-blue-100 text-blue-700'
        }));
        setLeaderboard(formattedLb);
      } else {
        setLeaderboard([]); 
      }

    } catch (error) {
      console.error("Fehler beim Laden:", error);
    } finally {
      setLoading(false); // Großer Lader aus
      setIsRefreshing(false); // Kleiner Lader aus
    }
  };

  // --- NEU: Die Funktion für den Button ---
  const handleManualRefresh = () => {
    if (!session) return;
    setIsRefreshing(true); // Button-Animation starten
    fetchData(session.user.id, false); // false = Kein großer Ladescreen!
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };
  
  if (!session) return <Login onLoginSuccess={() => {}} />;

  // --- VIEWS ---

  const DashboardView = () => (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
          <p className="text-gray-500 mt-1">
             Hey <span className="font-bold text-brand-600">{currentUserProfile.username}</span>, hier ist dein Status.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Der Refresh Button */}
          <button 
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="p-3 bg-white border border-gray-100 rounded-xl text-gray-500 hover:text-brand-600 hover:border-brand-200 shadow-sm transition-all disabled:opacity-50"
            title="Daten aktualisieren"
          >
            <RefreshCw size={20} className={cn("transition-all", isRefreshing ? "animate-spin text-brand-600" : "")} />
          </button>
        <div className="text-left md:text-right bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Heute verbraucht</p>
          <p className="text-2xl font-bold text-brand-600">{todayUsage} min</p>
        </div>
      </div>
    </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Gesamtzeit (Woche)" 
          value={`${myStats.reduce((acc, curr) => acc + curr.total_minutes, 0)} min`} 
          subtext="Letzte 7 Tage" 
          icon={Smartphone} 
          colorClass="text-brand-600" 
        />
        <StatCard 
          title="Dein Score (Heute)" 
          value={leaderboard.find(u => u.isCurrentUser)?.score || 100} 
          subtext="Täglicher Reset" 
          icon={Activity} 
          colorClass="text-emerald-600" 
        />
        <StatCard 
          title="Ranking" 
          value={`#${leaderboard.find(u => u.isCurrentUser)?.rank || '-'}`} 
          subtext={`von ${leaderboard.length} Spielern`} 
          icon={Trophy} 
          colorClass="text-amber-500" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-bold text-gray-800">Dein Verlauf</h3>
          </div>
          <div className="h-80 w-full">
            {myStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={myStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="dayName" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                  <Tooltip cursor={{fill: '#f5f3ff'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                  <Bar dataKey="total_minutes" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={50} activeBar={{ fill: '#7c3aed' }} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">Noch keine Daten für diese Woche.</div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-800">Top Spieler</h3>
            <button onClick={() => setActiveTab('leaderboard')} className="text-brand-600 hover:bg-brand-50 p-1 rounded-md transition"><ChevronRight size={20} /></button>
          </div>
          <div className="space-y-3 flex-1">
            {leaderboard.length === 0 ? <p className="text-gray-400 text-sm">Noch keine Scores heute.</p> : 
            leaderboard.slice(0, 4).map((player) => (
              <div key={player.rank} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition cursor-pointer group border border-transparent hover:border-gray-100">
                <div className="flex items-center gap-3">
                  <span className={cn("font-bold w-6 text-center text-sm", player.rank === 1 ? "text-amber-500" : "text-gray-400")}>#{player.rank}</span>
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm", player.avatarColor)}>
                    {player.username[0]?.toUpperCase()}
                  </div>
                  <span className={cn("font-bold text-sm", player.isCurrentUser ? "text-gray-900" : "text-gray-700")}>{player.username}</span>
                </div>
                <span className="font-bold text-brand-600">{player.score}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const LeaderboardView = () => (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
       <div className="bg-brand-600 rounded-3xl p-8 text-white shadow-lg shadow-brand-500/20 mb-8">
        <h1 className="text-3xl font-bold">Globales Ranking</h1>
        <p className="text-brand-100 mt-2">Die Top-Detoxer des Tages.</p>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="p-5 text-gray-500 font-semibold text-xs uppercase tracking-wider">Rang</th>
              <th className="p-5 text-gray-500 font-semibold text-xs uppercase tracking-wider">Spieler</th>
              <th className="p-5 text-gray-500 font-semibold text-xs uppercase tracking-wider">Score</th>
              <th className="p-5 text-gray-500 font-semibold text-xs uppercase tracking-wider text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {leaderboard.map((player) => (
              <tr key={player.rank} className={cn("hover:bg-gray-50/80 transition group", player.isCurrentUser && "bg-brand-50/30")}>
                <td className="p-5 font-bold text-gray-500">#{player.rank}</td>
                <td className="p-5 flex items-center gap-4">
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm", player.avatarColor)}>
                      {player.username[0]?.toUpperCase()}
                  </div>
                  <span className={cn("font-medium", player.isCurrentUser ? 'font-bold text-gray-900' : 'text-gray-700')}>
                    {player.username} {player.isCurrentUser && '(Du)'}
                  </span>
                </td>
                <td className="p-5 font-bold text-brand-600">{player.score}</td>
                <td className="p-5 text-right">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold border", 
                    player.score > 90 ? "bg-emerald-50 text-emerald-700 border-emerald-100" : player.score > 50 ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-red-50 text-red-700 border-red-100"
                  )}>
                    {player.score > 90 ? 'Healthy' : player.score > 50 ? 'Warning' : 'Critical'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // --- NEU: SETTINGS VIEW ---
  const SettingsView = () => {
    const [name, setName] = useState(currentUserProfile.username);
    const [selectedColor, setSelectedColor] = useState(currentUserProfile.avatarColor);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSave = async (e: any) => {
      e.preventDefault();
      setSaving(true);
      setSuccess(false);

      const { error } = await supabase
        .from('profiles')
        .update({ 
          username: name,
          avatar_url: selectedColor // Wir speichern die Farb-Klasse im avatar_url Feld
        })
        .eq('id', session.user.id);

      setSaving(false);
      if (!error) {
        setSuccess(true);
        // Lokalen State updaten
        setCurrentUserProfile({ username: name, avatarColor: selectedColor });
        // Nach 2 Sekunden Erfolgsmeldung ausblenden
        setTimeout(() => setSuccess(false), 2000);
      }
    };

    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
         <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-4 mb-8">
              <div className="bg-gray-100 p-3 rounded-full">
                <Settings className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Einstellungen</h2>
                <p className="text-gray-500">Passe dein Profil an.</p>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              {/* Profilbild / Farbe */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Wähle deine Avatar-Farbe</label>
                <div className="flex gap-3 flex-wrap">
                  {AVATAR_COLORS.map((color) => (
                    <button
                      key={color.name}
                      type="button"
                      onClick={() => setSelectedColor(color.class)}
                      className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all",
                        selectedColor === color.class ? "border-gray-900 scale-110" : "border-transparent hover:scale-105",
                        color.class
                      )}
                    >
                      {/* Vorschau des Buchstabens */}
                      <span className="font-bold text-sm">{name?.[0]?.toUpperCase() || 'A'}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Benutzername</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition"
                  placeholder="Dein Name"
                />
              </div>

              {/* Save Button */}
              <div className="pt-4 flex items-center gap-4">
                <button 
                  disabled={saving}
                  className="bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 px-8 rounded-xl transition flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>}
                  Speichern
                </button>
                
                {success && (
                  <span className="text-emerald-600 flex items-center gap-2 font-medium animate-fade-in">
                    <CheckCircle2 size={20} /> Gespeichert!
                  </span>
                )}
              </div>
            </form>
         </div>
      </div>
    );
  };

  const NavItem = ({ id, icon: Icon, label }: any) => (
    <button 
      onClick={() => {
        setActiveTab(id);
        setIsMobileMenuOpen(false);
      }}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
        activeTab === id 
          ? "bg-brand-50 text-brand-700 font-semibold shadow-sm" 
          : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
      )}
    >
      <Icon size={20} className={cn("transition-colors", activeTab === id ? "text-brand-600" : "text-gray-400 group-hover:text-gray-600")} />
      {label}
    </button>
  );

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] font-sans text-base">
      
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-gray-200 fixed h-full hidden md:flex flex-col shadow-[4px_0_24px_-12px_rgba(0,0,0,0.05)] z-20">
        <div className="p-8">
          <div className="flex items-center gap-3 text-brand-600 font-bold text-2xl tracking-tight">
            <div className="bg-brand-600 text-white p-2 rounded-xl shadow-lg shadow-brand-500/30">
              <TrendingDown size={24} color="white" />
            </div>
            <span className="text-gray-900">Social<span className="text-brand-600">Detox</span></span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <p className="px-4 text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Menu</p>
          <NavItem id="dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem id="leaderboard" icon={Users} label="Bestenliste" />
          <NavItem id="settings" icon={Settings} label="Einstellungen" /> {/* NEU */}
        </nav>

        <div className="p-4 border-t border-gray-100 m-4">
          <button onClick={handleLogout} className="flex items-center gap-3 text-gray-500 hover:text-red-600 hover:bg-red-50 transition px-4 py-3 rounded-xl w-full">
            <LogOut size={20} />
            <span className="font-medium">Abmelden</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-gray-200 z-50 px-4 py-3 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2 font-bold text-lg">
          <div className="bg-brand-600 text-white p-1.5 rounded-lg"><TrendingDown size={20} /></div>
          <span>SocialDetox</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition">{isMobileMenuOpen ? <X /> : <Menu />}</button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-white z-40 pt-24 px-4 space-y-4 animate-fade-in">
          <NavItem id="dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem id="leaderboard" icon={Users} label="Bestenliste" />
          <NavItem id="settings" icon={Settings} label="Einstellungen" />
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 md:ml-72 p-4 md:p-8 pt-24 md:pt-8 max-w-7xl mx-auto w-full">
        {loading && activeTab === 'dashboard' && myStats.length === 0 ? (
          <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-brand-600" size={40} /></div>
        ) : (
          <>
            {activeTab === 'dashboard' && <DashboardView />}
            {activeTab === 'leaderboard' && <LeaderboardView />}
            {activeTab === 'settings' && <SettingsView />}
          </>
        )}
      </main>
    </div>
  );
}

export default App;