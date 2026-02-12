import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart'; // NEU
import 'package:social_tracker/screens/login_screen.dart';
import 'package:social_tracker/main.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _nameController = TextEditingController();
  bool _saving = false;
  String _selectedColorClass = "bg-brand-100 text-brand-700"; 
  
  // NEU: Variablen für die Sperre
  String? _lastUsernameChange;
  int _daysUntilChange = 0;
  String _currentUsername = '';

  final Map<String, Color> _colorMap = {
    'bg-brand-100 text-brand-700': Colors.deepPurple.shade100,
    'bg-blue-100 text-blue-700': Colors.blue.shade100,
    'bg-emerald-100 text-emerald-700': Colors.green.shade100,
    'bg-orange-100 text-orange-700': Colors.orange.shade100,
    'bg-red-100 text-red-700': Colors.red.shade100,
    'bg-pink-100 text-pink-700': Colors.pink.shade100,
  };

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    final userId = Supabase.instance.client.auth.currentUser!.id;
    // Wir laden jetzt auch 'last_username_change'
    final data = await Supabase.instance.client
        .from('profiles')
        .select('username, avatar_url, last_username_change')
        .eq('id', userId)
        .single();
    
    if (mounted) {
      setState(() {
        _nameController.text = data['username'] ?? '';
        _currentUsername = data['username'] ?? '';
        _selectedColorClass = data['avatar_url'] ?? _selectedColorClass;
        _lastUsernameChange = data['last_username_change'];
        _calculateDaysLeft();
      });
    }
  }

  void _calculateDaysLeft() {
    if (_lastUsernameChange == null) {
      _daysUntilChange = 0;
      return;
    }
    final lastDate = DateTime.parse(_lastUsernameChange!);
    final diff = DateTime.now().difference(lastDate).inDays;
    setState(() {
      _daysUntilChange = diff < 30 ? 30 - diff : 0;
    });
  }

  Future<void> _saveProfile() async {
    // Check: Darf der Name geändert werden?
    final nameChanged = _nameController.text.trim() != _currentUsername;
    
    if (nameChanged && _daysUntilChange > 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Namensänderung erst in $_daysUntilChange Tagen möglich!"), backgroundColor: Colors.orange),
      );
      return;
    }

    setState(() => _saving = true);
    final userId = Supabase.instance.client.auth.currentUser!.id;
    
    final updates = {
      'avatar_url': _selectedColorClass,
    };

    // Nur wenn Name geändert wurde, Zeitstempel setzen
    if (nameChanged) {
      updates['username'] = _nameController.text.trim();
      updates['last_username_change'] = DateTime.now().toIso8601String();
    }

    try {
      await Supabase.instance.client.from('profiles').update(updates).eq('id', userId);

      if (mounted) {
        setState(() => _saving = false);
        // Profil neu laden um Sperre zu aktivieren
        await _loadProfile();
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Gespeichert!"), backgroundColor: Colors.green));
      }
    } on PostgrestException catch (error) {
      setState(() => _saving = false);
      if (error.code == '23505') {
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Name schon vergeben! 😕"), backgroundColor: Colors.red));
      }
    } catch (e) {
      setState(() => _saving = false);
    }
  }

  // THEME SWITCHER LOGIC
  Future<void> _toggleTheme(bool isDark) async {
    themeNotifier.value = isDark ? ThemeMode.dark : ThemeMode.light;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('isDarkMode', isDark);
  }

  Future<void> _logout() async {
    await Supabase.instance.client.auth.signOut();
    if (mounted) Navigator.of(context).pushAndRemoveUntil(MaterialPageRoute(builder: (_) => const LoginScreen()), (route) => false);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = themeNotifier.value == ThemeMode.dark;
    final isNameLocked = _daysUntilChange > 0;

    return Scaffold(
      appBar: AppBar(title: const Text("Einstellungen")),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // DARK MODE SWITCH
            Container(
              decoration: BoxDecoration(
                color: Theme.of(context).cardColor,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.grey.withOpacity(0.1)),
              ),
              child: SwitchListTile(
                title: const Text("Dunkler Modus", style: TextStyle(fontWeight: FontWeight.bold)),
                secondary: Icon(isDark ? Icons.dark_mode : Icons.light_mode, color: isDark ? Colors.indigo.shade200 : Colors.amber),
                value: isDark,
                onChanged: _toggleTheme,
              ),
            ),
            const SizedBox(height: 30),

            const Text("Profil bearbeiten", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 20),
            
            const Text("Avatar Farbe", style: TextStyle(color: Colors.grey)),
            const SizedBox(height: 10),
            Wrap(
              spacing: 10,
              children: _colorMap.entries.map((entry) {
                final isSelected = entry.key == _selectedColorClass;
                return GestureDetector(
                  onTap: () => setState(() => _selectedColorClass = entry.key),
                  child: Container(
                    width: 50, height: 50,
                    decoration: BoxDecoration(
                      color: entry.value,
                      shape: BoxShape.circle,
                      border: isSelected ? Border.all(color: Theme.of(context).colorScheme.primary, width: 3) : null,
                    ),
                    child: Center(
                      child: Text(
                        _nameController.text.isNotEmpty ? _nameController.text[0].toUpperCase() : "A",
                        style: TextStyle(fontWeight: FontWeight.bold, color: entry.value.computeLuminance() > 0.5 ? Colors.black : Colors.white),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),

            const SizedBox(height: 30),
            
            // NAME FELD MIT SPERRE
            TextField(
              controller: _nameController,
              enabled: !isNameLocked, // Deaktiviert wenn gesperrt
              decoration: InputDecoration(
                labelText: "Benutzername",
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                filled: true,
                fillColor: isNameLocked ? Theme.of(context).disabledColor.withOpacity(0.1) : Theme.of(context).cardColor,
                suffixIcon: isNameLocked ? const Icon(Icons.lock, color: Colors.grey) : null,
                helperText: isNameLocked ? "Änderung in $_daysUntilChange Tagen möglich" : "Alle 30 Tage änderbar",
                helperStyle: isNameLocked ? const TextStyle(color: Colors.orange) : null,
              ),
            ),

            const SizedBox(height: 30),
            
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton.icon(
                onPressed: _saving ? null : _saveProfile,
                icon: const Icon(Icons.save),
                label: const Text("Speichern"),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.deepPurple,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),

            const SizedBox(height: 50),
            const Divider(),
            
            TextButton.icon(
              onPressed: _logout,
              icon: const Icon(Icons.logout, color: Colors.red),
              label: const Text("Abmelden", style: TextStyle(color: Colors.red)),
            )
          ],
        ),
      ),
    );
  }
}