import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:social_tracker/screens/home_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _usernameController = TextEditingController(); 
  
  bool _isLoading = false;
  bool _isSignUp = false; 

  Future<bool> _checkUsernameTaken(String username) async {
    try {
      final data = await Supabase.instance.client
          .from('profiles')
          .select('username')
          .eq('username', username)
          .maybeSingle(); 
      return data != null; 
    } catch (e) {
      debugPrint("Fehler beim Namens-Check: $e");
      return false; 
    }
  }

  Future<void> _handleAuth() async {
    setState(() => _isLoading = true);
    FocusManager.instance.primaryFocus?.unfocus();

    try {
      final email = _emailController.text.trim();
      final password = _passwordController.text.trim();
      final username = _usernameController.text.trim();

      if (_isSignUp) {
        if (username.isEmpty) throw const AuthException('Bitte wähle einen Benutzernamen.');
        final isTaken = await _checkUsernameTaken(username);
        if (isTaken) throw const AuthException('Dieser Name ist leider schon vergeben! 😕');

        await Supabase.instance.client.auth.signUp(
          email: email,
          password: password,
          data: {'username': username},
        );

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Account erstellt! Du wirst eingeloggt...'), backgroundColor: Colors.green),
          );
        }
      } else {
        await Supabase.instance.client.auth.signInWithPassword(email: email, password: password);
      }

      if (mounted) {
        Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const HomeScreen()));
      }
    } on AuthException catch (error) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.message), backgroundColor: Colors.red));
    } catch (error) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Ein unerwarteter Fehler ist aufgetreten.'), backgroundColor: Colors.red));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    // Farbe für Texteingaben (Schwarz auf Hell, Weiß auf Dunkel)
    final inputTextColor = Theme.of(context).textTheme.bodyMedium?.color;
    final cardColor = Theme.of(context).cardColor;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.deepPurple,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [BoxShadow(color: Colors.deepPurple.withOpacity(0.3), blurRadius: 20, offset: const Offset(0, 10))]
                ),
                child: const Icon(Icons.trending_down, size: 48, color: Colors.white),
              ),
              const SizedBox(height: 24),
              Text(
                _isSignUp ? 'Konto erstellen' : 'Willkommen zurück',
                style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: inputTextColor),
              ),
              const SizedBox(height: 8),
              Text(
                _isSignUp ? 'Starte dein Social Detox heute.' : 'Logge dich ein um fortzufahren.',
                style: const TextStyle(color: Colors.grey),
              ),
              const SizedBox(height: 32),

              if (_isSignUp) ...[
                TextField(
                  controller: _usernameController,
                  style: TextStyle(color: inputTextColor), // WICHTIG: Textfarbe
                  decoration: InputDecoration(
                    labelText: 'Benutzername',
                    hintText: 'Wie sollen wir dich nennen?',
                    filled: true,
                    fillColor: cardColor,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                    prefixIcon: const Icon(Icons.person, color: Colors.deepPurple),
                  ),
                ),
                const SizedBox(height: 16),
              ],

              TextField(
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,
                style: TextStyle(color: inputTextColor), // WICHTIG
                decoration: InputDecoration(
                  labelText: 'E-Mail',
                  filled: true,
                  fillColor: cardColor,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                  prefixIcon: const Icon(Icons.email, color: Colors.deepPurple),
                ),
              ),
              const SizedBox(height: 16),

              TextField(
                controller: _passwordController,
                obscureText: true,
                style: TextStyle(color: inputTextColor), // WICHTIG
                decoration: InputDecoration(
                  labelText: 'Passwort',
                  filled: true,
                  fillColor: cardColor,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                  prefixIcon: const Icon(Icons.lock, color: Colors.deepPurple),
                ),
              ),
              const SizedBox(height: 32),

              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _handleAuth,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.deepPurple,
                    foregroundColor: Colors.white,
                    elevation: 2,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: _isLoading
                      ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : Text(
                          _isSignUp ? 'Registrieren' : 'Anmelden',
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                ),
              ),
              
              const SizedBox(height: 24),

              TextButton(
                onPressed: () {
                   setState(() {
                     _isSignUp = !_isSignUp;
                   });
                },
                child: RichText(
                  text: TextSpan(
                    style: const TextStyle(color: Colors.grey, fontSize: 14),
                    children: [
                      TextSpan(text: _isSignUp ? 'Schon ein Konto? ' : 'Noch kein Konto? '),
                      TextSpan(
                        text: _isSignUp ? 'Anmelden' : 'Registrieren',
                        style: const TextStyle(color: Colors.deepPurple, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}