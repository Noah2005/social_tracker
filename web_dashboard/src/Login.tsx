import { useState } from 'react'
import { supabase } from './supabaseClient'
import { TrendingDown, Lock, Mail, Loader2, User } from 'lucide-react'

export default function Login({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('') 
  const [isSignUp, setIsSignUp] = useState(false) 
  const [msg, setMsg] = useState('')
  
  const checkUsernameTaken = async (usernameToCheck: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', usernameToCheck)
      .maybeSingle(); // 'maybeSingle' gibt null zurück, wenn nicht gefunden (wirft keinen Fehler)
    return !!data; // True wenn gefunden, False wenn nicht
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMsg('')

    try {
      if (isSignUp) {
        // 1. VALIDIERUNG: Ist ein Name eingegeben?
        if (!username.trim()) {
          setMsg('Bitte wähle einen Benutzernamen.')
          setLoading(false)
          return
        }

        // 2. CHECK: Ist der Name schon vergeben?
        const isTaken = await checkUsernameTaken(username.trim());
        if (isTaken) {
          setMsg('Dieser Benutzername ist bereits vergeben! 😕')
          setLoading(false)
          return;
        }

        // 3. REGISTRIERUNG: Wenn alles okay ist
        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: {
              username: username.trim(), // WICHTIG: Name wird hier gespeichert
              avatar_url: '' 
            }
          }
        })
        if (error) throw error
        setMsg('Account erstellt! Bitte checke deine E-Mails (oder logge dich ein, falls Auto-Confirm aktiv ist).')
      
      } else {
        // LOGIN
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
      
      // Wenn kein Fehler flog -> Erfolg melden
      onLoginSuccess() 

    } catch (error: any) {
      // Falls doch noch ein Datenbank-Fehler durchrutscht (z.B. Race Condition)
      if (error.code === '23505') {
        setMsg('Dieser Name ist leider schon vergeben.')
      } else {
        setMsg(error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 w-full max-w-md animate-fade-in">
        <div className="flex justify-center mb-6">
          <div className="bg-brand-600 p-3 rounded-xl shadow-lg shadow-brand-500/30">
            <TrendingDown size={32} className="text-white" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
          {isSignUp ? 'Account erstellen' : 'Willkommen zurück'}
        </h2>
        
        {/* Hier eine kleine dynamische Unterzeile */}
        <p className="text-center text-gray-500 mb-8">
          {isSignUp ? 'Starte heute dein Detox.' : 'Schön, dass du wieder da bist.'}
        </p>

        <form onSubmit={handleAuth} className="space-y-4">
          
          {/* USERNAME FELD (Nur bei Registrierung sichtbar) */}
          {isSignUp && (
            <div className="animate-fade-in">
              <label className="block text-sm font-medium text-gray-700 mb-1">Benutzername</label>
              <div className="relative">
                <User className="absolute left-3 top-3 text-gray-400" size={20} />
                <input 
                  type="text" 
                  required={isSignUp}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition"
                  placeholder="Wie sollen wir dich nennen?"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-gray-400" size={20} />
              <input 
                type="email" 
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition"
                placeholder="deine@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Passwort</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-gray-400" size={20} />
              <input 
                type="password" 
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {msg && (
            <div className={`text-sm text-center font-medium p-3 rounded-lg ${msg.includes('erstellt') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
              {msg}
            </div>
          )}

          <button 
            disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-brand-500/20 flex justify-center items-center gap-2 disabled:opacity-70"
          >
            {loading && <Loader2 className="animate-spin" size={20} />}
            {isSignUp ? 'Registrieren' : 'Anmelden'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => { setIsSignUp(!isSignUp); setMsg(''); }}
            className="text-sm text-gray-500 hover:text-brand-600 font-medium transition"
          >
            {isSignUp ? 'Schon einen Account? Anmelden' : 'Noch keinen Account? Registrieren'}
          </button>
        </div>
      </div>
    </div>
  )
}