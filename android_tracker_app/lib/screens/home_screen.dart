import 'package:flutter/material.dart';
import 'package:social_tracker/screens/dashboard_screen.dart';
import 'package:social_tracker/screens/leaderboard_screen.dart';
import 'package:social_tracker/screens/settings_screen.dart';
// NEU: Import Battles
import 'package:social_tracker/screens/battles_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;

  // Liste der Screens erweitern
  final List<Widget> _screens = [
    const DashboardScreen(),
    const LeaderboardScreen(),
    const BattlesScreen(), // Index 2
    const SettingsScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _screens[_currentIndex],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (index) => setState(() => _currentIndex = index),
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
          // NEUER TAB
          NavigationDestination(
            icon: Icon(Icons.sports_kabaddi_outlined), // oder flash_on, swords gibt es nicht direkt
            selectedIcon: Icon(Icons.sports_kabaddi),
            label: 'Battles',
          ),
          NavigationDestination(
            icon: Icon(Icons.settings_outlined),
            selectedIcon: Icon(Icons.settings),
            label: 'Settings',
          ),
        ],
      ),
    );
  }
}