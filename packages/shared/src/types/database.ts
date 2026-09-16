export type UserRole = 'admin' | 'supervisor' | 'employee';
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'negotiation' | 'won' | 'lost';
export type ActivityType = 'visit' | 'email' | 'call' | 'meeting' | 'other';
export type RelatedEntity = 'lead' | 'customer';

export interface Profile {
  id: string; // uuid references auth.users(id)
  full_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  is_active: boolean;
  expo_push_token?: string | null;
  created_at: string;
}

export interface District {
  id: number;
  city: string;
  name_en: string;
  name_ar: string;
  latitude: number;
  longitude: number;
}

export interface Lead {
  id: string;
  company_name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  source: string | null;
  status: LeadStatus;
  estimated_value: number | null;
  project_type: string | null;
  district_id: number | null;
  assigned_to: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  company_name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  district_id: number | null;
  converted_from_lead_id: string | null;
  assigned_to: string | null;
  customer_since: string;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: string;
  employee_id: string;
  related_entity_type: RelatedEntity;
  related_entity_id: string;
  activity_type: ActivityType;
  description: string | null;
  activity_date: string;
  latitude: number | null;
  longitude: number | null;
  attachment_url: string | null;
  follow_up_date: string | null;
  outcome: string | null;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at'> & { created_at?: string };
        Update: Partial<Profile>;
      };
      districts: {
        Row: District;
        Insert: Omit<District, 'id'> & { id?: number };
        Update: Partial<District>;
      };
      leads: {
        Row: Lead;
        Insert: Omit<Lead, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Lead>;
      };
      customers: {
        Row: Customer;
        Insert: Omit<Customer, 'id' | 'created_at' | 'updated_at' | 'customer_since'> & {
          id?: string;
          customer_since?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Customer>;
      };
      activities: {
        Row: Activity;
        Insert: Omit<Activity, 'id' | 'created_at' | 'activity_date'> & {
          id?: string;
          activity_date?: string;
          created_at?: string;
        };
        Update: Partial<Activity>;
      };
    };
    Functions: {
      nearest_district: {
        Args: { lat: number; lng: number; p_city?: string };
        Returns: number;
      };
      is_admin: {
        Args: { user_id?: string };
        Returns: boolean;
      };
    };
    Enums: {
      user_role: UserRole;
      lead_status: LeadStatus;
      activity_type: ActivityType;
      related_entity: RelatedEntity;
    };
  };
}
