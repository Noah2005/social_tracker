import 'package:flutter/material.dart';
import 'package:social_tracker/screens/dashboard_screen.dart';
import 'package:social_tracker/screens/settings_screen.dart';
import 'package:social_tracker/screens/leaderboard_screen.dart';


class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _selectedIndex = 0;

  // Die verschiedenen Seiten
  final List<Widget> _pages = [
    const DashboardScreen(),
    const LeaderboardScreen(),
    const SettingsScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      // Zeigt die ausgewählte Seite an
      body: _pages[_selectedIndex],
      
      // Die untere Navigationsleiste (wie das Menü im Web)
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (index) => setState(() => _selectedIndex = index),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard),
            label: 'Dashboard',
          ),
          NavigationDestination(
            icon: Icon(Icons.emoji_events_outlined),
            selectedIcon: Icon(Icons.emoji_events),
            label: 'Ranking',
          ),
          NavigationDestination(
            icon: Icon(Icons.settings_outlined),
            selectedIcon: Icon(Icons.settings),
            label: 'Profil',
          ),
        ],
      ),
    );
  }
}