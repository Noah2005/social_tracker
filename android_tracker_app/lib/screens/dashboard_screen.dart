import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:social_tracker/services/usage_stats_service.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final UsageStatsService _usageService = UsageStatsService();
  Map<String, int> _usageData = {};
  bool _isLoading = false;
  String _username = "User";

  @override
  void initState() {
    super.initState();
    _loadProfile();
    // Automatischer Sync beim Start der App
    _loadAndSyncData();
  }

  Future<void> _loadProfile() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;

    final data = await Supabase.instance.client
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();
        
    if (mounted && data['username'] != null) {
      setState(() {
        _username = data['username'];
      });
    }
  }

  // --- HIER PASSIERT DIE MAGIE ---
  Future<void> _loadAndSyncData() async {
    setState(() => _isLoading = true);

    // 1. Lokale Daten vom Handy holen
    final data = await _usageService.getDailyUsageBreakdown();

    if (data != null) {
      setState(() => _usageData = data);
      
      // 2. Direkt danach an die Datenbank senden!
      await _uploadStatsToSupabase(data);
    }

    if (mounted) setState(() => _isLoading = false);
  }

  Future<void> _uploadStatsToSupabase(Map<String, int> stats) async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;

    final today = DateTime.now().toIso8601String().split('T')[0];
    
    // Gesamtminuten berechnen
    int totalMin = stats.values.fold(0, (sum, val) => sum + val);
    
    // Score berechnen (Beispiel: 100 Punkte minus halbe Minutenanzahl)
    int dailyScore = (100 - (totalMin / 2)).round().clamp(0, 100);

    try {
      // Senden an Supabase
      await Supabase.instance.client.from('daily_stats').upsert(
        {
          'user_id': user.id,
          'date': today,
          'instagram_min': stats['Instagram'] ?? 0,
          'tiktok_min': stats['TikTok'] ?? 0,
          'youtube_min': stats['YouTube'] ?? 0,
          'snapchat_min': stats['Snapchat'] ?? 0,
          'daily_score': dailyScore,
        },
        // WICHTIG: Das hier hat gefehlt!
        // Wir sagen Supabase: "Wenn 'user_id' und 'date' schon existieren, dann UPDATE statt INSERT"
        onConflict: 'user_id, date',
      );

      // Feedback an dich: Es hat geklappt!
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text("Daten erfolgreich synchronisiert! ☁️"),
            backgroundColor: Colors.green,
            duration: Duration(seconds: 1),
          ),
        );
      }
    } catch (e) {
      debugPrint("Fehler beim Upload: $e");
    }
  }
  // ------------------------------

  @override
  Widget build(BuildContext context) {
    int totalMinutes = _usageData.values.fold(0, (sum, item) => sum + item);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text("Dashboard", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 20)),
            Text("Hey $_username", style: const TextStyle(fontSize: 14, color: Colors.grey)),
          ],
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        actions: [
          // DER BUTTON: Hier wird _loadAndSyncData aufgerufen
          IconButton(
            icon: const Icon(Icons.refresh), 
            onPressed: _loadAndSyncData, // <--- Das löst den Upload aus
            color: Colors.deepPurple,
            tooltip: "Synchronisieren",
          )
        ],
      ),
      body: _isLoading 
        ? const Center(child: CircularProgressIndicator())
        : Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              children: [
                // Header Card
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10)],
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text("Heute gesamt", style: TextStyle(color: Colors.grey, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 5),
                          Text("$totalMinutes min", style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.deepPurple)),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(color: Colors.deepPurple.shade50, borderRadius: BorderRadius.circular(15)),
                        child: const Icon(Icons.smartphone, color: Colors.deepPurple, size: 30),
                      )
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                
                // App Liste
                Expanded(
                  child: ListView.separated(
                    itemCount: _usageData.length,
                    separatorBuilder: (c, i) => const SizedBox(height: 12),
                    itemBuilder: (context, index) {
                      String key = _usageData.keys.elementAt(index);
                      int val = _usageData.values.elementAt(index);
                      return Container(
                        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(15)),
                        child: ListTile(
                          leading: _getAppIcon(key),
                          title: Text(key, style: const TextStyle(fontWeight: FontWeight.bold)),
                          trailing: Text("$val min", style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
    );
  }

  Widget _getAppIcon(String appName) {
    Color color = Colors.grey;
    if (appName == 'Instagram') color = Colors.pink;
    if (appName == 'TikTok') color = Colors.black;
    if (appName == 'YouTube') color = Colors.red;
    if (appName == 'Snapchat') color = Colors.amber;

    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
      child: Icon(Icons.apps, color: color),
    );
  }
}