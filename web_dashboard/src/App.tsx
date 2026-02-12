import { useState, useEffect, useRef } from 'react';
import Login from './Login';
import { supabase } from './supabaseClient';
import { 
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
  CalendarDays,
  Instagram,
  Youtube,
  Music2, 
  Ghost,  
  AlertCircle,
  Lock,
  Swords, 
  Clock,
  Timer,     
  CalendarRange, 
  Trash2,
  AlertTriangle,
  Frown,
  PartyPopper,
  Moon,
  Sun
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
  user_id: string; 
  rank: number;
  username: string;
  score: number;
  avatarColor: string;
  isCurrentUser: boolean;
}

const AVATAR_COLORS = [
  { name: 'Lila', class: 'bg-brand-100 text-brand-700 border-brand-200' },
  { name: 'Blau', class: 'bg-blue-100 text-blue-700 border-blue-200' },
  { name: 'Grün', class: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { name: 'Orange', class: 'bg-orange-100 text-orange-700 border-orange-200' },
  { name: 'Rot', class: 'bg-red-100 text-red-700 border-red-200' },
  { name: 'Pink', class: 'bg-pink-100 text-pink-700 border-pink-200' },
];

// --- COMPONENTS ---

const StatCard = ({ title, value, subtext, icon: Icon, colorClass }: any) => {
  const borderClass = colorClass
    .replace('text-', 'border-')
    .replace('600', '100')
    .replace('500', '100')
    .replace('700', '100');

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 hover:shadow-md transition-all duration-300">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-gray-500 dark:text-slate-400 text-sm font-medium mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{value}</h3>
          <p className={cn("text-xs mt-2 font-bold px-2 py-1 rounded-full inline-block border dark:bg-slate-700/50 dark:border-slate-600", "bg-white", colorClass, borderClass)}>
            {subtext}
          </p>
        </div>
        <div className={cn("p-3 rounded-xl border dark:bg-slate-700/50 dark:border-slate-600", "bg-white shadow-sm", borderClass)}>
          <Icon className={cn("w-6 h-6", colorClass)} />
        </div>
      </div>
    </div>
  );
};

// --- HAUPT APP ---

function App() {
  const [session, setSession] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'leaderboard' | 'battles' | 'settings'>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // DARK MODE STATE
  const [darkMode, setDarkMode] = useState(() => {
    // Beim Start prüfen, was gespeichert ist
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark';
    }
    return false;
  });

  // USER DATEN
  const [myStats, setMyStats] = useState<DailyStat[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [todayUsage, setTodayUsage] = useState(0);
  const [currentUserProfile, setCurrentUserProfile] = useState({ 
    username: '', 
    avatarColor: '',
    lastChange: null as string | null
  });

  // SCORES
  const [scoreToday, setScoreToday] = useState(100);
  const [scoreWeek, setScoreWeek] = useState(0);
  const [scoreMonth, setScoreMonth] = useState(0);
  const [appBreakdown, setAppBreakdown] = useState<any[]>([]);
  const [battles, setBattles] = useState<any[]>([]);

  // MODAL STATES
  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);
  const [challengeOpponent, setChallengeOpponent] = useState<{id: string, name: string} | null>(null);
  const [challengeDuration, setChallengeDuration] = useState('7_days');
  const [challengeSending, setChallengeSending] = useState(false);
  const [battleToDelete, setBattleToDelete] = useState<string | null>(null);

  // Dark Mode Effekt
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

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

  // Smoother Battle Load: Laden beim Tab-Wechsel
  useEffect(() => {
    if (activeTab === 'battles' && session) {
      // Wir rufen fetch auf, aber löschen 'battles' nicht vorher.
      // So bleiben die alten Battles sichtbar bis die neuen da sind -> Kein Flackern.
      fetchBattlesAndScores();
    }
  }, [activeTab, session]);

  const fetchData = async (userId: string, showLoadingScreen = true) => {
    if (showLoadingScreen) setLoading(true);
    
    try {
      const { data: profile } = await supabase.from('profiles').select('username, avatar_url, last_username_change').eq('id', userId).single();
      if (profile) {
        setCurrentUserProfile({
          username: profile.username || '',
          avatarColor: profile.avatar_url || 'bg-brand-100 text-brand-700',
          lastChange: profile.last_username_change
        });
      }

      const today = new Date().toISOString().split('T')[0];
      const { data: todayData } = await supabase.from('daily_stats').select('*').eq('user_id', userId).eq('date', today).single();

      if (todayData) {
        const total = (todayData.instagram_min || 0) + (todayData.tiktok_min || 0) + (todayData.youtube_min || 0) + (todayData.snapchat_min || 0);
        setTodayUsage(total);
        setScoreToday(todayData.daily_score || 100);

        const apps = [
          { name: 'Instagram', val: todayData.instagram_min || 0, icon: Instagram, color: 'text-pink-600', bg: 'bg-pink-50', bar: 'bg-pink-500' },
          { name: 'TikTok', val: todayData.tiktok_min || 0, icon: Music2, color: 'text-gray-900 dark:text-gray-100', bg: 'bg-gray-100 dark:bg-slate-700', bar: 'bg-gray-900 dark:bg-gray-100' },
          { name: 'YouTube', val: todayData.youtube_min || 0, icon: Youtube, color: 'text-red-600', bg: 'bg-red-50', bar: 'bg-red-600' },
          { name: 'Snapchat', val: todayData.snapchat_min || 0, icon: Ghost, color: 'text-yellow-600', bg: 'bg-yellow-50', bar: 'bg-yellow-400' },
        ];
        apps.sort((a, b) => b.val - a.val);
        setAppBreakdown(apps);
      } else {
        setTodayUsage(0);
        setScoreToday(100);
        setAppBreakdown([]);
      }

      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 6);
      const { data: weekData } = await supabase.from('daily_stats').select('daily_score').eq('user_id', userId).gte('date', weekStart.toISOString().split('T')[0]);
      if (weekData) {
        const sumScores = weekData.reduce((acc, curr) => acc + (curr.daily_score || 0), 0);
        setScoreWeek(sumScores + ((7 - weekData.length) * 100));
      }

      const { data: monthData } = await supabase.from('monthly_leaderboard').select('monthly_score').eq('user_id', userId).single();
      setScoreMonth(monthData?.monthly_score || new Date().getDate() * 100);

      const { data: statsData } = await supabase.from('daily_stats').select('date, instagram_min, tiktok_min, youtube_min, snapchat_min').eq('user_id', userId).order('date', { ascending: true }).limit(7);
      if (statsData) {
        setMyStats(statsData.map((stat: any) => ({
          date: stat.date,
          total_minutes: (stat.instagram_min || 0) + (stat.tiktok_min || 0) + (stat.youtube_min || 0) + (stat.snapchat_min || 0),
          dayName: new Date(stat.date).toLocaleDateString('de-DE', { weekday: 'short' })
        })));
      }

      const { data: lbData } = await supabase.from('monthly_leaderboard').select('*').order('monthly_score', { ascending: false });
      if (lbData) {
        setLeaderboard(lbData.map((entry: any, index: number) => ({
          rank: index + 1,
          user_id: entry.user_id,
          username: entry.username || 'Unbekannt',
          score: entry.monthly_score || 0,
          isCurrentUser: entry.user_id === userId,
          avatarColor: entry.avatar_url || 'bg-blue-100 text-blue-700'
        })));
      }

      await fetchBattlesAndScores();

    } catch (error) {
      console.error("Fehler:", error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const fetchBattlesAndScores = async () => {
    if (!session) return;
    
    // HIER KEIN setBattles([]) machen! Das verhindert das Flackern.
    
    const { data: battlesData } = await supabase
      .from('battles')
      .select(`*, challenger:challenger_id(username, avatar_url), opponent:opponent_id(username, avatar_url)`)
      .or(`challenger_id.eq.${session.user.id},opponent_id.eq.${session.user.id}`)
      .order('created_at', { ascending: false });

    if (!battlesData) {
      setBattles([]);
      return;
    }

    const today = new Date();
    const enrichedBattles = await Promise.all(battlesData.map(async (battle) => {
      const endDate = new Date(battle.end_date);
      
      // AUTO-FINISH
      if (battle.status === 'active' && today > endDate) {
        const { data: stats } = await supabase
          .from('daily_stats')
          .select('user_id, daily_score')
          .gte('date', battle.start_date)
          .lte('date', battle.end_date)
          .in('user_id', [battle.challenger_id, battle.opponent_id]);

        let chScore = 0;
        let opScore = 0;
        if (stats) {
          stats.forEach((s: any) => {
            if (s.user_id === battle.challenger_id) chScore += s.daily_score;
            if (s.user_id === battle.opponent_id) opScore += s.daily_score;
          });
        }
        
        let winnerId = null;
        if (chScore > opScore) winnerId = battle.challenger_id;
        else if (opScore > chScore) winnerId = battle.opponent_id;
        
        await supabase.from('battles').update({ status: 'finished', winner_id: winnerId }).eq('id', battle.id);
        
        battle.status = 'finished';
        battle.winner_id = winnerId;
      }

      // SCORES
      let challengerScore = 0;
      let opponentScore = 0;
      if (battle.status === 'active' || battle.status === 'finished') {
        const { data: stats } = await supabase
          .from('daily_stats')
          .select('user_id, daily_score')
          .gte('date', battle.start_date)
          .lte('date', battle.end_date || today.toISOString())
          .in('user_id', [battle.challenger_id, battle.opponent_id]);

        if (stats) {
          stats.forEach((s: any) => {
            if (s.user_id === battle.challenger_id) challengerScore += s.daily_score;
            if (s.user_id === battle.opponent_id) opponentScore += s.daily_score;
          });
        }
      }

      return { ...battle, challengerScore, opponentScore };
    }));

    setBattles(enrichedBattles);
  };

  const openChallengeModal = (opponentId: string, opponentName: string) => {
    const existingBattle = battles.find(b => 
      (b.status === 'pending' || b.status === 'active') && 
      ((b.challenger_id === session.user.id && b.opponent_id === opponentId) || 
       (b.opponent_id === session.user.id && b.challenger_id === opponentId))
    );

    if (existingBattle) {
      alert(`Du hast bereits ein laufendes Battle mit ${opponentName}!`);
      return;
    }

    setChallengeOpponent({ id: opponentId, name: opponentName });
    setChallengeDuration('7_days'); 
    setIsChallengeModalOpen(true);
  };

  const sendChallenge = async () => {
    if (!challengeOpponent) return;
    setChallengeSending(true);
    const { error } = await supabase.from('battles').insert({
      challenger_id: session.user.id,
      opponent_id: challengeOpponent.id,
      duration: challengeDuration,
      status: 'pending'
    });
    setChallengeSending(false);
    if (error) alert('Fehler beim Senden.');
    else { setIsChallengeModalOpen(false); fetchBattlesAndScores(); }
  };

  const confirmDeleteBattle = async () => {
    if (!battleToDelete) return;
    const { error } = await supabase.from('battles').delete().eq('id', battleToDelete);
    if (error) alert('Fehler beim Löschen.');
    else {
      // Optimistic UI Update: Sofort entfernen
      setBattles((prev) => prev.filter((b) => b.id !== battleToDelete));
      fetchBattlesAndScores();
    }
    setBattleToDelete(null);
  };

  const handleManualRefresh = () => { if (session) { setIsRefreshing(true); fetchData(session.user.id, false); } };
  const handleLogout = async () => { await supabase.auth.signOut(); setSession(null); };

  if (!session) return <Login onLoginSuccess={() => {}} />;

  // --- VIEWS ---

  const DashboardView = () => (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Dashboard</h1>
          <p className="text-gray-500 dark:text-slate-400 mt-1">Hey <span className="font-bold text-brand-600 dark:text-brand-400">{currentUserProfile.username}</span>, hier ist dein Status.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleManualRefresh} disabled={isRefreshing} className="p-3 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl text-gray-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:border-brand-200 shadow-sm transition-all disabled:opacity-50">
            <RefreshCw size={20} className={cn("transition-all", isRefreshing ? "animate-spin text-brand-600" : "")} />
          </button>
          <div className="text-left md:text-right bg-white dark:bg-slate-800 px-4 py-2 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Heute verbraucht</p>
            <p className="text-2xl font-bold text-brand-600 dark:text-brand-400">{todayUsage} min</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Score (Heute)" value={scoreToday} subtext="Max. 100 Pkt" icon={Activity} colorClass="text-emerald-600" />
        <StatCard title="Score (7 Tage)" value={scoreWeek} subtext="Fair Play Summe" icon={Calendar} colorClass="text-blue-600" />
        <StatCard title="Score (Monat)" value={scoreMonth} subtext="Aktueller Monat" icon={CalendarDays} colorClass="text-brand-600" />
        <StatCard title="Monats-Rang" value={`#${leaderboard.find(u => u.isCurrentUser)?.rank || '-'}`} subtext={`von ${leaderboard.length}`} icon={Trophy} colorClass="text-amber-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">Minuten-Verlauf</h3>
          </div>
          <div className="h-80 w-full">
            {myStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={myStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#334155" : "#f3f4f6"} />
                  <XAxis dataKey="dayName" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                  <Tooltip 
                    cursor={{fill: darkMode ? '#1e293b' : '#f5f3ff'}} 
                    contentStyle={{borderRadius: '12px', border: 'none', backgroundColor: darkMode ? '#1e293b' : '#fff', color: darkMode ? '#fff' : '#000', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} 
                  />
                  <Bar dataKey="total_minutes" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={50} activeBar={{ fill: '#7c3aed' }} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-gray-400">Noch keine Daten für diese Woche.</div>}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">App-Nutzung (Heute)</h3>
            <div className="space-y-4">
              {appBreakdown.length > 0 ? (
                appBreakdown.map((app) => (
                  <div key={app.name}>
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-lg", app.bg, "dark:bg-opacity-10 dark:text-white")}><app.icon size={16} className={app.color} /></div>
                        <span className="font-medium text-gray-700 dark:text-slate-300 text-sm">{app.name}</span>
                      </div>
                      <span className="font-bold text-gray-900 dark:text-white text-sm">{app.val} min</span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all duration-500", app.bar)} style={{ width: `${todayUsage > 0 ? (app.val / todayUsage) * 100 : 0}%` }} />
                    </div>
                  </div>
                ))
              ) : <p className="text-gray-400 text-sm">Noch keine Daten heute.</p>}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex-1">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">Top Spieler</h3>
              <button onClick={() => setActiveTab('leaderboard')} className="text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-slate-700 p-1 rounded-md transition"><ChevronRight size={20} /></button>
            </div>
            <div className="space-y-3">
              {leaderboard.slice(0, 3).map((player) => (
                <div key={player.rank} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer group border border-transparent hover:border-gray-100 dark:hover:border-slate-600">
                  <div className="flex items-center gap-3">
                    <span className={cn("font-bold w-6 text-center text-sm", player.rank === 1 ? "text-amber-500" : "text-gray-400")}>#{player.rank}</span>
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-sm border border-white/10", player.avatarColor)}>{player.username[0]?.toUpperCase()}</div>
                    <span className={cn("font-bold text-sm truncate max-w-[80px]", player.isCurrentUser ? "text-gray-900 dark:text-white" : "text-gray-700 dark:text-slate-300")}>{player.username}</span>
                  </div>
                  <span className="font-bold text-brand-600 dark:text-brand-400 text-sm">{player.score}</span>
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
      if (score > 2500) return { label: 'Master', classes: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700' };
      if (score > 2000) return { label: 'Diamond', classes: 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-700' };
      if (score > 1500) return { label: 'Platin', classes: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-500' };
      if (score > 1000) return { label: 'Gold', classes: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700' };
      if (score > 500) return { label: 'Silber', classes: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600' };
      return { label: 'Bronze', classes: 'bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700' };
    };

    return (
      <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
        <div className="bg-brand-600 rounded-3xl p-8 text-white shadow-lg shadow-brand-500/20 mb-8">
          <h1 className="text-3xl font-bold">Monats-Ranking</h1>
          <p className="text-brand-100 mt-2">Sammle Punkte, um vom Rookie zum Master aufzusteigen!</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-slate-900/50 border-b border-gray-100 dark:border-slate-700">
              <tr>
                <th className="p-5 text-gray-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">Rang</th>
                <th className="p-5 text-gray-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">Spieler</th>
                <th className="p-5 text-gray-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">Score</th>
                <th className="p-5 text-gray-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {leaderboard.map((player) => {
                const badge = getRankBadge(player.score);
                return (
                  <tr key={player.rank} className={cn("hover:bg-gray-50/80 dark:hover:bg-slate-700/50 transition group", player.isCurrentUser && "bg-brand-50/30 dark:bg-brand-900/10")}>
                    <td className="p-5 font-bold text-gray-500 dark:text-slate-400">#{player.rank}</td>
                    <td className="p-5 flex items-center gap-4">
                      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm border border-white/20", player.avatarColor)}>{player.username[0]?.toUpperCase()}</div>
                      <span className={cn("font-medium", player.isCurrentUser ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-slate-300')}>{player.username} {player.isCurrentUser && '(Du)'}</span>
                    </td>
                    <td className="p-5 font-bold text-brand-600 dark:text-brand-400">{player.score}</td>
                    <td className="p-5 text-right flex items-center justify-end gap-3">
                      <span className={cn("px-3 py-1 rounded-full text-xs font-bold border inline-block min-w-[80px] text-center", badge.classes)}>{badge.label}</span>
                      {!player.isCurrentUser && (
                         <button 
                           onClick={() => openChallengeModal(player.user_id, player.username)}
                           className="p-2 bg-gray-50 dark:bg-slate-700 hover:bg-orange-50 dark:hover:bg-orange-900/30 text-gray-400 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 rounded-lg transition border border-transparent hover:border-orange-200"
                           title="Zum Battle herausfordern"
                         >
                           <Swords size={18} />
                         </button>
                      )}
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

  const BattleView = () => (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-3xl p-8 text-white shadow-lg mb-8">
        <div className="flex items-center gap-4">
          <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm"><Swords size={32} className="text-white" /></div>
          <div><h1 className="text-3xl font-bold">Social Battles</h1><p className="text-violet-100 mt-1">Fordere Freunde heraus und zeig, wer weniger am Handy hängt.</p></div>
        </div>
      </div>

      <div className="grid gap-4">
        {battles.length === 0 ? <div className="text-center p-12 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 text-gray-500 dark:text-slate-400">Noch keine Battles. Gehe zur Bestenliste und fordere jemanden heraus!</div> : 
          battles.map((battle) => {
            const isMeChallenger = battle.challenger_id === session.user.id;
            const opponent = isMeChallenger ? battle.opponent : battle.challenger;
            const myScore = isMeChallenger ? battle.challengerScore : battle.opponentScore;
            const enemyScore = isMeChallenger ? battle.opponentScore : battle.challengerScore;
            const isFinished = battle.status === 'finished';
            const iWon = battle.winner_id === session.user.id;
            const draw = !battle.winner_id;

            return (
              <div key={battle.id} className={cn("bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 relative overflow-hidden", isFinished && iWon ? "border-amber-200 bg-amber-50/30 dark:bg-amber-900/10 dark:border-amber-800" : "")}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                     <div className="flex flex-col items-center">
                        <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">{battle.duration.replace('_', ' ')}</span>
                        <div className="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 font-black text-sm px-2 py-1 rounded-lg border border-orange-200 dark:border-orange-800 mt-1">VS</div>
                     </div>
                     <div>
                       <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                         {opponent?.username || 'Gegner'}
                         {isFinished && iWon && <Trophy size={16} className="text-amber-500" />}
                       </h3>
                       <div className="flex items-center gap-2 mt-0.5">
                         <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase", 
                           battle.status === 'active' ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : 
                           battle.status === 'pending' ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" : "bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400"
                         )}>
                           {battle.status === 'active' ? 'Läuft' : battle.status === 'pending' ? 'Wartet' : 'Beendet'}
                         </span>
                         {battle.status === 'active' && <span className="text-[10px] text-gray-400 dark:text-slate-500 flex items-center gap-1"><Clock size={10} /> bis {new Date(battle.end_date).toLocaleDateString()}</span>}
                       </div>
                     </div>
                  </div>

                  <div className="flex gap-2">
                    {battle.status === 'pending' && !isMeChallenger && (
                      <button 
                        onClick={async () => {
                          const start = new Date();
                          const end = new Date();
                          if (battle.duration === '1_day') end.setDate(end.getDate() + 1);
                          else if (battle.duration === '30_days') end.setDate(end.getDate() + 30);
                          else end.setDate(end.getDate() + 7);
                          await supabase.from('battles').update({ status: 'active', start_date: start, end_date: end }).eq('id', battle.id);
                          fetchBattlesAndScores();
                        }}
                        className="bg-brand-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-brand-700 transition shadow-lg shadow-brand-500/20"
                      >
                        Annehmen
                      </button>
                    )}
                    <button onClick={() => setBattleToDelete(battle.id)} className="p-2.5 bg-red-50 dark:bg-red-900/20 text-red-400 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 hover:text-red-600 rounded-xl transition">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {(battle.status === 'active' || battle.status === 'finished') && (
                   <div className="mt-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4 border border-gray-100 dark:border-slate-700/50">
                      {isFinished ? (
                        <div className="text-center py-2">
                           {iWon ? (
                             <div className="animate-fade-in">
                               <div className="flex justify-center mb-2"><PartyPopper className="text-amber-500 w-8 h-8 animate-bounce" /></div>
                               <h3 className="text-xl font-bold text-gray-900 dark:text-white">Gewonnen! 🎉</h3>
                               <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Du hast {myScore} Punkte gesammelt (Gegner: {enemyScore})</p>
                             </div>
                           ) : draw ? (
                              <div>
                                <h3 className="text-lg font-bold text-gray-700 dark:text-slate-200">Unentschieden! 🤝</h3>
                                <p className="text-sm text-gray-500 dark:text-slate-400">{myScore} zu {enemyScore}</p>
                              </div>
                           ) : (
                             <div>
                               <div className="flex justify-center mb-2"><Frown className="text-gray-400 w-8 h-8" /></div>
                               <h3 className="text-lg font-bold text-gray-700 dark:text-slate-200">Verloren</h3>
                               <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Gegner hatte {enemyScore} Punkte (Du: {myScore})</p>
                             </div>
                           )}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-xs font-bold mb-1">
                              <span className="dark:text-white">Du</span>
                              <span className="text-brand-600 dark:text-brand-400">{myScore} Pkt</span>
                            </div>
                            <div className="h-2 bg-gray-200 dark:bg-slate-600 rounded-full overflow-hidden">
                              <div className="h-full bg-brand-500 rounded-full transition-all duration-1000" style={{ width: `${Math.min((myScore / (Math.max(myScore, enemyScore) || 1)) * 100, 100)}%` }} />
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-xs font-bold mb-1">
                              <span className="text-gray-500 dark:text-slate-400">{opponent?.username}</span>
                              <span className="text-gray-700 dark:text-slate-300">{enemyScore} Pkt</span>
                            </div>
                            <div className="h-2 bg-gray-200 dark:bg-slate-600 rounded-full overflow-hidden">
                              <div className="h-full bg-orange-400 rounded-full transition-all duration-1000" style={{ width: `${Math.min((enemyScore / (Math.max(myScore, enemyScore) || 1)) * 100, 100)}%` }} />
                            </div>
                          </div>
                        </div>
                      )}
                   </div>
                )}
              </div>
            );
          })
        }
      </div>
    </div>
  );

  const SettingsView = () => {
    const [name, setName] = useState(currentUserProfile.username);
    const [selectedColor, setSelectedColor] = useState(currentUserProfile.avatarColor);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const calculateDaysLeft = () => {
      if (!currentUserProfile.lastChange) return 0;
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

      const nameChanged = name.trim() !== currentUserProfile.username;
      if (nameChanged && isNameLocked) {
        setErrorMsg(`Du kannst deinen Namen erst in ${daysLeft} Tagen wieder ändern.`);
        setSaving(false);
        return;
      }
      const updates: any = { avatar_url: selectedColor };
      if (nameChanged) {
        updates.username = name.trim();
        updates.last_username_change = new Date().toISOString();
      }
      const { error } = await supabase.from('profiles').update(updates).eq('id', session.user.id);
      setSaving(false);
      if (error) {
        if (error.code === '23505') setErrorMsg("Dieser Name ist leider schon vergeben! 😕");
        else setErrorMsg("Fehler beim Speichern.");
      } else {
        setSuccess(true);
        setCurrentUserProfile({ username: nameChanged ? name.trim() : currentUserProfile.username, avatarColor: selectedColor, lastChange: nameChanged ? updates.last_username_change : currentUserProfile.lastChange });
        setTimeout(() => setSuccess(false), 3000);
      }
    };

    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
         <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 relative overflow-hidden">
            <div className="flex items-center gap-4 mb-8">
              <div className="bg-gray-100 dark:bg-slate-700 p-3 rounded-full"><Settings className="w-6 h-6 text-gray-600 dark:text-slate-300" /></div>
              <div><h2 className="text-2xl font-bold text-gray-900 dark:text-white">Einstellungen</h2><p className="text-gray-500 dark:text-slate-400">Passe dein Profil an.</p></div>
            </div>

            {/* NEU: DARK MODE TOGGLE */}
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-900/50 rounded-xl border border-gray-100 dark:border-slate-700 mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                  {darkMode ? <Moon size={20} className="text-indigo-400" /> : <Sun size={20} className="text-amber-500" />}
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">Erscheinungsbild</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">{darkMode ? 'Dunkler Modus aktiv' : 'Heller Modus aktiv'}</p>
                </div>
              </div>
              <button 
                onClick={() => setDarkMode(!darkMode)}
                className={cn("w-14 h-8 rounded-full p-1 transition-colors relative", darkMode ? "bg-brand-600" : "bg-gray-200")}
              >
                <div className={cn("w-6 h-6 bg-white rounded-full shadow-sm transition-transform", darkMode ? "translate-x-6" : "translate-x-0")} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-8">
              <div><label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">Avatar Farbe</label><div className="flex gap-3 flex-wrap">{AVATAR_COLORS.map((color) => (<button key={color.name} type="button" onClick={() => setSelectedColor(color.class)} className={cn("w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all", selectedColor === color.class ? "border-gray-900 dark:border-white scale-110 shadow-md" : "border-transparent hover:scale-105", color.class)}><span className="font-bold text-sm">{(name || currentUserProfile.username)?.[0]?.toUpperCase()}</span></button>))}</div></div>
              <div><div className="flex justify-between items-center mb-2"><label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Benutzername</label>{isNameLocked && <span className="text-xs font-medium text-orange-600 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-md border border-orange-100 dark:border-orange-900/50">Änderung in {daysLeft} Tagen möglich</span>}</div><div className="relative"><input type="text" value={name} disabled={isNameLocked} onChange={(e) => {setName(e.target.value); if (errorMsg) setErrorMsg('');}} className={cn("w-full px-4 py-3 rounded-xl border outline-none transition disabled:bg-gray-50 dark:disabled:bg-slate-800/50 disabled:text-gray-400 bg-white dark:bg-slate-900 text-gray-900 dark:text-white", errorMsg ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100 bg-red-50/30" : "border-gray-200 dark:border-slate-600 focus:border-brand-500 focus:ring-2 focus:ring-brand-200")} placeholder="Dein Name" />{isNameLocked && <Lock className="absolute right-4 top-3.5 text-gray-400" size={18} />}</div><p className="text-xs text-gray-400 mt-2">Der Benutzername kann aus Sicherheitsgründen nur alle 30 Tage geändert werden.</p></div>
              <div className="pt-4 flex items-center gap-4"><button disabled={saving} className="bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 px-8 rounded-xl transition flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-brand-500/20">{saving ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>} Speichern</button>{success && <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-4 py-2 rounded-xl animate-fade-in shadow-sm"><div className="bg-emerald-100 dark:bg-emerald-900 p-1 rounded-full"><CheckCircle2 size={16} /></div><span className="font-bold text-sm">Erfolgreich gespeichert!</span></div>}{errorMsg && <div className="flex items-center gap-2 text-red-700 bg-red-50 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800 px-4 py-2 rounded-xl animate-fade-in"><AlertCircle size={18} /><span className="font-medium text-sm">{errorMsg}</span></div>}</div>
            </form>
         </div>
      </div>
    );
  };

  const NavItem = ({ id, icon: Icon, label }: any) => (
    <button onClick={() => { setActiveTab(id); setIsMobileMenuOpen(false); }} className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group", activeTab === id ? "bg-brand-50 dark:bg-slate-800 text-brand-700 dark:text-brand-400 font-semibold shadow-sm" : "text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white")}>
      <Icon size={20} className={cn("transition-colors", activeTab === id ? "text-brand-600 dark:text-brand-400" : "text-gray-400 dark:text-slate-500 group-hover:text-gray-600 dark:group-hover:text-slate-300")} />
      {label}
    </button>
  );

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] dark:bg-slate-950 font-sans text-base transition-colors duration-300">
      <aside className="w-72 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 fixed h-full hidden md:flex flex-col shadow-[4px_0_24px_-12px_rgba(0,0,0,0.05)] z-20 transition-colors duration-300">
        <div className="p-8">
          <div className="flex items-center gap-3 text-brand-600 dark:text-brand-400 font-bold text-2xl tracking-tight">
            <div className="bg-brand-600 text-white p-2 rounded-xl shadow-lg shadow-brand-500/30"><TrendingDown size={24} color="white" /></div>
            <span className="text-gray-900 dark:text-white">Social<span className="text-brand-600 dark:text-brand-400">Detox</span></span>
          </div>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <p className="px-4 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-2">Menu</p>
          <NavItem id="dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem id="leaderboard" icon={Users} label="Bestenliste" />
          <NavItem id="battles" icon={Swords} label="Battles" />
          <NavItem id="settings" icon={Settings} label="Einstellungen" />
        </nav>
        <div className="p-4 border-t border-gray-100 dark:border-slate-800 m-4">
          <button onClick={handleLogout} className="flex items-center gap-3 text-gray-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition px-4 py-3 rounded-xl w-full">
            <LogOut size={20} /> <span className="font-medium">Abmelden</span>
          </button>
        </div>
      </aside>

      <div className="md:hidden fixed top-0 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-200 dark:border-slate-800 z-50 px-4 py-3 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2 font-bold text-lg text-gray-900 dark:text-white"><div className="bg-brand-600 text-white p-1.5 rounded-lg"><TrendingDown size={20} /></div><span>SocialDetox</span></div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition">{isMobileMenuOpen ? <X /> : <Menu />}</button>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-white dark:bg-slate-900 z-40 pt-24 px-4 space-y-4 animate-fade-in">
          <NavItem id="dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem id="leaderboard" icon={Users} label="Bestenliste" />
          <NavItem id="battles" icon={Swords} label="Battles" />
          <NavItem id="settings" icon={Settings} label="Einstellungen" />
        </div>
      )}

      {/* --- CHALLENGE MODAL --- */}
      {isChallengeModalOpen && challengeOpponent && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-md w-full p-6 relative">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Herausforderung</h3>
              <button onClick={() => setIsChallengeModalOpen(false)} className="p-2 bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 rounded-full transition">
                <X size={20} className="text-gray-500 dark:text-slate-400" />
              </button>
            </div>
            
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-brand-100 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <Swords size={32} />
              </div>
              <p className="text-gray-600 dark:text-slate-300">
                Du forderst <span className="font-bold text-gray-900 dark:text-white">{challengeOpponent.name}</span> heraus!
                <br/>Wer sammelt im Zeitraum mehr Punkte?
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-8">
              {[
                { id: '1_day', label: '1 Tag', icon: Timer },
                { id: '7_days', label: '1 Woche', icon: Calendar },
                { id: '30_days', label: '1 Monat', icon: CalendarRange },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setChallengeDuration(opt.id)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all",
                    challengeDuration === opt.id 
                      ? "border-brand-600 bg-brand-50 dark:bg-brand-900/30 dark:border-brand-500 text-brand-700 dark:text-brand-300" 
                      : "border-gray-100 dark:border-slate-700 hover:border-brand-200 dark:hover:border-slate-600 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800"
                  )}
                >
                  <opt.icon size={24} />
                  <span className="text-xs font-bold">{opt.label}</span>
                </button>
              ))}
            </div>

            <button 
              onClick={sendChallenge}
              disabled={challengeSending}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-4 rounded-xl transition shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2"
            >
              {challengeSending ? <Loader2 className="animate-spin" /> : "Jetzt herausfordern!"}
            </button>
          </div>
        </div>
      )}

      {/* --- DELETE / CANCEL BATTLE MODAL --- */}
      {battleToDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center">
             <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
               <AlertTriangle size={32} />
             </div>
             <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Battle beenden?</h3>
             <p className="text-gray-500 dark:text-slate-400 text-sm mb-6">
               Möchtest du dieses Battle wirklich löschen oder abbrechen? Das kann nicht rückgängig gemacht werden.
             </p>
             <div className="grid grid-cols-2 gap-3">
               <button onClick={() => setBattleToDelete(null)} className="py-3 rounded-xl font-bold text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition">Abbrechen</button>
               <button onClick={confirmDeleteBattle} className="py-3 rounded-xl font-bold bg-red-500 hover:bg-red-600 text-white transition shadow-lg shadow-red-500/30">Ja, löschen</button>
             </div>
          </div>
        </div>
      )}

      <main className="flex-1 md:ml-72 p-4 md:p-8 pt-24 md:pt-8 max-w-7xl mx-auto w-full">
        {loading && activeTab === 'dashboard' && myStats.length === 0 ? (
          <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-brand-600" size={40} /></div>
        ) : (
          <>
            {activeTab === 'dashboard' && <DashboardView />}
            {activeTab === 'leaderboard' && <LeaderboardView />}
            {activeTab === 'battles' && <BattleView />}
            {activeTab === 'settings' && <SettingsView />}
          </>
        )}
      </main>
    </div>
  );
}

export default App;