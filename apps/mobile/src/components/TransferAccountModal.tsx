import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth-context';
import { useLanguage } from '../lib/language-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, type } from '../theme';
import type { Profile } from '../types/database';

interface TransferAccountModalProps {
  visible: boolean;
  entityType: 'lead' | 'customer';
  entityId: string;
  entityName: string;
  currentAssigneeId?: string | null;
  onClose: () => void;
  onSuccess: (newAssigneeName: string) => void;
}

export function TransferAccountModal({
  visible,
  entityType,
  entityId,
  entityName,
  currentAssigneeId,
  onClose,
  onSuccess,
}: TransferAccountModalProps) {
  const { user } = useAuth();
  const { t, formatRole } = useLanguage();

  const [colleagues, setColleagues] = useState<Profile[]>([]);
  const [selectedColleague, setSelectedColleague] = useState<Profile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) {
      setSelectedColleague(null);
      setSearchQuery('');
      return;
    }

    const loadColleagues = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('is_active', true)
          .order('full_name');

        if (!error && data) {
          setColleagues(data as Profile[]);
        }
      } catch (err) {
        console.error('Error loading team colleagues:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadColleagues();
  }, [visible]);

  const filteredColleagues = colleagues.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.full_name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.role?.toLowerCase().includes(q)
    );
  });

  const handleConfirmTransfer = async () => {
    if (!selectedColleague || !user) return;

    if (selectedColleague.id === currentAssigneeId) {
      Alert.alert(t('notice'), t('transfer_already_assigned'));
      return;
    }

    setIsSubmitting(true);
    try {
      const table = entityType === 'lead' ? 'leads' : 'customers';

      // 1. Update assignment
      const { error: updateError } = await (supabase.from(table) as any)
        .update({
          assigned_to: selectedColleague.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', entityId);

      if (updateError) throw updateError;

      // 2. Insert audit activity log
      await (supabase.from('activities') as any).insert({
        activity_type: 'other',
        description: `${t('transfer_audit_log')} ${selectedColleague.full_name}`,
        activity_date: new Date().toISOString(),
        related_entity_type: entityType,
        related_entity_id: entityId,
        employee_id: user.id,
      });

      // 3. Notify caller and close
      Alert.alert(
        t('transfer_success_title'),
        `"${entityName}" ${t('transfer_success_body')} ${selectedColleague.full_name}.`,
        [
          {
            text: t('confirm'),
            onPress: () => {
              onSuccess(selectedColleague.full_name);
              onClose();
            },
          },
        ]
      );
    } catch (err: any) {
      console.error('Transfer failed:', err);
      Alert.alert(t('error'), err.message || 'Failed to transfer account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentColleague = colleagues.find((c) => c.id === currentAssigneeId);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalBackdrop}
      >
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>
                {entityType === 'lead' ? t('transfer_lead') : t('transfer_customer')}
              </Text>
              <Text style={styles.entitySubtitle} numberOfLines={1}>
                {entityName}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
              <Ionicons name="close" size={20} color={colors.ink} />
            </TouchableOpacity>
          </View>

          {/* Current Assignee info */}
          <View style={styles.currentAssigneeBox}>
            <Text style={styles.currentAssigneeLabel}>{t('transfer_current_assignee')}:</Text>
            <Text style={styles.currentAssigneeValue}>
              {currentColleague
                ? `${currentColleague.full_name} (${formatRole(currentColleague.role)})`
                : t('unassigned')}
            </Text>
          </View>

          {/* Search Colleague Input */}
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={16} color={colors.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('transfer_search_colleague')}
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
            />
          </View>

          {/* Colleagues List */}
          <Text style={styles.listLabel}>
            {t('transfer_select_colleague')}:
          </Text>

          {isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color={colors.ink} />
              <Text style={styles.loadingText}>{t('loading')}</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.colleagueListScroll}
              contentContainerStyle={styles.colleagueListContent}
              keyboardShouldPersistTaps="handled"
            >
              {filteredColleagues.map((member) => {
                const isSelected = selectedColleague?.id === member.id;
                const isCurrent = member.id === currentAssigneeId;
                const isSelf = member.id === user?.id;

                return (
                  <TouchableOpacity
                    key={member.id}
                    style={[
                      styles.colleagueCard,
                      isSelected && styles.colleagueCardSelected,
                    ]}
                    onPress={() => setSelectedColleague(member)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {member.full_name?.substring(0, 2).toUpperCase() || 'EM'}
                      </Text>
                    </View>

                    <View style={styles.memberInfo}>
                      <View style={styles.nameRow}>
                        <Text style={styles.memberName}>{member.full_name}</Text>
                        {isSelf && <Text style={styles.selfTag}>({t('you')})</Text>}
                        {isCurrent && <Text style={styles.currentTag}>{t('current')}</Text>}
                      </View>
                      <Text style={styles.memberEmail}>{member.email}</Text>
                    </View>

                    <View style={styles.badgeCol}>
                      <View
                        style={[
                          styles.roleBadge,
                          member.role === 'admin' && styles.roleBadgeAdmin,
                          member.role === 'supervisor' && styles.roleBadgeSupervisor,
                        ]}
                      >
                        <Text
                          style={[
                            styles.roleBadgeText,
                            member.role === 'admin' && styles.roleBadgeTextAdmin,
                            member.role === 'supervisor' && styles.roleBadgeTextSupervisor,
                          ]}
                        >
                          {formatRole(member.role)}
                        </Text>
                      </View>

                      {isSelected && (
                        <View style={styles.checkCircle}>
                          <Ionicons name="checkmark" size={13} color={colors.white} />
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}

              {filteredColleagues.length === 0 && (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>{t('team_no_members')}</Text>
                </View>
              )}
            </ScrollView>
          )}

          {/* Action Confirmation & Submit */}
          <View style={styles.footerActions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelBtnText}>{t('cancel')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.confirmBtn,
                (!selectedColleague || isSubmitting) && styles.confirmBtnDisabled,
              ]}
              onPress={handleConfirmTransfer}
              disabled={!selectedColleague || isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.confirmBtnText}>
                  {selectedColleague
                    ? `${t('transfer_button')} (${selectedColleague.full_name.split(' ')[0]}) →`
                    : t('transfer_select_colleague')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.panel,
    borderTopRightRadius: radius.panel,
    maxHeight: '88%',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
  },
  entitySubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
    maxWidth: 260,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    color: colors.ink,
    fontWeight: '600',
  },
  currentAssigneeBox: {
    backgroundColor: colors.cream,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  currentAssigneeLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  currentAssigneeValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.ink,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.button,
    paddingHorizontal: 10,
    height: 42,
    marginBottom: 12,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.ink,
    paddingVertical: 0,
  },
  listLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: 8,
  },
  loadingBox: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 8,
  },
  colleagueListScroll: {
    maxHeight: 280,
  },
  colleagueListContent: {
    gap: 8,
    paddingBottom: 8,
  },
  colleagueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 10,
  },
  colleagueCardSelected: {
    borderColor: colors.ink,
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  memberInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  memberName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink,
  },
  selfTag: {
    fontSize: 11,
    color: colors.textMuted,
  },
  currentTag: {
    fontSize: 10,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  memberEmail: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  badgeCol: {
    alignItems: 'flex-end',
    gap: 6,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleBadgeAdmin: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  roleBadgeSupervisor: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.border,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.ink,
    textTransform: 'capitalize',
  },
  roleBadgeTextAdmin: {
    color: colors.white,
  },
  roleBadgeTextSupervisor: {
    color: colors.ink,
  },
  checkCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    color: colors.white,
    fontSize: 11,
    fontWeight: 'bold',
  },
  emptyBox: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  footerActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  confirmBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: radius.button,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnDisabled: {
    opacity: 0.5,
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.white,
  },
});
