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
      final today = DateTime.now().toIso8601String().split('T')[0];

      // Wir holen Stats UND die verknüpften Profile (Join)
      final data = await Supabase.instance.client
          .from('daily_stats')
          .select('daily_score, user_id, profiles(username, avatar_url)')
          .eq('date', today)
          .order('daily_score', ascending: false); // Beste zuerst (höchster Score)

      if (mounted) {
        setState(() {
          _leaderboardData = List<Map<String, dynamic>>.from(data);
          _isLoading = false;
        });
      }
    } catch (e) {
      debugPrint('Fehler beim Laden des Leaderboards: $e');
      if (mounted) setState(() => _isLoading = false);
    }
  }

  // Hilfsfunktion: Wandelt den Tailwind-String (z.B. "bg-red-100") in eine Flutter Farbe um
  Color _getColorFromTailwind(String? tailwindClass) {
    if (tailwindClass == null) return Colors.deepPurple.shade100;
    if (tailwindClass.contains('blue')) return Colors.blue.shade100;
    if (tailwindClass.contains('emerald')) return Colors.green.shade100;
    if (tailwindClass.contains('orange')) return Colors.orange.shade100;
    if (tailwindClass.contains('red')) return Colors.red.shade100;
    if (tailwindClass.contains('pink')) return Colors.pink.shade100;
    return Colors.deepPurple.shade100; // Standard
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text("Bestenliste (Heute)"),
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
              ? const Center(child: Text("Noch keine Teilnehmer heute."))
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

                    return Card(
                      elevation: isMe ? 4 : 1, // Eigenes Profil hervorheben
                      shadowColor: isMe ? Colors.deepPurple.withOpacity(0.3) : null,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(15),
                        side: isMe 
                          ? const BorderSide(color: Colors.deepPurple, width: 2) 
                          : BorderSide.none,
                      ),
                      margin: const EdgeInsets.only(bottom: 12),
                      color: Colors.white,
                      child: ListTile(
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        // RANG
                        leading: Container(
                          width: 40,
                          alignment: Alignment.center,
                          child: Text(
                            "#${index + 1}",
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: index == 0 ? Colors.amber : Colors.grey,
                            ),
                          ),
                        ),
                        // AVATAR & NAME
                        title: Row(
                          children: [
                            CircleAvatar(
                              backgroundColor: _getColorFromTailwind(avatarClass),
                              child: Text(
                                username.isNotEmpty ? username[0].toUpperCase() : "?",
                                style: const TextStyle(
                                  color: Colors.black87, 
                                  fontWeight: FontWeight.bold
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Text(
                              isMe ? "$username (Du)" : username,
                              style: TextStyle(
                                fontWeight: isMe ? FontWeight.bold : FontWeight.normal,
                              ),
                            ),
                          ],
                        ),
                        // SCORE
                        trailing: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: score > 90 
                                ? Colors.green.withOpacity(0.1) 
                                : (score > 50 ? Colors.orange.withOpacity(0.1) : Colors.red.withOpacity(0.1)),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            "$score",
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              color: score > 90 ? Colors.green : (score > 50 ? Colors.orange : Colors.red),
                            ),
                          ),
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}