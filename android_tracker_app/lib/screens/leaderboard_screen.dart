import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class LeaderboardScreen extends StatefulWidget {
  const LeaderboardScreen({super.key});

  @override
  State<LeaderboardScreen> createState() => _LeaderboardScreenState();
}

class _LeaderboardScreenState extends State<LeaderboardScreen> {
  List<Map<String, dynamic>> _leaderboardData = [];
  bool _isLoading = true;
  String _myUserId = '';

  @override
  void initState() {
    super.initState();
    _myUserId = Supabase.instance.client.auth.currentUser?.id ?? '';
    _fetchLeaderboard();
  }

  Future<void> _fetchLeaderboard() async {
    try {
      final data = await Supabase.instance.client
          .from('monthly_leaderboard')
          .select('monthly_score, user_id, username, avatar_url')
          .order('monthly_score', ascending: false);

      if (mounted) {
        setState(() {
          _leaderboardData = List<Map<String, dynamic>>.from(data.map((item) {
            return {
              'daily_score': item['monthly_score'],
              'user_id': item['user_id'],
              'profiles': {
                'username': item['username'],
                'avatar_url': item['avatar_url']
              }
            };
          }));
          _isLoading = false;
        });
      }
    } catch (e) {
      debugPrint('Fehler: $e');
      if (mounted) setState(() => _isLoading = false);
    }
  }

  // --- NEU: Logik für Ränge und Farben ---
  Map<String, dynamic> _getRankInfo(int score) {
    if (score > 2500) return {'name': 'Master', 'color': Colors.deepPurple, 'bg': Colors.deepPurple.shade50};
    if (score > 2000) return {'name': 'Diamond', 'color': Colors.cyan, 'bg': Colors.cyan.shade50};
    if (score > 1500) return {'name': 'Platin', 'color': Colors.blueGrey, 'bg': Colors.blueGrey.shade50};
    if (score > 1000) return {'name': 'Gold', 'color': Colors.amber.shade800, 'bg': Colors.amber.shade50};
    if (score > 500) return {'name': 'Silber', 'color': Colors.grey.shade700, 'bg': Colors.grey.shade100};
    return {'name': 'Bronze', 'color': Colors.brown, 'bg': Colors.orange.shade50};
  }

  // Helper für Avatar Farbe aus Tailwind String
  Color _getColorFromTailwind(String? tailwindClass) {
    if (tailwindClass == null) return Colors.deepPurple.shade100;
    if (tailwindClass.contains('blue')) return Colors.blue.shade100;
    if (tailwindClass.contains('emerald')) return Colors.green.shade100;
    if (tailwindClass.contains('orange')) return Colors.orange.shade100;
    if (tailwindClass.contains('red')) return Colors.red.shade100;
    if (tailwindClass.contains('pink')) return Colors.pink.shade100;
    return Colors.deepPurple.shade100;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text("Bestenliste (Monat)"),
        backgroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.deepPurple),
            onPressed: () {
              setState(() => _isLoading = true);
              _fetchLeaderboard();
            },
          )
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _leaderboardData.isEmpty
              ? const Center(child: Text("Noch keine Teilnehmer diesen Monat."))
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _leaderboardData.length,
                  itemBuilder: (context, index) {
                    final item = _leaderboardData[index];
                    final profile = item['profiles'] as Map<String, dynamic>?;
                    final username = profile?['username'] ?? 'Unbekannt';
                    final avatarClass = profile?['avatar_url'] as String?;
                    final score = item['daily_score'] ?? 0;
                    final userId = item['user_id'];
                    final isMe = userId == _myUserId;

                    // Rank Info holen
                    final rankInfo = _getRankInfo(score);

                    return Card(
                      elevation: isMe ? 4 : 0,
                      shadowColor: isMe ? Colors.deepPurple.withOpacity(0.2) : null,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                        side: isMe 
                          ? const BorderSide(color: Colors.deepPurple, width: 1.5) 
                          : BorderSide(color: Colors.grey.shade100),
                      ),
                      margin: const EdgeInsets.only(bottom: 12),
                      color: Colors.white,
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        child: Row(
                          children: [
                            // 1. RANG NUMMER
                            SizedBox(
                              width: 30,
                              child: Text(
                                "#${index + 1}",
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: index == 0 ? Colors.amber : Colors.grey.shade400,
                                ),
                              ),
                            ),
                            
                            // 2. AVATAR
                            CircleAvatar(
                              backgroundColor: _getColorFromTailwind(avatarClass),
                              radius: 20,
                              child: Text(
                                username.isNotEmpty ? username[0].toUpperCase() : "?",
                                style: const TextStyle(
                                  color: Colors.black87, 
                                  fontWeight: FontWeight.bold
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            
                            // 3. NAME & SCORE
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    isMe ? "$username (Du)" : username,
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 16,
                                      color: isMe ? Colors.black : Colors.black87,
                                    ),
                                  ),
                                  Text(
                                    "$score Pkt",
                                    style: const TextStyle(
                                      color: Colors.grey,
                                      fontSize: 13,
                                      fontWeight: FontWeight.w500
                                    ),
                                  ),
                                ],
                              ),
                            ),

                            // 4. RANG BADGE (Bronze, Silber, etc.)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                              decoration: BoxDecoration(
                                color: rankInfo['bg'],
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: rankInfo['color'].withOpacity(0.2)),
                              ),
                              child: Text(
                                rankInfo['name'],
                                style: TextStyle(
                                  color: rankInfo['color'],
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}