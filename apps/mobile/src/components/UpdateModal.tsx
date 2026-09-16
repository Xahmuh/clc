import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUpdateManager } from '../lib/update-manager';
import { useLanguage } from '../lib/language-context';
import { colors, radius, type } from '../theme';

const { width } = Dimensions.get('window');

export function UpdateModal() {
  const {
    showModal,
    hasUpdate,
    updateType,
    latestVersion,
    releaseNotes,
    forceUpdate,
    isDownloading,
    downloadProgress,
    applyUpdate,
    dismissUpdate,
    error,
  } = useUpdateManager();
  const { language } = useLanguage();

  if (!showModal || !hasUpdate) {
    return null;
  }

  const isRTL = language === 'ar';
  const notes = isRTL ? releaseNotes.ar : releaseNotes.en;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={showModal}
      onRequestClose={() => {
        if (!forceUpdate) dismissUpdate();
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header Icon */}
          <View style={styles.iconCircle}>
            <Ionicons
              name={updateType === 'ota' ? 'cloud-download-outline' : 'sparkles-outline'}
              size={28}
              color={colors.ink}
            />
            <View style={styles.dotOnline} />
          </View>

          {/* Badge */}
          <View style={styles.versionBadge}>
            <Text style={styles.versionBadgeText}>
              {isRTL ? `إصدار جديد v${latestVersion}` : `New Version v${latestVersion}`}
            </Text>
          </View>

          {/* Title */}
          <Text style={[styles.title, isRTL && styles.rtlText]}>
            {isRTL ? 'تحديث جديد متاح للتطبيق' : 'App Update Available'}
          </Text>

          {/* Subtitle */}
          <Text style={[styles.subtitle, isRTL && styles.rtlText]}>
            {updateType === 'ota'
              ? isRTL
                ? 'يتوفر تحديث هوائي فوري يتضمن أحدث المزايا والتحسينات لنظام CLC CRM.'
                : 'An instant over-the-air update is ready with the latest features and fixes.'
              : isRTL
              ? 'يتوفر إصدار جديد يتضمن تحسينات أساسية على النظام. يرجى تثبيت التحديث للاستمرار.'
              : 'A new application release is available. Please update to ensure optimal performance.'}
          </Text>

          {/* Release Notes Box */}
          <View style={styles.notesBox}>
            <Text style={[styles.notesHeading, isRTL && styles.rtlText]}>
              {isRTL ? 'ما الجديد في هذا التحديث:' : "What's new:"}
            </Text>
            <Text style={[styles.notesText, isRTL && styles.rtlText]}>{notes}</Text>
          </View>

          {/* Error Message if any */}
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
              <Text style={[styles.errorText, isRTL && styles.rtlText]}>{error}</Text>
            </View>
          ) : null}

          {/* Progress Bar when downloading */}
          {isDownloading ? (
            <View style={styles.progressContainer}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressBar, { width: `${downloadProgress}%` }]} />
              </View>
              <Text style={styles.progressText}>
                {isRTL
                  ? `جاري تثبيت التحديث... ${downloadProgress}%`
                  : `Applying update... ${downloadProgress}%`}
              </Text>
            </View>
          ) : null}

          {/* Action Buttons */}
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.primaryBtn, isDownloading && styles.disabledBtn]}
              onPress={applyUpdate}
              disabled={isDownloading}
              activeOpacity={0.85}
            >
              {isDownloading ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <>
                  <Ionicons
                    name={updateType === 'ota' ? 'flash-outline' : 'download-outline'}
                    size={18}
                    color={colors.white}
                  />
                  <Text style={styles.primaryBtnText}>
                    {updateType === 'ota'
                      ? isRTL
                        ? 'تحديث وتثبيت الآن'
                        : 'Update & Reload Now'
                      : isRTL
                      ? 'تحميل التحديث (APK)'
                      : 'Download Update (APK)'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {!forceUpdate && !isDownloading && (
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={dismissUpdate}
                activeOpacity={0.7}
              >
                <Text style={styles.secondaryBtnText}>
                  {isRTL ? 'لاحقاً' : 'Later'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 17, 17, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: width > 420 ? 380 : width - 40,
    backgroundColor: colors.surface,
    borderRadius: radius.panel,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    alignItems: 'center',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 10,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.cream,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    position: 'relative',
  },
  dotOnline: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.accentEmerald,
    borderWidth: 2,
    borderColor: colors.white,
    position: 'absolute',
    top: 2,
    right: 2,
  },
  versionBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.pill,
    marginBottom: 10,
  },
  versionBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.ink,
  },
  title: {
    ...type.heading,
    fontSize: 18,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    ...type.subtext,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  rtlText: {
    textAlign: 'right',
  },
  notesBox: {
    width: '100%',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 16,
  },
  notesHeading: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: 6,
  },
  notesText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: radius.button,
    padding: 10,
    marginBottom: 14,
    width: '100%',
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    flex: 1,
  },
  progressContainer: {
    width: '100%',
    marginBottom: 16,
    alignItems: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.accentEmerald,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  btnRow: {
    width: '100%',
    gap: 10,
  },
  primaryBtn: {
    backgroundColor: colors.ink,
    borderRadius: radius.button,
    paddingVertical: 13,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  primaryBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  disabledBtn: {
    opacity: 0.7,
  },
  secondaryBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
});
