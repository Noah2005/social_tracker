import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class BattlesScreen extends StatefulWidget {
  const BattlesScreen({super.key});

  @override
  State<BattlesScreen> createState() => _BattlesScreenState();
}

class _BattlesScreenState extends State<BattlesScreen> {
  final _userId = Supabase.instance.client.auth.currentUser!.id;
  List<Map<String, dynamic>> _battles = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchBattlesAndScores();
  }

  Future<void> _fetchBattlesAndScores() async {
    try {
      final data = await Supabase.instance.client
          .from('battles')
          .select('*, challenger:challenger_id(username, avatar_url), opponent:opponent_id(username, avatar_url)')
          .or('challenger_id.eq.$_userId,opponent_id.eq.$_userId')
          .order('created_at', ascending: false);

      final List<dynamic> battlesRaw = data;
      final today = DateTime.now();

      final enrichedBattles = await Future.wait(battlesRaw.map((battle) async {
        final Map<String, dynamic> b = Map<String, dynamic>.from(battle);
        final endDate = DateTime.parse(b['end_date'] ?? DateTime.now().toIso8601String());
        final startDate = b['start_date'] != null ? DateTime.parse(b['start_date']) : null;
        String status = b['status'];
        String? winnerId = b['winner_id'];

        // 1. AUTO-FINISH
        if (status == 'active' && today.isAfter(endDate) && startDate != null) {
           final stats = await Supabase.instance.client.from('daily_stats').select('user_id, daily_score')
              .gte('date', startDate.toIso8601String()).lte('date', endDate.toIso8601String())
              .inFilter('user_id', [b['challenger_id'], b['opponent_id']]);

           int chScore = 0; int opScore = 0;
           for (var s in stats) {
             if (s['user_id'] == b['challenger_id']) chScore += (s['daily_score'] as int);
             if (s['user_id'] == b['opponent_id']) opScore += (s['daily_score'] as int);
           }
           if (chScore > opScore) winnerId = b['challenger_id'];
           else if (opScore > chScore) winnerId = b['opponent_id'];

           await Supabase.instance.client.from('battles').update({'status': 'finished', 'winner_id': winnerId}).eq('id', b['id']);
           status = 'finished'; b['status'] = 'finished'; b['winner_id'] = winnerId;
        }

        // 2. SCORES
        int chScore = 0; int opScore = 0;
        if ((status == 'active' || status == 'finished') && startDate != null) {
          final fetchEnd = status == 'active' ? today : endDate;
          final stats = await Supabase.instance.client.from('daily_stats').select('user_id, daily_score')
              .gte('date', startDate.toIso8601String()).lte('date', fetchEnd.toIso8601String())
              .inFilter('user_id', [b['challenger_id'], b['opponent_id']]);
           for (var s in stats) {
             if (s['user_id'] == b['challenger_id']) chScore += (s['daily_score'] as int);
             if (s['user_id'] == b['opponent_id']) opScore += (s['daily_score'] as int);
           }
        }
        b['challenger_score'] = chScore; b['opponent_score'] = opScore;
        return b;
      }));

      if (mounted) setState(() { _battles = enrichedBattles; _isLoading = false; });
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _acceptBattle(String battleId, String duration) async {
    final now = DateTime.now();
    DateTime end = (duration == '1_day') ? now.add(const Duration(days: 1)) : (duration == '30_days') ? now.add(const Duration(days: 30)) : now.add(const Duration(days: 7));
    await Supabase.instance.client.from('battles').update({'status': 'active', 'start_date': now.toIso8601String(), 'end_date': end.toIso8601String()}).eq('id', battleId);
    _fetchBattlesAndScores();
  }

  Future<void> _deleteBattle(String battleId) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text("Battle löschen?"),
        content: const Text("Möchtest du dieses Battle wirklich entfernen oder abbrechen?"),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text("Abbrechen")),
          TextButton(onPressed: () => Navigator.pop(ctx, true), style: TextButton.styleFrom(foregroundColor: Colors.red), child: const Text("Löschen")),
        ],
      ),
    );
    if (confirm == true) {
      setState(() => _battles.removeWhere((b) => b['id'] == battleId));
      try { await Supabase.instance.client.from('battles').delete().eq('id', battleId); } 
      catch (e) { _fetchBattlesAndScores(); }
    }
  }

  @override
  Widget build(BuildContext context) {
    // Farben aus dem Theme
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardColor = Theme.of(context).cardColor;
    final textColor = Theme.of(context).textTheme.bodyMedium?.color;

    return Scaffold(
      appBar: AppBar(
        title: Text("Meine Battles ⚔️", style: TextStyle(color: textColor)),
        backgroundColor: Theme.of(context).appBarTheme.backgroundColor,
        actions: [IconButton(icon: const Icon(Icons.refresh, color: Colors.deepPurple), onPressed: () { setState(() => _isLoading = true); _fetchBattlesAndScores(); })],
      ),
      body: _isLoading ? const Center(child: CircularProgressIndicator()) : _battles.isEmpty
          ? Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [Icon(Icons.sports_kabaddi, size: 64, color: Colors.grey.shade300), const SizedBox(height: 16), const Text("Keine aktiven Battles", style: TextStyle(color: Colors.grey))]))
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _battles.length,
              itemBuilder: (context, index) {
                final battle = _battles[index];
                final isChallenger = battle['challenger_id'] == _userId;
                final opponent = isChallenger ? battle['opponent'] : battle['challenger'];
                final opponentName = opponent != null ? opponent['username'] : 'Unbekannt';
                final status = battle['status'];
                final durationLabel = battle['duration'].toString().replaceAll('_', ' ');
                final myScore = isChallenger ? battle['challenger_score'] : battle['opponent_score'];
                final enemyScore = isChallenger ? battle['opponent_score'] : battle['challenger_score'];
                final isFinished = status == 'finished';
                final iWon = battle['winner_id'] == _userId;
                final isDraw = battle['winner_id'] == null && isFinished;

                Color statusColor = Colors.grey;
                Color statusBg = isDark ? Colors.grey.shade800 : Colors.grey.shade100;
                if (status == 'active') { statusColor = Colors.green; statusBg = isDark ? Colors.green.withOpacity(0.2) : Colors.green.shade50; }
                if (status == 'pending') { statusColor = Colors.orange; statusBg = isDark ? Colors.orange.withOpacity(0.2) : Colors.orange.shade50; }
                Color? borderColor;
                if (isFinished && iWon) borderColor = Colors.amber;

                return Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: (isFinished && iWon) ? (isDark ? Colors.amber.withOpacity(0.1) : Colors.amber.shade50) : cardColor,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: borderColor ?? Colors.transparent, width: 2),
                    boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10)],
                  ),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              Row(children: [
                                Text("VS $opponentName", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: textColor)),
                                if (isFinished && iWon) const Padding(padding: EdgeInsets.only(left: 8), child: Icon(Icons.emoji_events, color: Colors.amber, size: 20)),
                              ]),
                              const SizedBox(height: 4),
                              Row(children: [
                                Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2), decoration: BoxDecoration(color: isDark ? Colors.orange.withOpacity(0.2) : Colors.orange.shade50, borderRadius: BorderRadius.circular(6)), child: Text(durationLabel.toUpperCase(), style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.orange.shade800))),
                                const SizedBox(width: 8),
                                Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2), decoration: BoxDecoration(color: statusBg, borderRadius: BorderRadius.circular(6)), child: Text(status.toString().toUpperCase(), style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: statusColor))),
                              ])
                            ]),
                          ),
                          IconButton(icon: const Icon(Icons.delete_outline, color: Colors.red, size: 20), onPressed: () => _deleteBattle(battle['id']))
                        ],
                      ),
                      if (status == 'pending' && !isChallenger) ...[
                        const SizedBox(height: 16),
                        SizedBox(width: double.infinity, child: ElevatedButton(onPressed: () => _acceptBattle(battle['id'], battle['duration']), style: ElevatedButton.styleFrom(backgroundColor: Colors.deepPurple, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))), child: const Text("Herausforderung annehmen!"))),
                      ] else if (status == 'active' || status == 'finished') ...[
                        const SizedBox(height: 16),
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(color: isDark ? Colors.black26 : Colors.white.withOpacity(0.6), borderRadius: BorderRadius.circular(12), border: Border.all(color: isDark ? Colors.white10 : Colors.black12)),
                          child: isFinished 
                            ? Column(children: [Text(iWon ? "GEWONNEN! 🎉" : (isDraw ? "UNENTSCHIEDEN 🤝" : "VERLOREN 😔"), style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: iWon ? Colors.green : textColor)), Text("Du: $myScore  -  Gegner: $enemyScore", style: TextStyle(color: isDark ? Colors.grey.shade400 : Colors.grey))])
                            : Column(children: [_buildScoreBar("Du", myScore, Colors.deepPurple, textColor), const SizedBox(height: 8), _buildScoreBar(opponentName, enemyScore, Colors.orange, textColor)]),
                        ),
                      ]
                    ],
                  ),
                );
              },
            ),
    );
  }

  Widget _buildScoreBar(String label, int score, Color color, Color? textColor) {
    double progress = (score / 500).clamp(0.0, 1.0);
    return Column(
      children: [
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: textColor)), Text("$score Pkt", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: color))]),
        const SizedBox(height: 4),
        ClipRRect(borderRadius: BorderRadius.circular(4), child: LinearProgressIndicator(value: progress == 0 ? 0.02 : progress, backgroundColor: Colors.grey.withOpacity(0.2), color: color, minHeight: 8)),
      ],
    );
  }
}