import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../lib/auth-context';
import { useLanguage } from '../lib/language-context';
import { getOfflineQueueCount, syncOfflineActivities } from '../lib/offline-queue';
import { colors, radius, type } from '../theme';

export function ProfileScreen() {
  const navigation = useNavigation();
  const { profile, signOut, savePushToken } = useAuth();
  const { t, language, setLanguage, formatRole } = useLanguage();
  const [offlineCount, setOfflineCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const checkQueue = async () => {
    const count = await getOfflineQueueCount();
    setOfflineCount(count);
  };

  useEffect(() => {
    checkQueue();
  }, []);

  const handleSyncNow = async () => {
    setIsSyncing(true);
    const { synced, remaining } = await syncOfflineActivities();
    setOfflineCount(remaining);
    setIsSyncing(false);
    Alert.alert(
      language === 'ar' ? 'اكتملت المزامنة' : 'Sync Complete',
      language === 'ar'
        ? `تمت مزامنة ${synced} حركات بنجاح. المتبقي في قائمة الانتظار: ${remaining}`
        : `Successfully synced ${synced} activities. Remaining in queue: ${remaining}`
    );
  };

  const handleSignOut = () => {
    Alert.alert(t('profile_sign_out'), t('profile_sign_out_confirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('profile_sign_out'), style: 'destructive', onPress: () => signOut() },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile?.full_name?.charAt(0) || 'E'}
            </Text>
          </View>
          <Text style={styles.name}>{profile?.full_name || (language === 'ar' ? 'موظف ميداني' : 'Field Employee')}</Text>
          <Text style={styles.email}>{profile?.email}</Text>
          <View style={styles.roleBadge}>
            <View style={styles.onlineDot} />
            <Text style={styles.roleText}>{formatRole(profile?.role || 'employee').toUpperCase()}</Text>
          </View>
        </View>

        {/* Dedicated Language Switcher Card */}
        <View style={styles.syncCard}>
          <View style={styles.syncHeader}>
            <Text style={styles.syncTitle}>{t('profile_language_card_title')}</Text>
            <View style={styles.pill}>
              <Text style={styles.pillText}>{language === 'ar' ? 'العربية' : 'English'}</Text>
            </View>
          </View>
          <Text style={styles.syncDesc}>{t('profile_language_card_desc')}</Text>
          <View style={styles.langToggleRow}>
            <TouchableOpacity
              style={[
                styles.langOptionBtn,
                language === 'en' && styles.langOptionBtnActive,
              ]}
              onPress={() => setLanguage('en')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.langOptionText,
                  language === 'en' && styles.langOptionTextActive,
                ]}
              >
                English
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.langOptionBtn,
                language === 'ar' && styles.langOptionBtnActive,
              ]}
              onPress={() => setLanguage('ar')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.langOptionText,
                  language === 'ar' && styles.langOptionTextActive,
                ]}
              >
                العربية
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Daily Field Report Access */}
        <View style={styles.syncCard}>
          <View style={styles.syncHeader}>
            <Text style={styles.syncTitle}>{t('report_title')}</Text>
            <View style={styles.pill}>
              <Text style={styles.pillText}>{language === 'ar' ? 'مباشر' : 'Live'}</Text>
            </View>
          </View>
          <Text style={styles.syncDesc}>
            {t('profile_report_card_desc')}
          </Text>

          <TouchableOpacity
            style={styles.syncBtn}
            onPress={() => (navigation as any).navigate('DailyReport')}
            activeOpacity={0.8}
          >
            <Ionicons name="document-text-outline" size={16} color={colors.ink} />
            <Text style={styles.syncBtnText}>{t('profile_report_card_btn')}</Text>
          </TouchableOpacity>
        </View>

        {/* Offline Sync Status */}
        <View style={styles.syncCard}>
          <View style={styles.syncHeader}>
            <Text style={styles.syncTitle}>{t('profile_sync_title')}</Text>
            <View style={styles.pill}>
              <Text style={styles.pillText}>
                {offlineCount} {language === 'ar' ? 'معلق' : 'pending'}
              </Text>
            </View>
          </View>
          <Text style={styles.syncDesc}>
            {t('profile_sync_desc')}
          </Text>

          <TouchableOpacity
            style={[styles.syncBtn, isSyncing && styles.syncBtnDisabled]}
            onPress={handleSyncNow}
            disabled={isSyncing}
            activeOpacity={0.8}
          >
            {isSyncing ? (
              <ActivityIndicator color={colors.ink} size="small" />
            ) : (
              <>
                <Ionicons name="sync-outline" size={16} color={colors.ink} />
                <Text style={styles.syncBtnText}>{t('profile_sync_now')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Lead SLA Push Notification Status */}
        <View style={styles.syncCard}>
          <View style={styles.syncHeader}>
            <Text style={styles.syncTitle}>
              {language === 'ar' ? 'إشعارات متابعة الفرص' : 'Lead Inactivity Alerts'}
            </Text>
            <View style={styles.pill}>
              <Text style={styles.pillText}>
                {profile?.expo_push_token
                  ? (language === 'ar' ? 'مفعل' : 'Enabled')
                  : (language === 'ar' ? 'غير مفعل' : 'Not Configured')}
              </Text>
            </View>
          </View>
          <Text style={styles.syncDesc}>
            {profile?.expo_push_token
              ? (language === 'ar'
                  ? 'يتلقى جهازك تنبيهات فورية عندما تتجاوز الفرص المسندة إليك مهلة عدم التواصل المحددة.'
                  : 'Your device receives instant Expo push notifications whenever an assigned lead has no activity for the configured SLA threshold.')
              : (language === 'ar'
                  ? 'سجل هذا الجهاز لتلقي إشعارات فورية عند ركود أي فرصة.'
                  : 'Register this device to receive instant push alerts whenever a lead is flagged for inactivity.')}
          </Text>

          <TouchableOpacity
            style={styles.syncBtn}
            onPress={async () => {
              const demoToken = `ExponentPushToken[demo_${profile?.id?.slice(0, 8) || 'user'}_device]`;
              await savePushToken(demoToken);
              Alert.alert(
                language === 'ar' ? 'تم ضبط الإشعارات الفورية' : 'Push Notifications Configured',
                language === 'ar'
                  ? 'تم تسجيل رمز الجهاز بنجاح. ستصلك تنبيهات عند اقتراب الفرص من مهلة عدم التواصل.'
                  : 'Device token registered successfully. You will receive alerts when your leads reach SLA inactivity thresholds.'
              );
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="notifications-outline" size={16} color={colors.ink} />
            <Text style={styles.syncBtnText}>
              {profile?.expo_push_token
                ? (language === 'ar' ? 'تحديث تسجيل الإشعارات' : 'Refresh Push Registration')
                : (language === 'ar' ? 'تفعيل الإشعارات الفورية' : 'Enable Push Notifications')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={handleSignOut}
          activeOpacity={0.85}
        >
          <Ionicons name="log-out-outline" size={18} color="#DC2626" />
          <Text style={styles.signOutBtnText}>{t('profile_sign_out')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 48,
  },
  profileCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    marginBottom: 20,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.ink,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.white,
  },
  name: {
    ...type.heading,
    fontSize: 18,
    color: colors.ink,
  },
  email: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    marginTop: 12,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.online,
    marginRight: 6,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: 0.5,
  },
  syncCard: {
    padding: 18,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
    marginBottom: 24,
  },
  syncHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  syncTitle: {
    ...type.caption,
    fontWeight: '700',
    color: colors.ink,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.ink,
  },
  syncDesc: {
    ...type.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.button,
    paddingVertical: 10,
    marginTop: 14,
  },
  syncBtnDisabled: {
    opacity: 0.7,
  },
  syncBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.ink,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: radius.button,
    paddingVertical: 14,
    backgroundColor: '#FEF2F2',
    marginTop: 8,
    marginBottom: 24,
  },
  signOutBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
  },
  langToggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  langOptionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langOptionBtnActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  langOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink,
  },
  langOptionTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
});
