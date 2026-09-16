import { NextResponse } from 'next/server';

// Server-side mobile update config
// Whenever you release a new version or APK, update the version number, notes, and APK link here.
export async function GET() {
  return NextResponse.json({
    latestVersion: '1.0.1',
    versionCode: 2,
    minVersion: '1.0.0',
    releaseDate: new Date().toISOString().split('T')[0],
    forceUpdate: false,
    apkUrl: 'https://clc-crm.vercel.app/downloads/clc-crm-latest.apk',
    releaseNotes: {
      ar: '• تحديثات مستمرة للنظام وواجهة تسجيل الحركات\n• توافق كامل مع تقارير Excel المتقدمة بهوية CLC\n• تحسينات استقرار وأداء في فحص وتحديث النظام',
      en: '• System enhancements and quick log updates\n• Full compatibility with CLC branded Excel reports\n• Performance optimizations and in-app update stability',
    },
    otaChannel: 'production',
  });
}
