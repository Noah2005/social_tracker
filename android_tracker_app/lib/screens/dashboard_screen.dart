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
  
  bool _isLoading = false;
  String _username = "User";
  String _selectedView = 'Tag'; // 'Tag', 'Woche', 'Monat'
  
  int _displayedMinutes = 0;
  int _displayedScore = 100;
  Map<String, int> _todayAppUsage = {}; 
  List<Map<String, dynamic>> _chartData = [];

  @override
  void initState() {
    super.initState();
    _loadProfile();
    // Startet direkt mit Laden
    _loadDataForView('Tag');
  }

  Future<void> _loadProfile() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;
    final data = await Supabase.instance.client.from('profiles').select('username').eq('id', user.id).single();
    if (mounted && data['username'] != null) setState(() => _username = data['username']);
  }

  Future<void> _loadDataForView(String view) async {
    setState(() {
      _isLoading = true;
      _selectedView = view;
    });

    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;

    if (view == 'Tag') {
      await _syncAndLoadToday();
    } else {
      await _loadHistoryFromDB(view);
    }

    if (mounted) setState(() => _isLoading = false);
  }

  Future<void> _syncAndLoadToday() async {
    final stats = await _usageService.getDailyUsageBreakdown();
    if (stats != null) {
      // Sortieren: Meistgenutzte App nach oben
      final sortedStats = Map.fromEntries(
        stats.entries.toList()..sort((e1, e2) => e2.value.compareTo(e1.value))
      );

      await _uploadStatsToSupabase(stats);
      
      int total = stats.values.fold(0, (sum, val) => sum + val);
      // Score-Berechnung: 100 - (Minuten / 2)
      int score = (100 - (total / 2)).round().clamp(0, 100);
      
      if (mounted) {
        setState(() {
          _todayAppUsage = sortedStats;
          _displayedMinutes = total;
          _displayedScore = score;
          _chartData = [];
        });
      }
    }
  }

  Future<void> _loadHistoryFromDB(String view) async {
    final user = Supabase.instance.client.auth.currentUser!;
    final now = DateTime.now();
    
    DateTime startDate;
    if (view == 'Woche') {
      startDate = now.subtract(const Duration(days: 7));
    } else { 
      startDate = DateTime(now.year, now.month, 1);
    }

    final data = await Supabase.instance.client
        .from('daily_stats')
        .select('date, daily_score, instagram_min, tiktok_min, youtube_min, snapchat_min')
        .eq('user_id', user.id)
        .gte('date', startDate.toIso8601String())
        .order('date', ascending: true);

    final List<dynamic> rows = data as List<dynamic>;

    if (rows.isEmpty) {
      setState(() {
        _displayedMinutes = 0;
        _displayedScore = 0;
        _todayAppUsage = {};
        _chartData = [];
      });
      return;
    }

    int sumMinutes = 0;
    int sumScore = 0;

    for (var row in rows) {
      sumMinutes += ((row['instagram_min'] ?? 0) + (row['tiktok_min'] ?? 0) + (row['youtube_min'] ?? 0) + (row['snapchat_min'] ?? 0)) as int;
      sumScore += (row['daily_score'] ?? 0) as int;
    }

    setState(() {
      _displayedMinutes = sumMinutes;
      _displayedScore = (sumScore / rows.length).round();
      _todayAppUsage = {};
      
      _chartData = rows.map((e) => {
        'day': DateTime.parse(e['date']).day.toString(),
        'score': e['daily_score']
      }).toList();
    });
  }

  Future<void> _uploadStatsToSupabase(Map<String, int> stats) async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;
    final today = DateTime.now().toIso8601String().split('T')[0];
    int totalMin = stats.values.fold(0, (sum, val) => sum + val);
    int dailyScore = (100 - (totalMin / 2)).round().clamp(0, 100);

    await Supabase.instance.client.from('daily_stats').upsert({
        'user_id': user.id,
        'date': today,
        'instagram_min': stats['Instagram'] ?? 0,
        'tiktok_min': stats['TikTok'] ?? 0,
        'youtube_min': stats['YouTube'] ?? 0,
        'snapchat_min': stats['Snapchat'] ?? 0,
        'daily_score': dailyScore,
      }, onConflict: 'user_id, date');
      
      if (mounted) {
         ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Daten synchronisiert ☁️"), backgroundColor: Colors.green, duration: Duration(seconds: 1)),
        );
      }
  }

  // Helper für App-Farben (wie im Web)
  Map<String, dynamic> _getAppStyle(String appName) {
    switch (appName) {
      case 'Instagram':
        return {'icon': Icons.camera_alt, 'color': Colors.pink, 'bg': Colors.pink.shade50};
      case 'TikTok':
        return {'icon': Icons.music_note, 'color': Colors.black87, 'bg': Colors.grey.shade200};
      case 'YouTube':
        return {'icon': Icons.play_arrow, 'color': Colors.red, 'bg': Colors.red.shade50};
      case 'Snapchat':
        return {'icon': Icons.chat_bubble, 'color': Colors.orange, 'bg': Colors.orange.shade50};
      default:
        return {'icon': Icons.apps, 'color': Colors.deepPurple, 'bg': Colors.deepPurple.shade50};
    }
  }

  @override
  Widget build(BuildContext context) {
    // Farbe je nach Score (Grün = Gut, Rot = Schlecht)
    final scoreColor = _displayedScore > 50 ? const Color(0xFF10B981) : const Color(0xFFEF4444);
    final scoreBgColor = _displayedScore > 50 ? const Color(0xFFDCFCE7) : const Color(0xFFFEE2E2);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC), 
      appBar: AppBar(
        backgroundColor: const Color(0xFFF8FAFC),
        elevation: 0,
        toolbarHeight: 80,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text("Dashboard", style: TextStyle(color: Colors.black, fontSize: 28, fontWeight: FontWeight.bold)),
            Text("Hey $_username", style: const TextStyle(color: Colors.grey, fontSize: 16)),
          ],
        ),
        actions: [
          Container(
             margin: const EdgeInsets.only(right: 16),
             decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12)),
             child: IconButton(
               icon: const Icon(Icons.refresh, color: Colors.deepPurple),
               onPressed: () => _loadDataForView(_selectedView),
             ),
          )
        ],
      ),
      body: _isLoading 
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
              child: Column(
                children: [
                  // 1. TOGGLE SWITCH
                  Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 10)],
                    ),
                    child: Row(
                      children: ['Tag', 'Woche', 'Monat'].map((view) {
                        final isSelected = _selectedView == view;
                        return Expanded(
                          child: GestureDetector(
                            onTap: () => _loadDataForView(view),
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 200),
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              decoration: BoxDecoration(
                                color: isSelected ? const Color(0xFF6D28D9) : Colors.transparent, 
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                view,
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: isSelected ? Colors.white : Colors.grey,
                                  fontSize: 14,
                                ),
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // 2. MAIN STAT CARD (Jetzt mit Score-Badge!)
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(24),
                      boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 15, offset: const Offset(0, 5))],
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(_selectedView == 'Tag' ? "Heute gesamt" : "Ø Score", 
                                 style: const TextStyle(color: Colors.grey, fontSize: 14, fontWeight: FontWeight.w600)),
                            const SizedBox(height: 8),
                            // Haupt-Zahl (Minuten oder Score)
                            RichText(
                              text: TextSpan(
                                children: [
                                  TextSpan(
                                    text: _selectedView == 'Tag' ? "$_displayedMinutes" : "$_displayedScore", 
                                    style: const TextStyle(fontSize: 42, fontWeight: FontWeight.w800, color: Color(0xFF1E293B))
                                  ),
                                  TextSpan(
                                    text: _selectedView == 'Tag' ? " min" : " Pkt", 
                                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w600, color: Color(0xFF64748B))
                                  ),
                                ],
                              ),
                            ),
                            
                            // HIER IST DAS NEUE UPDATE: Score-Badge anzeigen
                            if (_selectedView == 'Tag') ...[
                              const SizedBox(height: 12),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                decoration: BoxDecoration(
                                  color: scoreBgColor,
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(Icons.bolt, size: 16, color: scoreColor),
                                    const SizedBox(width: 4),
                                    Text(
                                      "Score: $_displayedScore",
                                      style: TextStyle(
                                        color: scoreColor,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 14,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ]
                          ],
                        ),
                        // Circular Indicator
                        Stack(
                          alignment: Alignment.center,
                          children: [
                            SizedBox(
                              width: 70, height: 70,
                              child: CircularProgressIndicator(
                                value: _displayedScore / 100,
                                backgroundColor: Colors.grey.shade100,
                                color: scoreColor,
                                strokeWidth: 8,
                                strokeCap: StrokeCap.round,
                              ),
                            ),
                            Icon(
                              _selectedView == 'Tag' ? Icons.smartphone : Icons.emoji_events, 
                              color: scoreColor,
                              size: 30,
                            )
                          ],
                        )
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),

                  // 3. APP LISTE / CHART
                  if (_selectedView == 'Tag') ...[
                    const Align(
                      alignment: Alignment.centerLeft,
                      child: Text("App-Nutzung (Heute)", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
                    ),
                    const SizedBox(height: 16),
                    
                    if (_todayAppUsage.isEmpty) 
                      const Center(child: Padding(padding: EdgeInsets.all(20), child: Text("Alles ruhig heute...", style: TextStyle(color: Colors.grey))))
                    else
                      ..._todayAppUsage.entries.map((e) {
                        final style = _getAppStyle(e.key);
                        double percent = _displayedMinutes > 0 ? (e.value / _displayedMinutes) : 0;
                        
                        return Container(
                          margin: const EdgeInsets.only(bottom: 12),
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: Colors.grey.shade100),
                          ),
                          child: Column(
                            children: [
                              Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(10),
                                    decoration: BoxDecoration(
                                      color: style['bg'],
                                      borderRadius: BorderRadius.circular(14),
                                    ),
                                    child: Icon(style['icon'], color: style['color'], size: 24),
                                  ),
                                  const SizedBox(width: 16),
                                  
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(e.key, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                                        const SizedBox(height: 4),
                                        ClipRRect(
                                          borderRadius: BorderRadius.circular(4),
                                          child: LinearProgressIndicator(
                                            value: percent,
                                            backgroundColor: Colors.grey.shade100,
                                            color: style['color'].withOpacity(0.6),
                                            minHeight: 6,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Text("${e.value} min", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF1E293B))),
                                ],
                              ),
                            ],
                          ),
                        );
                      }).toList()
                  ] else ...[
                    // VERLAUF CHART
                    const Align(
                      alignment: Alignment.centerLeft,
                      child: Text("Verlauf", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
                    ),
                    const SizedBox(height: 16),
                    Container(
                      height: 250,
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(24)),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: _chartData.isEmpty 
                        ? [const Center(child: Text("Keine Daten"))]
                        : _chartData.map((data) {
                          int score = data['score'];
                          return Column(
                            mainAxisAlignment: MainAxisAlignment.end,
                            children: [
                              Container(
                                width: 16, 
                                height: (score * 1.5).toDouble(), 
                                decoration: BoxDecoration(
                                  color: score > 80 ? const Color(0xFF10B981) : (score > 50 ? Colors.orange : const Color(0xFFEF4444)),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(data['day'].toString(), style: const TextStyle(fontSize: 12, color: Colors.grey, fontWeight: FontWeight.bold)),
                            ],
                          );
                        }).toList(),
                      ),
                    )
                  ]
                ],
              ),
            ),
    );
  }
}