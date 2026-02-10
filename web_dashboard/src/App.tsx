import { useState, useEffect } from 'react';
import Login from './Login';
import { supabase } from './supabaseClient';
import { 
  Instagram,
  Youtube,
  Music2,
  Ghost,
  LayoutDashboard, 
  Trophy, 
  Users, 
  LogOut, 
  TrendingDown, 
  Activity,
  Menu,
  X,
  ChevronRight,
  Loader2,
  Settings,
  Save,
  CheckCircle2,
  RefreshCw,
  Calendar,
  AlertCircle,
  CalendarDays,
  Lock
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
  avatarColor: string;
  isCurrentUser: boolean;
}

const AVATAR_COLORS = [
  { name: 'Lila', class: 'bg-brand-100 text-brand-700' },
  { name: 'Blau', class: 'bg-blue-100 text-blue-700' },
  { name: 'Grün', class: 'bg-emerald-100 text-emerald-700' },
  { name: 'Orange', class: 'bg-orange-100 text-orange-700' },
  { name: 'Rot', class: 'bg-red-100 text-red-700' },
  { name: 'Pink', class: 'bg-pink-100 text-pink-700' },
];

// --- COMPONENTS ---

// UPDATE: StatCard - Jetzt komplett clean (Weißer Hintergrund überall)
const StatCard = ({ title, value, subtext, icon: Icon, colorClass }: any) => {
  
  // Wir berechnen eine sehr helle Rahmen-Farbe passend zur Textfarbe
  // Beispiel: Aus 'text-brand-600' wird 'border-brand-100'
  const borderClass = colorClass
    .replace('text-', 'border-')
    .replace('600', '100')
    .replace('500', '100')
    .replace('700', '100');

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-gray-500 text-sm font-medium mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-gray-900 tracking-tight">{value}</h3>
          
          {/* Badge unten links */}
          <p className={cn(
            "text-xs mt-2 font-bold px-2 py-1 rounded-full inline-block border",
            "bg-white",     // Weiß
            colorClass,     // Farbige Schrift
            borderClass     // Farbiger Rahmen (fein)
          )}>
            {subtext}
          </p>
        </div>
        
        {/* HIER IST DIE ÄNDERUNG FÜR DAS SYMBOL */}
        <div className={cn(
          "p-3 rounded-xl border", // Wir geben dem Icon jetzt einen Rahmen
          "bg-white shadow-sm",    // Hintergrund WEISS + kleiner Schatten
          borderClass              // Der Rahmen hat die passende Farbe (Lila, Grün, etc.)
        )}>
          {/* Das Icon selbst bleibt farbig */}
          <Icon className={cn("w-6 h-6", colorClass)} />
        </div>
      </div>
    </div>
  );
};

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
  const [currentUserProfile, setCurrentUserProfile] = useState({ 
    username: '', 
    avatarColor: '', 
    lastChange: null as string | null
  });
  const [appBreakdown, setAppBreakdown] = useState<any[]>([]);

  // NEUE SCORES
  const [scoreToday, setScoreToday] = useState(100);
  const [scoreWeek, setScoreWeek] = useState(0);
  const [scoreMonth, setScoreMonth] = useState(0);

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

  const fetchData = async (userId: string, showLoadingScreen = true) => {
    if (showLoadingScreen) setLoading(true);
    
    try {
      // 1. Profil laden
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, avatar_url, last_username_change')
        .eq('id', userId)
        .single();
      
      if (profile) {
        setCurrentUserProfile({
          username: profile.username || '',
          avatarColor: profile.avatar_url || 'bg-brand-100 text-brand-700',
          lastChange: profile.last_username_change
        });
      }

      // 2. HEUTIGE Stats (Max 100)
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
        setScoreToday(todayData.daily_score || 100);

        // NEU: Apps aufbereiten und sortieren
        const apps = [
          { name: 'Instagram', val: todayData.instagram_min || 0, icon: Instagram, color: 'text-pink-600', bg: 'bg-pink-50', bar: 'bg-pink-500' },
          { name: 'TikTok', val: todayData.tiktok_min || 0, icon: Music2, color: 'text-gray-900', bg: 'bg-gray-100', bar: 'bg-gray-900' },
          { name: 'YouTube', val: todayData.youtube_min || 0, icon: Youtube, color: 'text-red-600', bg: 'bg-red-50', bar: 'bg-red-600' },
          { name: 'Snapchat', val: todayData.snapchat_min || 0, icon: Ghost, color: 'text-yellow-600', bg: 'bg-yellow-50', bar: 'bg-yellow-400' },
        ];
        
        // Sortieren: Meistgenutzte App nach oben
        apps.sort((a, b) => b.val - a.val);
        setAppBreakdown(apps);

      } else {
        setTodayUsage(0);
        setScoreToday(100);
        setAppBreakdown([]); // Leer wenn keine Daten
      }

      // 3. WOCHEN-Score (Berechnung mit Fair-Play Logik)
      // Wir holen die letzten 7 Tage
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 6); // Letzte 7 Tage inkl. heute
      const weekStartStr = weekStart.toISOString().split('T')[0];

      const { data: weekData } = await supabase
        .from('daily_stats')
        .select('daily_score')
        .eq('user_id', userId)
        .gte('date', weekStartStr);

      if (weekData) {
        const sumScores = weekData.reduce((acc, curr) => acc + (curr.daily_score || 0), 0);
        const entriesCount = weekData.length;
        const missingDays = 7 - entriesCount;
        // Formel: Vorhandene Punkte + (Fehlende Tage * 100)
        const totalWeekScore = sumScores + (missingDays * 100);
        setScoreWeek(totalWeekScore);
      }

      // 4. MONATS-Score (Direkt aus der View)
      const { data: monthData } = await supabase
        .from('monthly_leaderboard')
        .select('monthly_score')
        .eq('user_id', userId)
        .single();

      if (monthData) {
        setScoreMonth(monthData.monthly_score || 0);
      } else {
        // Falls Nutzer noch nicht in der View (z.B. ganz neu), berechne grob
        const dayOfMonth = new Date().getDate();
        setScoreMonth(dayOfMonth * 100);
      }

      // 5. CHART DATEN (Letzte 7 Tage)
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

      // 6. LEADERBOARD LADEN (Monatlich)
      const { data: lbData } = await supabase
        .from('monthly_leaderboard')
        .select('*')
        .order('monthly_score', { ascending: false });

      if (lbData) {
        const formattedLb = lbData.map((entry: any, index: number) => ({
          rank: index + 1,
          username: entry.username || 'Unbekannt',
          score: entry.monthly_score || 0,
          isCurrentUser: entry.user_id === userId,
          avatarColor: entry.avatar_url || 'bg-blue-100 text-blue-700'
        }));
        setLeaderboard(formattedLb);
      } else {
        setLeaderboard([]); 
      }

    } catch (error) {
      console.error("Fehler beim Laden:", error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleManualRefresh = () => {
    if (!session) return;
    setIsRefreshing(true);
    fetchData(session.user.id, false);
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

      {/* KPI Cards Grid - Jetzt mit 4 Karten */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* HEUTE */}
        <StatCard 
          title="Score (Heute)" 
          value={scoreToday} // Max 100
          subtext="Max. 100 Pkt" 
          icon={Activity} 
          colorClass="text-emerald-600" 
        />

        {/* WOCHE */}
        <StatCard 
          title="Score (7 Tage)" 
          value={scoreWeek} // Summe
          subtext="Fair Play Summe" 
          icon={Calendar} 
          colorClass="text-blue-600" 
        />

        {/* MONAT */}
        <StatCard 
          title="Score (Monat)" 
          value={scoreMonth} // Summe aus View
          subtext="Aktueller Monat" 
          icon={CalendarDays} 
          colorClass="text-brand-600" 
        />

        {/* RANKING */}
        <StatCard 
          title="Monats-Rang" 
          value={`#${leaderboard.find(u => u.isCurrentUser)?.rank || '-'}`} 
          subtext={`von ${leaderboard.length}`} 
          icon={Trophy} 
          colorClass="text-amber-500" 
        />
      </div>

      {/* Chart & Sidebar Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LINKE SPALTE (Chart) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-bold text-gray-800">Minuten-Verlauf</h3>
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

        {/* RECHTE SPALTE (Container für App-Liste & Leaderboard) */}
        <div className="flex flex-col gap-6">
          
          {/* NEU: App-Nutzung Detail-Karte */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-4">App-Nutzung (Heute)</h3>
            <div className="space-y-4">
              {appBreakdown.length > 0 ? (
                appBreakdown.map((app) => (
                  <div key={app.name}>
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-lg", app.bg)}>
                          <app.icon size={16} className={app.color} />
                        </div>
                        <span className="font-medium text-gray-700 text-sm">{app.name}</span>
                      </div>
                      <span className="font-bold text-gray-900 text-sm">{app.val} min</span>
                    </div>
                    {/* Progress Bar relativ zur Gesamtzeit oder festen Größe */}
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full rounded-full transition-all duration-500", app.bar)} 
                        style={{ width: `${todayUsage > 0 ? (app.val / todayUsage) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-sm">Noch keine Daten heute.</p>
              )}
            </div>
          </div>

          {/* Mini Leaderboard (War vorher schon da) */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex-1">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-800">Top Spieler</h3>
              <button onClick={() => setActiveTab('leaderboard')} className="text-brand-600 hover:bg-brand-50 p-1 rounded-md transition"><ChevronRight size={20} /></button>
            </div>
            <div className="space-y-3">
              {leaderboard.length === 0 ? <p className="text-gray-400 text-sm">Lade Ranking...</p> : 
              leaderboard.slice(0, 3).map((player) => ( // Nur Top 3 zeigen, damit es passt
                <div key={player.rank} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition cursor-pointer group border border-transparent hover:border-gray-100">
                  <div className="flex items-center gap-3">
                    <span className={cn("font-bold w-6 text-center text-sm", player.rank === 1 ? "text-amber-500" : "text-gray-400")}>#{player.rank}</span>
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-sm", player.avatarColor)}>
                      {player.username[0]?.toUpperCase()}
                    </div>
                    <span className={cn("font-bold text-sm truncate max-w-[80px]", player.isCurrentUser ? "text-gray-900" : "text-gray-700")}>{player.username}</span>
                  </div>
                  <span className="font-bold text-brand-600 text-sm">{player.score}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );

  const LeaderboardView = () => {
    
    const getRankBadge = (score: number) => {
      if (score > 2500) return { label: 'Master', classes: 'bg-purple-100 text-purple-700 border-purple-200' };
      if (score > 2000) return { label: 'Diamond', classes: 'bg-cyan-100 text-cyan-700 border-cyan-200' };
      if (score > 1500) return { label: 'Platin', classes: 'bg-slate-100 text-slate-700 border-slate-300' };
      if (score > 1000) return { label: 'Gold', classes: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
      if (score > 500) return { label: 'Silber', classes: 'bg-gray-100 text-gray-700 border-gray-200' };
      return { label: 'Bronze', classes: 'bg-orange-50 text-orange-800 border-orange-200' };
    };

    return (
      <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
        <div className="bg-brand-600 rounded-3xl p-8 text-white shadow-lg shadow-brand-500/20 mb-8">
          <h1 className="text-3xl font-bold">Monats-Ranking</h1>
          <p className="text-brand-100 mt-2">Sammle Punkte, um vom Rookie zum Master aufzusteigen!</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="p-5 text-gray-500 font-semibold text-xs uppercase tracking-wider">Rang</th>
                <th className="p-5 text-gray-500 font-semibold text-xs uppercase tracking-wider">Spieler</th>
                <th className="p-5 text-gray-500 font-semibold text-xs uppercase tracking-wider">Score (Monat)</th>
                <th className="p-5 text-gray-500 font-semibold text-xs uppercase tracking-wider text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leaderboard.map((player) => {
                const badge = getRankBadge(player.score);

                return (
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
                        "px-3 py-1 rounded-full text-xs font-bold border inline-block min-w-[80px] text-center", 
                        badge.classes
                      )}>
                        {badge.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const SettingsView = () => {
    const [name, setName] = useState(currentUserProfile.username);
    const [selectedColor, setSelectedColor] = useState(currentUserProfile.avatarColor);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // BERECHNUNG: Darf der Name geändert werden?
    const calculateDaysLeft = () => {
      if (!currentUserProfile.lastChange) return 0; // Noch nie geändert -> Erlaubt
      
      const lastChangeDate = new Date(currentUserProfile.lastChange);
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - lastChangeDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays < 30 ? 30 - diffDays : 0;
    };

    const daysLeft = calculateDaysLeft();
    const isNameLocked = daysLeft > 0;

    const handleSave = async (e: any) => {
      e.preventDefault();
      setSaving(true);
      setSuccess(false);
      setErrorMsg('');

      // Prüfen: Hat sich der Name überhaupt geändert?
      const nameChanged = name.trim() !== currentUserProfile.username;

      // Sicherheits-Check im Frontend (30 Tage)
      if (nameChanged && isNameLocked) {
        setErrorMsg(`Du kannst deinen Namen erst in ${daysLeft} Tagen wieder ändern.`);
        setSaving(false);
        return;
      }

      const updates: any = {
        avatar_url: selectedColor,
      };

      // Nur wenn Name geändert wurde, aktualisieren wir Name & Zeitstempel
      if (nameChanged) {
        updates.username = name.trim();
        updates.last_username_change = new Date().toISOString();
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', session.user.id);

      setSaving(false);
      
      if (error) {
        if (error.code === '23505') {
          setErrorMsg("Dieser Name ist leider schon vergeben! 😕");
        } else {
          setErrorMsg("Fehler beim Speichern.");
        }
      } else {
        // ERFOLG!
        setSuccess(true);
        
        // Live-Update der App-State (Sidebar & Header aktualisieren sich sofort)
        setCurrentUserProfile({ 
          username: nameChanged ? name.trim() : currentUserProfile.username, 
          avatarColor: selectedColor,
          lastChange: nameChanged ? updates.last_username_change : currentUserProfile.lastChange
        });

        // Erfolgsnachricht nach 3 Sekunden ausblenden
        setTimeout(() => setSuccess(false), 3000);
      }
    };

    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
         <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
            
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
              <div className="bg-gray-100 p-3 rounded-full">
                <Settings className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Einstellungen</h2>
                <p className="text-gray-500">Passe dein Profil an.</p>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-8">
              
              {/* 1. Avatar Auswahl */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Avatar Farbe</label>
                <div className="flex gap-3 flex-wrap">
                  {AVATAR_COLORS.map((color) => (
                    <button
                      key={color.name}
                      type="button"
                      onClick={() => setSelectedColor(color.class)}
                      className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all",
                        selectedColor === color.class ? "border-gray-900 scale-110 shadow-md" : "border-transparent hover:scale-105",
                        color.class
                      )}
                    >
                      <span className="font-bold text-sm">{(name || currentUserProfile.username)?.[0]?.toUpperCase()}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Benutzername (mit Sperre) */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">Benutzername</label>
                  {isNameLocked && (
                    <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded-md border border-orange-100">
                      Änderung in {daysLeft} Tagen möglich
                    </span>
                  )}
                </div>
                
                <div className="relative">
                  <input 
                    type="text" 
                    value={name}
                    disabled={isNameLocked} // Feld sperren!
                    onChange={(e) => {
                      setName(e.target.value);
                      if (errorMsg) setErrorMsg('');
                    }}
                    className={cn(
                      "w-full px-4 py-3 rounded-xl border outline-none transition disabled:bg-gray-50 disabled:text-gray-400",
                      errorMsg 
                        ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100 bg-red-50/30" 
                        : "border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                    )}
                    placeholder="Dein Name"
                  />
                  {isNameLocked && (
                    <Lock className="absolute right-4 top-3.5 text-gray-400" size={18} />
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Der Benutzername kann nur alle 30 Tage geändert werden.
                </p>
              </div>

              <div className="pt-4 flex items-center gap-4">
                <button 
                  disabled={saving}
                  className="bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 px-8 rounded-xl transition flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-brand-500/20"
                >
                  {saving ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>}
                  Speichern
                </button>
                
                {/* Erfolgs-Anzeige */}
                {success && (
                  <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl animate-fade-in shadow-sm">
                    <div className="bg-emerald-100 p-1 rounded-full">
                      <CheckCircle2 size={16} /> 
                    </div>
                    <span className="font-bold text-sm">Erfolgreich gespeichert!</span>
                  </div>
                )}

                {/* Fehler-Anzeige */}
                {errorMsg && (
                  <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 px-4 py-2 rounded-xl animate-fade-in">
                    <AlertCircle size={18} />
                    <span className="font-medium text-sm">{errorMsg}</span>
                  </div>
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
          <NavItem id="settings" icon={Settings} label="Einstellungen" />
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