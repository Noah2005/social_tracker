import 'dart:io' show Platform;
import 'package:flutter/material.dart';
import 'package:usage_stats/usage_stats.dart';

class UsageStatsService {
  
  // Update: Jetzt mappen wir den Namen auf eine LISTE von IDs
  static const Map<String, List<String>> _targetApps = {
    'Instagram': [
      'com.instagram.android',
      'com.instagram.lite', // Auch Lite-Version abdecken
    ],
    'TikTok': [
      'com.zhiliaoapp.musically', // Global Standard
      'com.ss.android.ugc.trill', // Asien/Alt
      'com.zhiliaoapp.musically.go', // TikTok Lite
    ],
    'YouTube': [
      'com.google.android.youtube',
      'com.google.android.apps.youtube.mango', // YouTube Go/Lite
    ],
    'Snapchat': [
      'com.snapchat.android',
    ]
  };

  Future<Map<String, int>?> getDailyUsageBreakdown() async {
    if (!Platform.isAndroid) return {};

    try {
      bool isPermissionGranted = await UsageStats.checkUsagePermission() ?? false;
      if (!isPermissionGranted) {
        await UsageStats.grantUsagePermission();
        return null;
      }

      DateTime now = DateTime.now();
      DateTime startOfDay = DateTime(now.year, now.month, now.day, 0, 0, 0);

      List<UsageInfo> usageStats = await UsageStats.queryUsageStats(startOfDay, now);
      Map<String, int> results = {};

      // Wir iterieren durch unsere Apps (Instagram, TikTok...)
      _targetApps.forEach((appName, packageIds) {
        int totalMinutesForApp = 0;

        // Wir prüfen JEDE bekannte ID für diese App
        for (String id in packageIds) {
          // Suche Statistik für diese spezifische ID
          var stats = usageStats.where((info) => info.packageName == id);
          
          for (var info in stats) {
             int totalTimeInMs = int.tryParse(info.totalTimeInForeground ?? "0") ?? 0;
             totalMinutesForApp += (totalTimeInMs / 1000 / 60).round();
          }
        }

        results[appName] = totalMinutesForApp;
      });

      return results;

    } catch (e) {
      debugPrint("FEHLER im UsageService: $e");
      return {};
    }
  }
}