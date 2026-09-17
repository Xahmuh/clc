import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../lib/auth-context';
import { useLanguage } from '../lib/language-context';
import { supabase } from '../lib/supabase';
import { captureLocationAndSuggestDistrict, type LocationDistrictResult } from '../lib/location';
import { queueActivityOffline } from '../lib/offline-queue';
import { uploadActivityPhoto } from '../lib/storage';
import { colors, radius, type } from '../theme';
import type { Lead, Customer, District, ActivityType, RelatedEntity } from '../types/database';
import type { MainTabParamList } from '../navigation/types';

type QuickLogRouteProp = RouteProp<MainTabParamList, 'QuickLog'>;

export function QuickLogScreen() {
  const navigation = useNavigation();
  const route = useRoute<QuickLogRouteProp>();
  const { user } = useAuth();
  const { t, formatDistrict, formatActivityType, language } = useLanguage();

  // Activity Type
  const [activityType, setActivityType] = useState<ActivityType>('visit');

  // Entity Selection
  const [entityType, setEntityType] = useState<RelatedEntity>(
    route.params?.entityType || 'lead'
  );
  const [selectedEntityId, setSelectedEntityId] = useState<string>(
    route.params?.entityId || ''
  );

  const [leads, setLeads] = useState<Lead[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [isLoadingEntities, setIsLoadingEntities] = useState(false);
  const [accountSearchQuery, setAccountSearchQuery] = useState('');

  // GPS & District
  const [isLocating, setIsLocating] = useState(false);
  const [locationResult, setLocationResult] = useState<LocationDistrictResult | null>(null);

  // Form Fields
  const [notes, setNotes] = useState('');
  const [outcome, setOutcome] = useState('');
  const [followUpDays, setFollowUpDays] = useState<number | null>(null);
  const [activityDate, setActivityDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Photo Attachment
  const [selectedPhotoUri, setSelectedPhotoUri] = useState<string | null>(null);
  const [selectedPhotoBase64, setSelectedPhotoBase64] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Take photo with camera
  const handleTakePhoto = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Required', 'Camera permission is needed to capture photos of visits.');
        return;
      }
      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.7,
        base64: true,
      });
      if (!res.canceled && res.assets && res.assets[0]) {
        setSelectedPhotoUri(res.assets[0].uri);
        setSelectedPhotoBase64(res.assets[0].base64 || null);
      }
    } catch (err: any) {
      Alert.alert('Camera Error', err.message || 'Could not launch camera');
    }
  };

  // Pick photo from gallery
  const handlePickFromGallery = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Required', 'Photo library permission is needed.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.7,
        base64: true,
      });
      if (!res.canceled && res.assets && res.assets[0]) {
        setSelectedPhotoUri(res.assets[0].uri);
        setSelectedPhotoBase64(res.assets[0].base64 || null);
      }
    } catch (err: any) {
      Alert.alert('Gallery Error', err.message || 'Could not open gallery');
    }
  };

  // Load leads and customers for picker (reactive to auth user & screen focus)
  const loadEntities = useCallback(async () => {
    if (!user) return;
    setIsLoadingEntities(true);
    try {
      const { data: lData, error: lError } = await supabase
        .from('leads')
        .select('*')
        .order('company_name');
      if (lError) {
        console.warn('Error fetching leads:', lError.message);
      } else if (lData) {
        setLeads(lData as Lead[]);
      }

      const { data: cData, error: cError } = await supabase
        .from('customers')
        .select('*')
        .order('company_name');
      if (cError) {
        console.warn('Error fetching customers:', cError.message);
      } else if (cData) {
        setCustomers(cData as Customer[]);
      }

      const { data: dData } = await supabase
        .from('districts')
        .select('*')
        .order('name_en');
      if (dData) setDistricts(dData as District[]);
    } catch (err) {
      console.error('Error loading entities for QuickLog:', err);
    } finally {
      setIsLoadingEntities(false);
    }
  }, [user]);

  // Load on mount or when user context becomes available
  useEffect(() => {
    loadEntities();
  }, [loadEntities]);

  // Re-fetch whenever user tabs into Quick Log
  useFocusEffect(
    useCallback(() => {
      loadEntities();
    }, [loadEntities])
  );

  // When route params change, set entity
  useEffect(() => {
    if (route.params?.entityType) setEntityType(route.params.entityType);
    if (route.params?.entityId) setSelectedEntityId(route.params.entityId);
  }, [route.params]);

  // When type is 'visit', trigger GPS capture & nearest_district RPC
  const triggerGpsCapture = async () => {
    setIsLocating(true);
    const res = await captureLocationAndSuggestDistrict();
    setLocationResult(res);
    setIsLocating(false);
  };

  useEffect(() => {
    if (activityType === 'visit') {
      triggerGpsCapture();
    } else {
      setLocationResult(null);
    }
  }, [activityType]);

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert(t('error'), t('quick_log_err_auth'));
      return;
    }

    if (!selectedEntityId) {
      Alert.alert(t('quick_log_select_account'), t('quick_log_err_select'));
      return;
    }

    if (!notes.trim()) {
      Alert.alert(t('quick_log_notes_label'), t('quick_log_err_notes'));
      return;
    }

    setIsSubmitting(true);

    // 1. Upload photo if one was attached
    let uploadedAttachmentUrl: string | null = null;
    if (selectedPhotoUri) {
      try {
        uploadedAttachmentUrl = await uploadActivityPhoto(selectedPhotoUri, selectedPhotoBase64);
      } catch (uploadErr: any) {
        console.warn('Photo upload warning:', uploadErr.message);
      }
    }

    // 2. Compute follow up date if selected
    let computedFollowUpDate: string | null = null;
    if (followUpDays !== null) {
      const d = new Date();
      d.setDate(d.getDate() + followUpDays);
      computedFollowUpDate = d.toISOString().split('T')[0];
    }

    const customActDate = activityDate
      ? new Date(activityDate + 'T12:00:00Z').toISOString()
      : new Date().toISOString();

    const payload = {
      employee_id: user.id,
      related_entity_type: entityType,
      related_entity_id: selectedEntityId,
      activity_type: activityType,
      activity_date: customActDate,
      description: notes.trim(),
      latitude: activityType === 'visit' && locationResult?.latitude ? locationResult.latitude : null,
      longitude: activityType === 'visit' && locationResult?.longitude ? locationResult.longitude : null,
      attachment_url: uploadedAttachmentUrl,
      outcome: outcome.trim() || null,
      follow_up_date: computedFollowUpDate,
    };

    try {
      const { error } = await supabase.from('activities').insert(payload as any);

      if (error) {
        // Fallback to offline queue
        await queueActivityOffline({
          ...payload,
          queued_at: new Date().toISOString(),
        });
        Alert.alert(
          t('offline_saved'),
          t('quick_log_offline_saved')
        );
      } else {
        Alert.alert(t('success'), t('quick_log_success'));
      }

      // Reset form
      setNotes('');
      setOutcome('');
      setFollowUpDays(null);
      setSelectedPhotoUri(null);
      setSelectedPhotoBase64(null);
      setActivityDate(new Date().toISOString().split('T')[0]);
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    } catch (err: any) {
      // Offline fallback
      await queueActivityOffline({
        ...payload,
        queued_at: new Date().toISOString(),
      });
      Alert.alert(
        t('offline_saved'),
        t('quick_log_offline_saved')
      );
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const activityTypes: { type: ActivityType; iconName: keyof typeof Ionicons.glyphMap }[] = [
    { type: 'visit', iconName: 'location-outline' },
    { type: 'call', iconName: 'call-outline' },
    { type: 'email', iconName: 'mail-outline' },
    { type: 'meeting', iconName: 'people-outline' },
  ];

  const activeList = entityType === 'lead' ? leads : customers;
  const filteredActiveList = activeList.filter((item) => {
    if (!accountSearchQuery.trim()) return true;
    const q = accountSearchQuery.toLowerCase();
    return (
      item.company_name.toLowerCase().includes(q) ||
      (item.contact_person && item.contact_person.toLowerCase().includes(q))
    );
  });
  const selectedAccount = activeList.find((item) => item.id === selectedEntityId);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Header Title */}
        <Text style={styles.title}>{t('quick_log_title')}</Text>
        <Text style={styles.subtitle}>{t('quick_log_subtitle')}</Text>

        {/* 1. Activity Type Selector */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('quick_log_activity_type')}</Text>
          <View style={styles.typeGrid}>
            {activityTypes.map((item) => {
              const isActive = activityType === item.type;
              return (
                <TouchableOpacity
                  key={item.type}
                  style={[
                    styles.typeButton,
                    isActive && styles.typeButtonActive,
                  ]}
                  onPress={() => setActivityType(item.type)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={item.iconName}
                    size={20}
                    color={isActive ? colors.white : colors.ink}
                    style={{ marginBottom: 4 }}
                  />
                  <Text
                    style={[
                      styles.typeText,
                      isActive && styles.typeTextActive,
                    ]}
                  >
                    {formatActivityType(item.type)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* GPS AUTO-DETECTION BANNER FOR VISITS */}
        {activityType === 'visit' && (
          <View style={styles.gpsBanner}>
            <View style={styles.gpsHeader}>
              <Text style={styles.gpsTitle}>{t('quick_log_gps_location')}</Text>
              {isLocating ? (
                <ActivityIndicator size="small" color={colors.ink} />
              ) : (
                <TouchableOpacity onPress={triggerGpsCapture}>
                  <Text style={styles.retryGpsText}>{t('refresh')}</Text>
                </TouchableOpacity>
              )}
            </View>

            {isLocating ? (
              <Text style={styles.gpsSubtext}>
                {t('quick_log_fetching_gps')}
              </Text>
            ) : locationResult?.district ? (
              <View style={styles.districtFoundBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="location-outline" size={15} color={colors.ink} style={{ marginRight: 4 }} />
                  <Text style={styles.districtNameEn}>
                    {formatDistrict(locationResult.district)}
                  </Text>
                </View>
                <Text style={styles.coordsText}>
                  Lat: {locationResult.latitude.toFixed(4)}, Lng: {locationResult.longitude.toFixed(4)}
                </Text>
              </View>
            ) : locationResult?.error ? (
              <Text style={styles.gpsErrorText}>{locationResult.error}</Text>
            ) : (
              <Text style={styles.gpsSubtext}>{t('quick_log_gps_location')}</Text>
            )}
          </View>
        )}

        {/* 2. Target Entity Selector */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.label}>{t('quick_log_select_account')} *</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {isLoadingEntities && (
                <ActivityIndicator size="small" color={colors.ink} />
              )}
              <TouchableOpacity onPress={loadEntities} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.refreshText}>↻ {t('refresh')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.entityTypeToggle}>
            <TouchableOpacity
              style={[
                styles.entityTypeBtn,
                entityType === 'lead' && styles.entityTypeBtnActive,
              ]}
              onPress={() => {
                setEntityType('lead');
                setSelectedEntityId('');
                setAccountSearchQuery('');
              }}
            >
              <Text
                style={[
                  styles.entityTypeText,
                  entityType === 'lead' && styles.entityTypeTextActive,
                ]}
              >
                {t('dir_leads_tab')} ({leads.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.entityTypeBtn,
                entityType === 'customer' && styles.entityTypeBtnActive,
              ]}
              onPress={() => {
                setEntityType('customer');
                setSelectedEntityId('');
                setAccountSearchQuery('');
              }}
            >
              <Text
                style={[
                  styles.entityTypeText,
                  entityType === 'customer' && styles.entityTypeTextActive,
                ]}
              >
                {t('dir_customers_tab')} ({customers.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Selected Account Banner if chosen */}
          {selectedAccount && (
            <View style={styles.selectedAccountBanner}>
              <View style={{ flex: 1 }}>
                <Text style={styles.selectedAccountLabel}>
                  {entityType === 'lead' ? t('quick_log_selected_lead') : t('quick_log_selected_customer')}
                </Text>
                <Text style={styles.selectedAccountName}>{selectedAccount.company_name}</Text>
                {selectedAccount.contact_person ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                    <Ionicons name="person-outline" size={13} color={colors.textSecondary} style={{ marginRight: 4 }} />
                    <Text style={styles.selectedAccountContact}>{selectedAccount.contact_person}</Text>
                  </View>
                ) : null}
              </View>
              <TouchableOpacity
                onPress={() => setSelectedEntityId('')}
                style={styles.changeAccountBtn}
              >
                <Text style={styles.changeAccountText}>{t('quick_log_deselect')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* List of Accounts or Empty State */}
          {isLoadingEntities && activeList.length === 0 ? (
            <View style={styles.emptyEntityBox}>
              <ActivityIndicator size="small" color={colors.ink} />
              <Text style={styles.emptyEntitySubtext}>{t('quick_log_loading_accounts')}</Text>
            </View>
          ) : activeList.length === 0 ? (
            <View style={styles.emptyEntityBox}>
              <Text style={styles.emptyEntityTitle}>
                {t('quick_log_no_accounts')}
              </Text>
              <Text style={styles.emptyEntitySubtext}>
                {t('quick_log_no_accounts_sub')}
              </Text>
              <TouchableOpacity
                style={styles.goToAccountsBtn}
                onPress={() => (navigation as any).navigate('Directory')}
              >
                <Text style={styles.goToAccountsText}>{t('quick_log_view_directory')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ marginTop: 4 }}>
              {activeList.length > 3 && (
                <TextInput
                  style={styles.accountSearchInput}
                  placeholder={t('quick_log_search_account')}
                  placeholderTextColor={colors.textMuted}
                  value={accountSearchQuery}
                  onChangeText={setAccountSearchQuery}
                  clearButtonMode="while-editing"
                />
              )}
              <View style={styles.accountCardsWrapper}>
                {filteredActiveList.map((item) => {
                  const isSelected = selectedEntityId === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.accountCard,
                        isSelected && styles.accountCardActive,
                      ]}
                      onPress={() => setSelectedEntityId(item.id)}
                      activeOpacity={0.8}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.accountCardName,
                            isSelected && styles.accountCardNameActive,
                          ]}
                          numberOfLines={1}
                        >
                          {item.company_name}
                        </Text>
                        {item.contact_person ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                            <Ionicons
                              name="person-outline"
                              size={12}
                              color={isSelected ? colors.ink : colors.textSecondary}
                              style={{ marginRight: 4 }}
                            />
                            <Text
                              style={[
                                styles.accountCardContact,
                                isSelected && styles.accountCardContactActive,
                              ]}
                              numberOfLines={1}
                            >
                              {item.contact_person}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                        {isSelected && <View style={styles.radioInner} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        {/* 3. Notes / Observations */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('quick_log_notes_label')}</Text>
          <TextInput
            style={styles.textArea}
            multiline
            numberOfLines={4}
            placeholder={t('quick_log_notes_placeholder')}
            placeholderTextColor={colors.textMuted}
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        {/* 4. Outcome */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('quick_log_outcome_label')}</Text>
          <TextInput
            style={styles.textInput}
            placeholder={t('quick_log_outcome_placeholder')}
            placeholderTextColor={colors.textMuted}
            value={outcome}
            onChangeText={setOutcome}
          />
        </View>

        {/* Activity Date (Supports retroactive recording باثر رجعي) */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('field_date')}</Text>
          <TextInput
            style={styles.textInput}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textMuted}
            value={activityDate}
            onChangeText={setActivityDate}
          />
          <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
            {t('backdated_date_hint')} (YYYY-MM-DD)
          </Text>
        </View>

        {/* 5. Site Photo / Business Card Attachment */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('quick_log_photo_label')}</Text>
          {selectedPhotoUri ? (
            <View style={styles.photoPreviewBox}>
              <Image source={{ uri: selectedPhotoUri }} style={styles.photoPreviewImg} />
              <View style={styles.photoPreviewInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                  <Ionicons name="checkmark-circle-outline" size={15} color={colors.accentEmerald} style={{ marginRight: 4 }} />
                  <Text style={styles.photoPreviewTitle}>{t('quick_log_photo_attached')}</Text>
                </View>
                <Text style={styles.photoPreviewSub}>{t('quick_log_photo_sub')}</Text>
                <TouchableOpacity
                  style={styles.removePhotoBtn}
                  onPress={() => {
                    setSelectedPhotoUri(null);
                    setSelectedPhotoBase64(null);
                  }}
                >
                  <Ionicons name="close-outline" size={14} color="#991B1B" style={{ marginRight: 2 }} />
                  <Text style={styles.removePhotoBtnText}>{t('quick_log_photo_remove')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.photoPickActions}>
              <TouchableOpacity
                style={styles.photoPickBtn}
                onPress={handleTakePhoto}
                activeOpacity={0.8}
              >
                <Ionicons name="camera-outline" size={18} color={colors.ink} />
                <Text style={styles.photoPickBtnText}>{t('quick_log_photo_take')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.photoPickBtn}
                onPress={handlePickFromGallery}
                activeOpacity={0.8}
              >
                <Ionicons name="images-outline" size={18} color={colors.ink} />
                <Text style={styles.photoPickBtnText}>{t('quick_log_photo_gallery')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 6. Follow-up Timeline */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('quick_log_followup_label')}</Text>
          <View style={styles.pillRow}>
            {[
              { days: 1, label: t('quick_log_tomorrow') },
              { days: 3, label: t('quick_log_in_3_days') },
              { days: 7, label: t('quick_log_in_1_week') },
            ].map((opt) => (
              <TouchableOpacity
                key={opt.days}
                style={[
                  styles.followUpPill,
                  followUpDays === opt.days && styles.followUpPillActive,
                ]}
                onPress={() =>
                  setFollowUpDays(followUpDays === opt.days ? null : opt.days)
                }
              >
                <Text
                  style={[
                    styles.followUpPillText,
                    followUpDays === opt.days && styles.followUpPillTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.85}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.submitButtonText}>{t('quick_log_submit_button')}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  title: {
    ...type.heading,
    fontSize: 22,
    color: colors.ink,
  },
  subtitle: {
    ...type.body,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    ...type.caption,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: 8,
  },
  typeGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  typeButtonActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  typeIcon: {
    fontSize: 18,
    marginBottom: 4,
  },
  typeText: {
    ...type.caption,
    fontWeight: '600',
    color: colors.ink,
  },
  typeTextActive: {
    color: colors.white,
  },
  gpsBanner: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 14,
    marginBottom: 20,
  },
  gpsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  gpsTitle: {
    ...type.caption,
    fontWeight: '700',
    color: colors.ink,
  },
  retryGpsText: {
    ...type.caption,
    fontWeight: '600',
    color: colors.ink,
    textDecorationLine: 'underline',
  },
  gpsSubtext: {
    ...type.caption,
    color: colors.textMuted,
  },
  districtFoundBox: {
    marginTop: 4,
  },
  districtNameEn: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
  },
  districtNameAr: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  coordsText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },
  gpsErrorText: {
    ...type.caption,
    color: '#B91C1C',
    marginTop: 4,
  },
  entityTypeToggle: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  entityTypeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
  },
  entityTypeBtnActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  entityTypeText: {
    ...type.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  entityTypeTextActive: {
    color: colors.white,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  refreshText: {
    ...type.caption,
    fontWeight: '600',
    color: colors.ink,
  },
  selectedAccountBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: radius.button,
    padding: 12,
    marginBottom: 10,
  },
  selectedAccountLabel: {
    ...type.caption,
    color: '#15803D',
    fontWeight: '600',
  },
  selectedAccountName: {
    ...type.body,
    fontWeight: '700',
    color: colors.ink,
    marginTop: 2,
  },
  selectedAccountContact: {
    ...type.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  changeAccountBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  changeAccountText: {
    ...type.caption,
    fontWeight: '600',
    color: '#15803D',
  },
  emptyEntityBox: {
    padding: 18,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    marginTop: 4,
  },
  emptyEntityTitle: {
    ...type.body,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 4,
  },
  emptyEntitySubtext: {
    ...type.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  goToAccountsBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.button,
    backgroundColor: colors.ink,
  },
  goToAccountsText: {
    ...type.caption,
    fontWeight: '600',
    color: colors.white,
  },
  accountSearchInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.button,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.ink,
    backgroundColor: colors.white,
    marginBottom: 8,
  },
  accountCardsWrapper: {
    gap: 8,
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  accountCardActive: {
    borderColor: colors.ink,
    backgroundColor: '#F8FAFC',
  },
  accountCardName: {
    ...type.body,
    fontWeight: '600',
    color: colors.ink,
  },
  accountCardNameActive: {
    color: colors.ink,
  },
  accountCardContact: {
    ...type.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  accountCardContactActive: {
    color: colors.textSecondary,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  radioCircleSelected: {
    borderColor: colors.ink,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.ink,
  },
  textArea: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.button,
    padding: 12,
    fontSize: 14,
    color: colors.ink,
    backgroundColor: colors.white,
    textAlignVertical: 'top',
    minHeight: 90,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.button,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.ink,
    backgroundColor: colors.white,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  followUpPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  followUpPillActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  followUpPillText: {
    ...type.caption,
    color: colors.ink,
  },
  followUpPillTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  photoPickActions: {
    flexDirection: 'row',
    gap: 10,
  },
  photoPickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
    gap: 6,
  },
  photoPickBtnIcon: {
    fontSize: 16,
  },
  photoPickBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink,
  },
  photoPreviewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
    gap: 12,
  },
  photoPreviewImg: {
    width: 64,
    height: 64,
    borderRadius: radius.button,
    backgroundColor: colors.border,
  },
  photoPreviewInfo: {
    flex: 1,
  },
  photoPreviewTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  photoPreviewSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: 6,
  },
  removePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FEE2E2',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radius.pill,
  },
  removePhotoBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#991B1B',
  },
  submitButton: {
    backgroundColor: colors.ink,
    borderRadius: radius.button,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    ...type.cardTitle,
    color: colors.white,
    fontWeight: '600',
  },
});
