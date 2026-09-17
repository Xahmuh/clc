import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, type } from '../theme';
import { useAuth } from '../lib/auth-context';
import { useLanguage } from '../lib/language-context';
import { supabase } from '../lib/supabase';
import type { Activity } from '../types/database';

interface ActivityItemProps {
  activity: Activity;
  onDeleted?: (activityId: string) => void;
}

export function ActivityItem({ activity, onDeleted }: ActivityItemProps) {
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { user, isAdmin } = useAuth();
  const { t } = useLanguage();

  const recDate = activity.recorded_at || activity.created_at;
  const isWithin24Hours = recDate
    ? Date.now() - new Date(recDate).getTime() < 24 * 60 * 60 * 1000
    : false;

  const canDelete = isAdmin || (user?.id === activity.employee_id && isWithin24Hours);

  const handleDelete = () => {
    Alert.alert(
      t('delete_activity'),
      t('delete_activity_confirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              const { error } = await supabase
                .from('activities')
                .delete()
                .eq('id', activity.id);

              if (error) {
                Alert.alert(t('error'), error.message);
              } else {
                Alert.alert(t('success'), t('activity_deleted'));
                onDeleted?.(activity.id);
              }
            } catch (err: any) {
              Alert.alert(t('error'), err.message || 'Failed to delete');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const renderIcon = (actType: string) => {
    switch (actType) {
      case 'visit':
        return <Ionicons name="location-outline" size={18} color={colors.ink} />;
      case 'call':
        return <Ionicons name="call-outline" size={18} color={colors.ink} />;
      case 'email':
        return <Ionicons name="mail-outline" size={18} color={colors.ink} />;
      case 'meeting':
        return <Ionicons name="people-outline" size={18} color={colors.ink} />;
      default:
        return <Ionicons name="document-text-outline" size={18} color={colors.ink} />;
    }
  };

  const formattedDate = new Date(activity.activity_date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        {renderIcon(activity.activity_type)}
      </View>
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.activityType}>
            {activity.activity_type.toUpperCase()}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.dateText}>{formattedDate}</Text>
            {canDelete && (
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={handleDelete}
                disabled={isDeleting}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#DC2626" />
                ) : (
                  <Ionicons name="trash-outline" size={15} color="#DC2626" />
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {activity.description ? (
          <Text style={styles.notesText}>{activity.description}</Text>
        ) : null}

        {/* Photo Attachment Preview */}
        {activity.attachment_url ? (
          <>
            <TouchableOpacity
              style={styles.attachmentWrapper}
              onPress={() => setIsViewerOpen(true)}
              activeOpacity={0.85}
            >
              <Image
                source={{ uri: activity.attachment_url }}
                style={styles.attachmentThumb}
              />
              <View style={styles.attachmentBadge}>
                <Ionicons name="camera-outline" size={11} color={colors.white} style={{ marginRight: 4 }} />
                <Text style={styles.attachmentBadgeText}>View Photo</Text>
              </View>
            </TouchableOpacity>

            {/* Fullscreen Photo Modal */}
            <Modal
              visible={isViewerOpen}
              transparent
              animationType="fade"
              onRequestClose={() => setIsViewerOpen(false)}
            >
              <View style={styles.modalBackdrop}>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setIsViewerOpen(false)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close" size={18} color={colors.white} style={{ marginRight: 4 }} />
                  <Text style={styles.modalCloseText}>Close</Text>
                </TouchableOpacity>
                <Image
                  source={{ uri: activity.attachment_url }}
                  style={styles.fullImage}
                  resizeMode="contain"
                />
              </View>
            </Modal>
          </>
        ) : null}

        {activity.latitude && activity.longitude ? (
          <View style={styles.gpsRow}>
            <Text style={styles.gpsText}>
              GPS: {Number(activity.latitude).toFixed(4)}, {Number(activity.longitude).toFixed(4)}
            </Text>
          </View>
        ) : null}

        {activity.outcome ? (
          <View style={styles.outcomeRow}>
            <Text style={styles.outcomeLabel}>Outcome:</Text>
            <Text style={styles.outcomeText}>{activity.outcome}</Text>
          </View>
        ) : null}

        {activity.follow_up_date ? (
          <Text style={styles.followUpText}>
            Next follow-up: {activity.follow_up_date}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: radius.button,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  activityType: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: 0.5,
  },
  dateText: {
    ...type.caption,
    color: colors.textMuted,
  },
  notesText: {
    ...type.body,
    color: colors.ink,
    marginTop: 2,
  },
  attachmentWrapper: {
    marginTop: 8,
    borderRadius: radius.button,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    width: 140,
    height: 100,
    position: 'relative',
    backgroundColor: colors.surfaceSubtle,
  },
  attachmentThumb: {
    width: '100%',
    height: '100%',
  },
  attachmentBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
  },
  attachmentBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalCloseText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  fullImage: {
    width: '100%',
    height: '80%',
  },
  gpsRow: {
    marginTop: 4,
  },
  gpsText: {
    fontSize: 11,
    color: colors.textSecondary,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  outcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  outcomeLabel: {
    ...type.caption,
    fontWeight: '600',
    color: colors.textSecondary,
    marginRight: 4,
  },
  outcomeText: {
    ...type.caption,
    color: colors.ink,
  },
  followUpText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },
  deleteBtn: {
    marginLeft: 8,
    padding: 2,
  },
});

