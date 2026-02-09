import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:social_tracker/screens/login_screen.dart';
import 'package:social_tracker/screens/home_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // 1. .env Datei laden
  await dotenv.load(fileName: ".env");

  // 2. Supabase starten
  await Supabase.initialize(
    url: dotenv.env['SUPABASE_URL'] ?? '',
    anonKey: dotenv.env['SUPABASE_ANON_KEY'] ?? '',
  );

  runApp(const SocialTrackerApp());
}

class SocialTrackerApp extends StatelessWidget {
  const SocialTrackerApp({super.key});

  @override
  Widget build(BuildContext context) {
    // Prüfen, ob wir eingeloggt sind (Session Check)
    final session = Supabase.instance.client.auth.currentSession;
    
    return MaterialApp(
      title: 'Social Tracker',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        // Dein Design-Thema global definiert
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF6C63FF)),
        scaffoldBackgroundColor: const Color(0xFFF5F7FA),
      ),
      // HIER passiert die Magie: Automatische Weiterleitung
      home: session != null ? const HomeScreen() : const LoginScreen(),
    );
  }
}