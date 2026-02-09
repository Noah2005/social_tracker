import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:social_tracker/screens/login_screen.dart'; // Pfad anpassen

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _nameController = TextEditingController();
  bool _saving = false;
  String _selectedColorClass = "bg-brand-100 text-brand-700"; // Default

  // Mapping: Tailwind-String zu Flutter Farbe
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
    final data = await Supabase.instance.client
        .from('profiles')
        .select()
        .eq('id', userId)
        .single();
    
    if (mounted) {
      setState(() {
        _nameController.text = data['username'] ?? '';
        _selectedColorClass = data['avatar_url'] ?? _selectedColorClass;
      });
    }
  }

  Future<void> _saveProfile() async {
    setState(() => _saving = true);
    final userId = Supabase.instance.client.auth.currentUser!.id;
    
    await Supabase.instance.client.from('profiles').update({
      'username': _nameController.text,
      'avatar_url': _selectedColorClass, // Wir speichern den Tailwind-String!
    }).eq('id', userId);

    if (mounted) {
      setState(() => _saving = false);
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Gespeichert!")));
    }
  }

  Future<void> _logout() async {
    await Supabase.instance.client.auth.signOut();
    if (mounted) {
       Navigator.of(context).pushAndRemoveUntil(
         MaterialPageRoute(builder: (_) => const LoginScreen()),
         (route) => false
       );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(title: const Text("Einstellungen")),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text("Profil bearbeiten", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 20),
            
            // Avatar Auswahl
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
                      border: isSelected ? Border.all(color: Colors.black, width: 2) : null,
                    ),
                    child: Center(
                      child: Text(
                        _nameController.text.isNotEmpty ? _nameController.text[0].toUpperCase() : "A",
                        style: TextStyle(
                          fontWeight: FontWeight.bold, 
                          color: entry.value.computeLuminance() > 0.5 ? Colors.black : Colors.white
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),

            const SizedBox(height: 30),
            
            // Name Input
            TextField(
              controller: _nameController,
              decoration: InputDecoration(
                labelText: "Benutzername",
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                filled: true,
                fillColor: Colors.white,
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
            
            // Logout Button
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