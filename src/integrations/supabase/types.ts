export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      academic_number_counters: {
        Row: {
          last_value: number
          prefix: string
          updated_at: string
        }
        Insert: {
          last_value?: number
          prefix: string
          updated_at?: string
        }
        Update: {
          last_value?: number
          prefix?: string
          updated_at?: string
        }
        Relationships: []
      }
      academics_settings: {
        Row: {
          created_at: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      admission_seasons: {
        Row: {
          academic_year: string
          closure_message: string | null
          created_at: string
          created_by: string | null
          ends_at: string
          id: string
          kind: string
          name_ar: string
          notes: string | null
          reservation_enabled: boolean
          starts_at: string
          status: string
          updated_at: string
        }
        Insert: {
          academic_year: string
          closure_message?: string | null
          created_at?: string
          created_by?: string | null
          ends_at?: string
          id?: string
          kind?: string
          name_ar: string
          notes?: string | null
          reservation_enabled?: boolean
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          academic_year?: string
          closure_message?: string | null
          created_at?: string
          created_by?: string | null
          ends_at?: string
          id?: string
          kind?: string
          name_ar?: string
          notes?: string | null
          reservation_enabled?: boolean
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      application_children: {
        Row: {
          allergies: string | null
          application_id: string
          birth_date: string | null
          birth_place: string | null
          blood_type: string | null
          classroom_id: string | null
          created_at: string
          gender: string | null
          id: string
          last_grade: string | null
          medical_conditions: string | null
          name_ar: string
          name_en: string | null
          national_id: string | null
          nationality: string | null
          photo_url: string | null
          preference_1_classroom_id: string | null
          preference_2_classroom_id: string | null
          preference_3_classroom_id: string | null
          previous_school: string | null
          special_needs: string | null
          stage_id: string | null
          updated_at: string
          vaccination_status: string | null
        }
        Insert: {
          allergies?: string | null
          application_id: string
          birth_date?: string | null
          birth_place?: string | null
          blood_type?: string | null
          classroom_id?: string | null
          created_at?: string
          gender?: string | null
          id?: string
          last_grade?: string | null
          medical_conditions?: string | null
          name_ar: string
          name_en?: string | null
          national_id?: string | null
          nationality?: string | null
          photo_url?: string | null
          preference_1_classroom_id?: string | null
          preference_2_classroom_id?: string | null
          preference_3_classroom_id?: string | null
          previous_school?: string | null
          special_needs?: string | null
          stage_id?: string | null
          updated_at?: string
          vaccination_status?: string | null
        }
        Update: {
          allergies?: string | null
          application_id?: string
          birth_date?: string | null
          birth_place?: string | null
          blood_type?: string | null
          classroom_id?: string | null
          created_at?: string
          gender?: string | null
          id?: string
          last_grade?: string | null
          medical_conditions?: string | null
          name_ar?: string
          name_en?: string | null
          national_id?: string | null
          nationality?: string | null
          photo_url?: string | null
          preference_1_classroom_id?: string | null
          preference_2_classroom_id?: string | null
          preference_3_classroom_id?: string | null
          previous_school?: string | null
          special_needs?: string | null
          stage_id?: string | null
          updated_at?: string
          vaccination_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "application_children_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_children_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_children_preference_1_classroom_id_fkey"
            columns: ["preference_1_classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_children_preference_2_classroom_id_fkey"
            columns: ["preference_2_classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_children_preference_3_classroom_id_fkey"
            columns: ["preference_3_classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_children_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
        ]
      }
      application_documents: {
        Row: {
          application_id: string
          child_index: number | null
          created_at: string
          document_type_slug: string
          file_name: string | null
          file_path: string
          file_size: number | null
          id: string
          note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          application_id: string
          child_index?: number | null
          created_at?: string
          document_type_slug: string
          file_name?: string | null
          file_path: string
          file_size?: number | null
          id?: string
          note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          application_id?: string
          child_index?: number | null
          created_at?: string
          document_type_slug?: string
          file_name?: string | null
          file_path?: string
          file_size?: number | null
          id?: string
          note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_documents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      application_events: {
        Row: {
          actor_id: string | null
          application_id: string
          body_ar: string | null
          created_at: string
          event_type: string
          id: string
          metadata: Json
          title_ar: string
        }
        Insert: {
          actor_id?: string | null
          application_id: string
          body_ar?: string | null
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          title_ar: string
        }
        Update: {
          actor_id?: string | null
          application_id?: string
          body_ar?: string | null
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          title_ar?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_events_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      application_notes: {
        Row: {
          application_id: string
          attachments: Json
          author_id: string
          body: string
          created_at: string
          id: string
          mentions: string[]
          updated_at: string
          visibility: string
        }
        Insert: {
          application_id: string
          attachments?: Json
          author_id: string
          body: string
          created_at?: string
          id?: string
          mentions?: string[]
          updated_at?: string
          visibility?: string
        }
        Update: {
          application_id?: string
          attachments?: Json
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          mentions?: string[]
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_notes_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      application_pins: {
        Row: {
          application_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          application_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          application_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_pins_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      application_services: {
        Row: {
          application_id: string
          created_at: string
          id: string
          price_at_selection: number
          service_id: string
        }
        Insert: {
          application_id: string
          created_at?: string
          id?: string
          price_at_selection?: number
          service_id: string
        }
        Update: {
          application_id?: string
          created_at?: string
          id?: string
          price_at_selection?: number
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_services_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          academic_year: string
          admission_fee: number
          application_number: string | null
          archived_at: string | null
          assigned_officer_id: string | null
          classroom_id: string | null
          correction_note: string | null
          correction_requested_at: string | null
          correction_sections: string[]
          created_at: string
          current_step: number
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          discount_total: number
          draft_data: Json
          grand_total: number
          id: string
          officer_recommendation: string | null
          parent_id: string
          parent_national_id: string | null
          parent_nationality: string | null
          parent_relationship: string | null
          parent_relationship_other: string | null
          payment_status: string
          priority: string
          review_note: string | null
          reviewed_at: string | null
          season_id: string | null
          seat_status: string
          services_total: number
          stage_id: string | null
          status: Database["public"]["Enums"]["application_status"]
          student_number: string | null
          submitted_at: string | null
          track_token: string
          tracking_number: string | null
          tuition_total: number
          updated_at: string
        }
        Insert: {
          academic_year?: string
          admission_fee?: number
          application_number?: string | null
          archived_at?: string | null
          assigned_officer_id?: string | null
          classroom_id?: string | null
          correction_note?: string | null
          correction_requested_at?: string | null
          correction_sections?: string[]
          created_at?: string
          current_step?: number
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          discount_total?: number
          draft_data?: Json
          grand_total?: number
          id?: string
          officer_recommendation?: string | null
          parent_id: string
          parent_national_id?: string | null
          parent_nationality?: string | null
          parent_relationship?: string | null
          parent_relationship_other?: string | null
          payment_status?: string
          priority?: string
          review_note?: string | null
          reviewed_at?: string | null
          season_id?: string | null
          seat_status?: string
          services_total?: number
          stage_id?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          student_number?: string | null
          submitted_at?: string | null
          track_token?: string
          tracking_number?: string | null
          tuition_total?: number
          updated_at?: string
        }
        Update: {
          academic_year?: string
          admission_fee?: number
          application_number?: string | null
          archived_at?: string | null
          assigned_officer_id?: string | null
          classroom_id?: string | null
          correction_note?: string | null
          correction_requested_at?: string | null
          correction_sections?: string[]
          created_at?: string
          current_step?: number
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          discount_total?: number
          draft_data?: Json
          grand_total?: number
          id?: string
          officer_recommendation?: string | null
          parent_id?: string
          parent_national_id?: string | null
          parent_nationality?: string | null
          parent_relationship?: string | null
          parent_relationship_other?: string | null
          payment_status?: string
          priority?: string
          review_note?: string | null
          reviewed_at?: string | null
          season_id?: string | null
          seat_status?: string
          services_total?: number
          stage_id?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          student_number?: string | null
          submitted_at?: string | null
          track_token?: string
          tracking_number?: string | null
          tuition_total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "admission_seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_evidences: {
        Row: {
          assessment_id: string
          created_at: string
          created_by: string
          external_url: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          file_type: string
          id: string
        }
        Insert: {
          assessment_id: string
          created_at?: string
          created_by: string
          external_url?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string
          id?: string
        }
        Update: {
          assessment_id?: string
          created_at?: string
          created_by?: string
          external_url?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_evidences_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "lesson_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          attendance_date: string
          child_id: string
          classroom_id: string | null
          created_at: string
          id: string
          note: string | null
          recorded_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attendance_date?: string
          child_id: string
          classroom_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          recorded_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attendance_date?: string
          child_id?: string
          classroom_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          recorded_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "application_children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          browser: string | null
          created_at: string
          device: string | null
          entity: string | null
          entity_id: string | null
          id: string
          ip_address: string | null
          metadata: Json
          success: boolean
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          browser?: string | null
          created_at?: string
          device?: string | null
          entity?: string | null
          entity_id?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          browser?: string | null
          created_at?: string
          device?: string | null
          entity?: string | null
          entity_id?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          account_holder: string
          account_number: string | null
          bank_name: string
          created_at: string
          iban: string | null
          id: string
          is_active: boolean
          is_default: boolean
          logo_url: string | null
          notes_ar: string | null
          org_name_ar: string
          school_name_ar: string
          updated_at: string
        }
        Insert: {
          account_holder?: string
          account_number?: string | null
          bank_name?: string
          created_at?: string
          iban?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          logo_url?: string | null
          notes_ar?: string | null
          org_name_ar?: string
          school_name_ar?: string
          updated_at?: string
        }
        Update: {
          account_holder?: string
          account_number?: string | null
          bank_name?: string
          created_at?: string
          iban?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          logo_url?: string | null
          notes_ar?: string | null
          org_name_ar?: string
          school_name_ar?: string
          updated_at?: string
        }
        Relationships: []
      }
      classroom_locks: {
        Row: {
          acquired_at: string
          classroom_id: string
          created_at: string
          expires_at: string
          updated_at: string
          user_id: string
          user_name: string | null
        }
        Insert: {
          acquired_at?: string
          classroom_id: string
          created_at?: string
          expires_at?: string
          updated_at?: string
          user_id: string
          user_name?: string | null
        }
        Update: {
          acquired_at?: string
          classroom_id?: string
          created_at?: string
          expires_at?: string
          updated_at?: string
          user_id?: string
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classroom_locks_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: true
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
        ]
      }
      classroom_messages: {
        Row: {
          attachments: Json
          body: string
          classroom_id: string
          created_at: string
          deleted_at: string | null
          id: string
          parent_message_id: string | null
          sender_id: string
          sender_name: string | null
          sender_role: string
          updated_at: string
        }
        Insert: {
          attachments?: Json
          body?: string
          classroom_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          parent_message_id?: string | null
          sender_id: string
          sender_name?: string | null
          sender_role?: string
          updated_at?: string
        }
        Update: {
          attachments?: Json
          body?: string
          classroom_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          parent_message_id?: string | null
          sender_id?: string
          sender_name?: string | null
          sender_role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classroom_messages_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classroom_messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "classroom_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      classrooms: {
        Row: {
          capacity: number
          chat_enabled: boolean
          color_hex: string
          color_label: string | null
          cover_image: string | null
          created_at: string
          daily_schedule: Json
          description_ar: string | null
          gallery: Json
          id: string
          is_active: boolean
          learning_style_ar: string | null
          max_age_months: number
          max_waiting: number
          min_age_months: number
          name_ar: string
          reports_visible_to_parents: boolean
          schedule_ar: string | null
          slug: string
          sort_order: number
          stage_id: string
          taken_seats: number
          teacher_experience: string | null
          teacher_name: string | null
          teacher_qualification: string | null
          teacher_title: string | null
          teachers: Json
          updated_at: string
        }
        Insert: {
          capacity?: number
          chat_enabled?: boolean
          color_hex?: string
          color_label?: string | null
          cover_image?: string | null
          created_at?: string
          daily_schedule?: Json
          description_ar?: string | null
          gallery?: Json
          id?: string
          is_active?: boolean
          learning_style_ar?: string | null
          max_age_months?: number
          max_waiting?: number
          min_age_months?: number
          name_ar: string
          reports_visible_to_parents?: boolean
          schedule_ar?: string | null
          slug: string
          sort_order?: number
          stage_id: string
          taken_seats?: number
          teacher_experience?: string | null
          teacher_name?: string | null
          teacher_qualification?: string | null
          teacher_title?: string | null
          teachers?: Json
          updated_at?: string
        }
        Update: {
          capacity?: number
          chat_enabled?: boolean
          color_hex?: string
          color_label?: string | null
          cover_image?: string | null
          created_at?: string
          daily_schedule?: Json
          description_ar?: string | null
          gallery?: Json
          id?: string
          is_active?: boolean
          learning_style_ar?: string | null
          max_age_months?: number
          max_waiting?: number
          min_age_months?: number
          name_ar?: string
          reports_visible_to_parents?: boolean
          schedule_ar?: string | null
          slug?: string
          sort_order?: number
          stage_id?: string
          taken_seats?: number
          teacher_experience?: string | null
          teacher_name?: string | null
          teacher_qualification?: string | null
          teacher_title?: string | null
          teachers?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classrooms_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          assigned_to: string | null
          created_at: string
          email: string | null
          handled_at: string | null
          handled_by: string | null
          id: string
          message: string
          name: string
          phone: string
          priority: string
          program: string | null
          staff_note: string | null
          status: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          email?: string | null
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          message: string
          name: string
          phone: string
          priority?: string
          program?: string | null
          staff_note?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          email?: string | null
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          message?: string
          name?: string
          phone?: string
          priority?: string
          program?: string | null
          staff_note?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      discount_rules: {
        Row: {
          condition: string
          created_at: string
          description_ar: string | null
          id: string
          is_active: boolean
          kind: string
          max_amount: number | null
          min_children: number
          name_ar: string
          sort_order: number
          updated_at: string
          value: number
        }
        Insert: {
          condition?: string
          created_at?: string
          description_ar?: string | null
          id?: string
          is_active?: boolean
          kind?: string
          max_amount?: number | null
          min_children?: number
          name_ar: string
          sort_order?: number
          updated_at?: string
          value?: number
        }
        Update: {
          condition?: string
          created_at?: string
          description_ar?: string | null
          id?: string
          is_active?: boolean
          kind?: string
          max_amount?: number | null
          min_children?: number
          name_ar?: string
          sort_order?: number
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      document_requests: {
        Row: {
          application_id: string
          child_index: number | null
          created_at: string
          document_type_slug: string
          fulfilled_at: string | null
          id: string
          note: string | null
          requested_by: string
          updated_at: string
        }
        Insert: {
          application_id: string
          child_index?: number | null
          created_at?: string
          document_type_slug: string
          fulfilled_at?: string | null
          id?: string
          note?: string | null
          requested_by: string
          updated_at?: string
        }
        Update: {
          application_id?: string
          child_index?: number | null
          created_at?: string
          document_type_slug?: string
          fulfilled_at?: string | null
          id?: string
          note?: string | null
          requested_by?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_requests_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      document_types: {
        Row: {
          applies_to_nationality: string
          applies_to_stage_slug: string | null
          created_at: string
          description_ar: string | null
          id: string
          is_active: boolean
          is_required: boolean
          name_ar: string
          requires_medical: boolean
          requires_service_slug: string | null
          scope: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          applies_to_nationality?: string
          applies_to_stage_slug?: string | null
          created_at?: string
          description_ar?: string | null
          id?: string
          is_active?: boolean
          is_required?: boolean
          name_ar: string
          requires_medical?: boolean
          requires_service_slug?: string | null
          scope?: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          applies_to_nationality?: string
          applies_to_stage_slug?: string | null
          created_at?: string
          description_ar?: string | null
          id?: string
          is_active?: boolean
          is_required?: boolean
          name_ar?: string
          requires_medical?: boolean
          requires_service_slug?: string | null
          scope?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      fee_plans: {
        Row: {
          academic_year: string
          admission_fee: number
          amount: number
          classroom_id: string | null
          created_at: string
          id: string
          is_active: boolean
          label_ar: string | null
          months_per_year: number
          stage_id: string | null
          terms_per_year: number
          unit: string
          updated_at: string
        }
        Insert: {
          academic_year?: string
          admission_fee?: number
          amount?: number
          classroom_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          label_ar?: string | null
          months_per_year?: number
          stage_id?: string | null
          terms_per_year?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          academic_year?: string
          admission_fee?: number
          amount?: number
          classroom_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          label_ar?: string | null
          months_per_year?: number
          stage_id?: string | null
          terms_per_year?: number
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_plans_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_plans_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_settings: {
        Row: {
          created_at: string
          id: string
          qurra_message_ar: string
          qurra_services_message_ar: string
          reminder_days_before: number
          updated_at: string
          whatsapp_template: string
        }
        Insert: {
          created_at?: string
          id?: string
          qurra_message_ar?: string
          qurra_services_message_ar?: string
          reminder_days_before?: number
          updated_at?: string
          whatsapp_template?: string
        }
        Update: {
          created_at?: string
          id?: string
          qurra_message_ar?: string
          qurra_services_message_ar?: string
          reminder_days_before?: number
          updated_at?: string
          whatsapp_template?: string
        }
        Relationships: []
      }
      form_fields: {
        Row: {
          applies_to: string
          created_at: string
          field_type: string
          help_ar: string | null
          id: string
          is_required: boolean
          is_system: boolean
          is_visible: boolean
          key: string
          label_ar: string
          options: Json
          placeholder_ar: string | null
          sort_order: number
          step_id: string
          updated_at: string
        }
        Insert: {
          applies_to?: string
          created_at?: string
          field_type?: string
          help_ar?: string | null
          id?: string
          is_required?: boolean
          is_system?: boolean
          is_visible?: boolean
          key: string
          label_ar: string
          options?: Json
          placeholder_ar?: string | null
          sort_order?: number
          step_id: string
          updated_at?: string
        }
        Update: {
          applies_to?: string
          created_at?: string
          field_type?: string
          help_ar?: string | null
          id?: string
          is_required?: boolean
          is_system?: boolean
          is_visible?: boolean
          key?: string
          label_ar?: string
          options?: Json
          placeholder_ar?: string | null
          sort_order?: number
          step_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_fields_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "form_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      form_steps: {
        Row: {
          created_at: string
          description_ar: string | null
          icon: string
          id: string
          is_active: boolean
          is_system: boolean
          key: string
          name_ar: string
          short_ar: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description_ar?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          is_system?: boolean
          key: string
          name_ar: string
          short_ar: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description_ar?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          is_system?: boolean
          key?: string
          name_ar?: string
          short_ar?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      inbox_events: {
        Row: {
          action: string
          actor_id: string
          actor_name: string | null
          created_at: string
          from_value: string | null
          id: string
          note: string | null
          subject_id: string
          subject_type: string
          to_value: string | null
        }
        Insert: {
          action: string
          actor_id: string
          actor_name?: string | null
          created_at?: string
          from_value?: string | null
          id?: string
          note?: string | null
          subject_id: string
          subject_type: string
          to_value?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          actor_name?: string | null
          created_at?: string
          from_value?: string | null
          id?: string
          note?: string | null
          subject_id?: string
          subject_type?: string
          to_value?: string | null
        }
        Relationships: []
      }
      installments: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          id: string
          invoice_id: string
          note: string | null
          paid_amount: number
          paid_at: string | null
          seq: number
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          due_date: string
          id?: string
          invoice_id: string
          note?: string | null
          paid_amount?: number
          paid_at?: string | null
          seq: number
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          id?: string
          invoice_id?: string
          note?: string | null
          paid_amount?: number
          paid_at?: string | null
          seq?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "installments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          kind: string
          label_ar: string
          qurra_covered: boolean
          service_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id: string
          kind: string
          label_ar: string
          qurra_covered?: boolean
          service_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          kind?: string
          label_ar?: string
          qurra_covered?: boolean
          service_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_messages: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          invoice_id: string
          is_staff: boolean
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          invoice_id: string
          is_staff?: boolean
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          invoice_id?: string
          is_staff?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_messages_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          academic_year: string
          admission_fee: number
          application_id: string
          created_at: string
          discount_total: number
          grand_total: number
          id: string
          installments_count: number
          note: string | null
          paid_total: number
          parent_id: string
          plan_type: string
          qurra_covered: boolean
          qurra_note: string | null
          services_total: number
          status: string
          tuition_total: number
          updated_at: string
        }
        Insert: {
          academic_year?: string
          admission_fee?: number
          application_id: string
          created_at?: string
          discount_total?: number
          grand_total?: number
          id?: string
          installments_count?: number
          note?: string | null
          paid_total?: number
          parent_id: string
          plan_type?: string
          qurra_covered?: boolean
          qurra_note?: string | null
          services_total?: number
          status?: string
          tuition_total?: number
          updated_at?: string
        }
        Update: {
          academic_year?: string
          admission_fee?: number
          application_id?: string
          created_at?: string
          discount_total?: number
          grand_total?: number
          id?: string
          installments_count?: number
          note?: string | null
          paid_total?: number
          parent_id?: string
          plan_type?: string
          qurra_covered?: boolean
          qurra_note?: string | null
          services_total?: number
          status?: string
          tuition_total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_assessments: {
        Row: {
          child_id: string
          classroom_id: string
          created_at: string
          created_by: string | null
          growth_colors: Json
          growth_level: number
          id: string
          lesson_id: string
          note_ar: string | null
          performance_colors: Json
          performance_level: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          child_id: string
          classroom_id: string
          created_at?: string
          created_by?: string | null
          growth_colors?: Json
          growth_level?: number
          id?: string
          lesson_id: string
          note_ar?: string | null
          performance_colors?: Json
          performance_level?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          child_id?: string
          classroom_id?: string
          created_at?: string
          created_by?: string | null
          growth_colors?: Json
          growth_level?: number
          id?: string
          lesson_id?: string
          note_ar?: string | null
          performance_colors?: Json
          performance_level?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_assessments_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "application_children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_assessments_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_assessments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          created_at: string
          created_by: string | null
          description_ar: string | null
          id: string
          is_active: boolean
          name_ar: string
          sort_order: number
          topic_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description_ar?: string | null
          id?: string
          is_active?: boolean
          name_ar: string
          sort_order?: number
          topic_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description_ar?: string | null
          id?: string
          is_active?: boolean
          name_ar?: string
          sort_order?: number
          topic_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          created_at: string
          id: string
          identifier: string
          ip_address: string | null
          success: boolean
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          identifier: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          identifier?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_id: string | null
          application_id: string | null
          body_ar: string | null
          created_at: string
          id: string
          kind: string
          link: string | null
          read_at: string | null
          severity: string
          title_ar: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          application_id?: string | null
          body_ar?: string | null
          created_at?: string
          id?: string
          kind: string
          link?: string | null
          read_at?: string | null
          severity?: string
          title_ar: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          application_id?: string | null
          body_ar?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          read_at?: string | null
          severity?: string
          title_ar?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          application_id: string
          child_id: string | null
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          parent_email: string | null
          parent_name: string | null
          parent_national_id: string | null
          parent_phone: string
          status: string
          token: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          application_id: string
          child_id?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          parent_email?: string | null
          parent_name?: string | null
          parent_national_id?: string | null
          parent_phone: string
          status?: string
          token: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          application_id?: string
          child_id?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          parent_email?: string | null
          parent_name?: string | null
          parent_national_id?: string | null
          parent_phone?: string
          status?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_invitations_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_invitations_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "application_children"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_plan_settings: {
        Row: {
          academic_year: string
          allow_full: boolean
          allowed_installments: number[]
          created_at: string
          down_payment_percent: number
          due_day: number
          first_due_offset_days: number
          full_discount_percent: number
          id: string
          late_after_days: number
          max_installments: number
          updated_at: string
        }
        Insert: {
          academic_year?: string
          allow_full?: boolean
          allowed_installments?: number[]
          created_at?: string
          down_payment_percent?: number
          due_day?: number
          first_due_offset_days?: number
          full_discount_percent?: number
          id?: string
          late_after_days?: number
          max_installments?: number
          updated_at?: string
        }
        Update: {
          academic_year?: string
          allow_full?: boolean
          allowed_installments?: number[]
          created_at?: string
          down_payment_percent?: number
          due_day?: number
          first_due_offset_days?: number
          full_discount_percent?: number
          id?: string
          late_after_days?: number
          max_installments?: number
          updated_at?: string
        }
        Relationships: []
      }
      payment_receipts: {
        Row: {
          amount: number
          created_at: string
          file_name: string | null
          file_path: string
          id: string
          installment_id: string | null
          invoice_id: string
          reference_no: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          transfer_date: string | null
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          amount?: number
          created_at?: string
          file_name?: string | null
          file_path: string
          id?: string
          installment_id?: string | null
          invoice_id: string
          reference_no?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          transfer_date?: string | null
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          amount?: number
          created_at?: string
          file_name?: string | null
          file_path?: string
          id?: string
          installment_id?: string | null
          invoice_id?: string
          reference_no?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          transfer_date?: string | null
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_receipts_installment_id_fkey"
            columns: ["installment_id"]
            isOneToOne: false
            referencedRelation: "installments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_receipts_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          action: string
          category: string
          created_at: string
          description_ar: string
          key: string
          module_name: string
          sort_order: number
          sub_module_name: string
        }
        Insert: {
          action?: string
          category?: string
          created_at?: string
          description_ar?: string
          key: string
          module_name?: string
          sort_order?: number
          sub_module_name?: string
        }
        Update: {
          action?: string
          category?: string
          created_at?: string
          description_ar?: string
          key?: string
          module_name?: string
          sort_order?: number
          sub_module_name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          last_login_at: string | null
          phone: string | null
          preferred_language: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          last_login_at?: string | null
          phone?: string | null
          preferred_language?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          last_login_at?: string | null
          phone?: string | null
          preferred_language?: string
          updated_at?: string
        }
        Relationships: []
      }
      promotion_rules: {
        Row: {
          created_at: string
          from_stage_id: string | null
          id: string
          is_active: boolean
          min_age_months: number
          notice_months: number
          sort_order: number
          to_stage_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          from_stage_id?: string | null
          id?: string
          is_active?: boolean
          min_age_months?: number
          notice_months?: number
          sort_order?: number
          to_stage_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          from_stage_id?: string | null
          id?: string
          is_active?: boolean
          min_age_months?: number
          notice_months?: number
          sort_order?: number
          to_stage_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotion_rules_from_stage_id_fkey"
            columns: ["from_stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_rules_to_stage_id_fkey"
            columns: ["to_stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
        ]
      }
      qurra_requests: {
        Row: {
          application_id: string
          created_at: string
          decided_at: string | null
          decision_note: string | null
          declaration_accepted: boolean
          id: string
          mother_employer: string | null
          mother_employment_status: string | null
          mother_job_title: string | null
          mother_national_id: string | null
          notes: string | null
          requested: boolean
          status: Database["public"]["Enums"]["qurra_status"]
          updated_at: string
        }
        Insert: {
          application_id: string
          created_at?: string
          decided_at?: string | null
          decision_note?: string | null
          declaration_accepted?: boolean
          id?: string
          mother_employer?: string | null
          mother_employment_status?: string | null
          mother_job_title?: string | null
          mother_national_id?: string | null
          notes?: string | null
          requested?: boolean
          status?: Database["public"]["Enums"]["qurra_status"]
          updated_at?: string
        }
        Update: {
          application_id?: string
          created_at?: string
          decided_at?: string | null
          decision_note?: string | null
          declaration_accepted?: boolean
          id?: string
          mother_employer?: string | null
          mother_employment_status?: string | null
          mother_job_title?: string | null
          mother_national_id?: string | null
          notes?: string | null
          requested?: boolean
          status?: Database["public"]["Enums"]["qurra_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "qurra_requests_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_events: {
        Row: {
          action: string
          actor_id: string | null
          actor_kind: string
          actor_name: string | null
          body_ar: string | null
          created_at: string
          id: string
          metadata: Json
          reservation_id: string
          title_ar: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_kind?: string
          actor_name?: string | null
          body_ar?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          reservation_id: string
          title_ar: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_kind?: string
          actor_name?: string | null
          body_ar?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          reservation_id?: string
          title_ar?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservation_events_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "seat_reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission_key: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          id?: string
          permission_key: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          id?: string
          permission_key?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["key"]
          },
        ]
      }
      seat_holds: {
        Row: {
          application_id: string
          classroom_id: string
          created_at: string
          expires_at: string
          id: string
          released_at: string | null
        }
        Insert: {
          application_id: string
          classroom_id: string
          created_at?: string
          expires_at?: string
          id?: string
          released_at?: string | null
        }
        Update: {
          application_id?: string
          classroom_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          released_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seat_holds_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_holds_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
        ]
      }
      seat_reservation_children: {
        Row: {
          assigned_classroom_id: string | null
          birth_date: string | null
          created_at: string
          gender: string | null
          id: string
          name_ar: string
          national_id: string | null
          preference_1_classroom_id: string | null
          preference_2_classroom_id: string | null
          preference_3_classroom_id: string | null
          reservation_id: string
          sort_order: number
          stage_id: string | null
          waitlisted: boolean
        }
        Insert: {
          assigned_classroom_id?: string | null
          birth_date?: string | null
          created_at?: string
          gender?: string | null
          id?: string
          name_ar: string
          national_id?: string | null
          preference_1_classroom_id?: string | null
          preference_2_classroom_id?: string | null
          preference_3_classroom_id?: string | null
          reservation_id: string
          sort_order?: number
          stage_id?: string | null
          waitlisted?: boolean
        }
        Update: {
          assigned_classroom_id?: string | null
          birth_date?: string | null
          created_at?: string
          gender?: string | null
          id?: string
          name_ar?: string
          national_id?: string | null
          preference_1_classroom_id?: string | null
          preference_2_classroom_id?: string | null
          preference_3_classroom_id?: string | null
          reservation_id?: string
          sort_order?: number
          stage_id?: string | null
          waitlisted?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "seat_reservation_children_assigned_classroom_id_fkey"
            columns: ["assigned_classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_reservation_children_preference_1_classroom_id_fkey"
            columns: ["preference_1_classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_reservation_children_preference_2_classroom_id_fkey"
            columns: ["preference_2_classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_reservation_children_preference_3_classroom_id_fkey"
            columns: ["preference_3_classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_reservation_children_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "seat_reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_reservation_children_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
        ]
      }
      seat_reservations: {
        Row: {
          academic_year: string
          application_id: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          id: string
          parent_id: string
          parent_name: string
          parent_national_id: string
          season_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          academic_year?: string
          application_id?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          id?: string
          parent_id?: string
          parent_name: string
          parent_national_id: string
          season_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          academic_year?: string
          application_id?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          id?: string
          parent_id?: string
          parent_name?: string
          parent_national_id?: string
          season_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seat_reservations_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_reservations_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "admission_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          category: Database["public"]["Enums"]["service_category"]
          created_at: string
          description_ar: string | null
          id: string
          is_active: boolean
          is_required: boolean
          name_ar: string
          price: number
          price_note: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["service_category"]
          created_at?: string
          description_ar?: string | null
          id?: string
          is_active?: boolean
          is_required?: boolean
          name_ar: string
          price?: number
          price_note?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["service_category"]
          created_at?: string
          description_ar?: string | null
          id?: string
          is_active?: boolean
          is_required?: boolean
          name_ar?: string
          price?: number
          price_note?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      site_content: {
        Row: {
          data: Json
          key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          data?: Json
          key: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          data?: Json
          key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      site_testimonials: {
        Row: {
          created_at: string
          id: string
          name: string
          quote: string
          rating: number
          reviewed_at: string | null
          reviewed_by: string | null
          role: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          quote: string
          rating?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          role?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          quote?: string
          rating?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          role?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      skill_evidences: {
        Row: {
          created_at: string
          created_by: string
          file_name: string | null
          file_path: string
          file_size: number | null
          file_type: string
          id: string
          tracking_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          file_name?: string | null
          file_path: string
          file_size?: number | null
          file_type: string
          id?: string
          tracking_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          file_name?: string | null
          file_path?: string
          file_size?: number | null
          file_type?: string
          id?: string
          tracking_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_evidences_tracking_id_fkey"
            columns: ["tracking_id"]
            isOneToOne: false
            referencedRelation: "student_skills_tracking"
            referencedColumns: ["id"]
          },
        ]
      }
      stages: {
        Row: {
          activities: Json
          admission_fee: number
          age_label: string
          created_at: string
          daily_schedule: Json
          facilities: Json
          faqs: Json
          gallery: Json
          hero_image: string | null
          id: string
          is_active: boolean
          learning_approach_ar: string | null
          max_age_months: number
          min_age_months: number
          name_ar: string
          name_en: string | null
          operating_hours: string | null
          outcomes: Json
          philosophy_ar: string | null
          slug: string
          sort_order: number
          tagline_ar: string | null
          taken_seats: number
          teacher_ratio: string | null
          teachers: Json
          tone: string
          total_seats: number
          tuition_from: number
          updated_at: string
        }
        Insert: {
          activities?: Json
          admission_fee?: number
          age_label: string
          created_at?: string
          daily_schedule?: Json
          facilities?: Json
          faqs?: Json
          gallery?: Json
          hero_image?: string | null
          id?: string
          is_active?: boolean
          learning_approach_ar?: string | null
          max_age_months?: number
          min_age_months?: number
          name_ar: string
          name_en?: string | null
          operating_hours?: string | null
          outcomes?: Json
          philosophy_ar?: string | null
          slug: string
          sort_order?: number
          tagline_ar?: string | null
          taken_seats?: number
          teacher_ratio?: string | null
          teachers?: Json
          tone?: string
          total_seats?: number
          tuition_from?: number
          updated_at?: string
        }
        Update: {
          activities?: Json
          admission_fee?: number
          age_label?: string
          created_at?: string
          daily_schedule?: Json
          facilities?: Json
          faqs?: Json
          gallery?: Json
          hero_image?: string | null
          id?: string
          is_active?: boolean
          learning_approach_ar?: string | null
          max_age_months?: number
          min_age_months?: number
          name_ar?: string
          name_en?: string | null
          operating_hours?: string | null
          outcomes?: Json
          philosophy_ar?: string | null
          slug?: string
          sort_order?: number
          tagline_ar?: string | null
          taken_seats?: number
          teacher_ratio?: string | null
          teachers?: Json
          tone?: string
          total_seats?: number
          tuition_from?: number
          updated_at?: string
        }
        Relationships: []
      }
      student_promotions: {
        Row: {
          age_months: number | null
          child_id: string
          classroom_id: string | null
          created_at: string
          decided_by: string | null
          from_stage_id: string | null
          id: string
          note: string | null
          status: string
          to_stage_id: string
        }
        Insert: {
          age_months?: number | null
          child_id: string
          classroom_id?: string | null
          created_at?: string
          decided_by?: string | null
          from_stage_id?: string | null
          id?: string
          note?: string | null
          status?: string
          to_stage_id: string
        }
        Update: {
          age_months?: number | null
          child_id?: string
          classroom_id?: string | null
          created_at?: string
          decided_by?: string | null
          from_stage_id?: string | null
          id?: string
          note?: string | null
          status?: string
          to_stage_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_promotions_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "application_children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_promotions_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_promotions_from_stage_id_fkey"
            columns: ["from_stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_promotions_to_stage_id_fkey"
            columns: ["to_stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
        ]
      }
      student_skills_tracking: {
        Row: {
          child_id: string
          classroom_id: string | null
          completion_percentage: number
          created_at: string
          created_by: string
          domain_ar: string | null
          id: string
          improvement_percentage: number
          note_ar: string | null
          observed_at: string
          skill_name: string
          updated_at: string
        }
        Insert: {
          child_id: string
          classroom_id?: string | null
          completion_percentage?: number
          created_at?: string
          created_by: string
          domain_ar?: string | null
          id?: string
          improvement_percentage?: number
          note_ar?: string | null
          observed_at?: string
          skill_name: string
          updated_at?: string
        }
        Update: {
          child_id?: string
          classroom_id?: string | null
          completion_percentage?: number
          created_at?: string
          created_by?: string
          domain_ar?: string | null
          id?: string
          improvement_percentage?: number
          note_ar?: string | null
          observed_at?: string
          skill_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_skills_tracking_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "application_children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_skills_tracking_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
        ]
      }
      study_plan_items: {
        Row: {
          color_hex: string
          created_at: string
          duration_minutes: number | null
          id: string
          lesson_id: string | null
          lesson_name_ar: string | null
          notes: string | null
          plan_id: string
          scheduled_date: string | null
          scheduled_day: number
          scheduled_time: string | null
          sort_order: number
          subject_name_ar: string | null
          updated_at: string
        }
        Insert: {
          color_hex?: string
          created_at?: string
          duration_minutes?: number | null
          id?: string
          lesson_id?: string | null
          lesson_name_ar?: string | null
          notes?: string | null
          plan_id: string
          scheduled_date?: string | null
          scheduled_day?: number
          scheduled_time?: string | null
          sort_order?: number
          subject_name_ar?: string | null
          updated_at?: string
        }
        Update: {
          color_hex?: string
          created_at?: string
          duration_minutes?: number | null
          id?: string
          lesson_id?: string | null
          lesson_name_ar?: string | null
          notes?: string | null
          plan_id?: string
          scheduled_date?: string | null
          scheduled_day?: number
          scheduled_time?: string | null
          sort_order?: number
          subject_name_ar?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_plan_items_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_plan_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "study_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      study_plans: {
        Row: {
          classroom_id: string
          created_at: string
          created_by: string | null
          end_date: string
          id: string
          notes: string | null
          plan_type: string
          published: boolean
          start_date: string
          title_ar: string | null
          updated_at: string
        }
        Insert: {
          classroom_id: string
          created_at?: string
          created_by?: string | null
          end_date: string
          id?: string
          notes?: string | null
          plan_type?: string
          published?: boolean
          start_date: string
          title_ar?: string | null
          updated_at?: string
        }
        Update: {
          classroom_id?: string
          created_at?: string
          created_by?: string | null
          end_date?: string
          id?: string
          notes?: string | null
          plan_type?: string
          published?: boolean
          start_date?: string
          title_ar?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_plans_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          classroom_id: string
          color_hex: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name_ar: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          classroom_id: string
          color_hex?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name_ar: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          classroom_id?: string
          color_hex?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name_ar?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_classrooms: {
        Row: {
          classroom_id: string
          created_at: string
          created_by: string | null
          id: string
          teacher_id: string
        }
        Insert: {
          classroom_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          teacher_id: string
        }
        Update: {
          classroom_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_classrooms_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name_ar: string
          sort_order: number
          subject_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name_ar: string
          sort_order?: number
          subject_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name_ar?: string
          sort_order?: number
          subject_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "topics_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          created_at: string
          created_by: string | null
          granted: boolean
          id: string
          permission_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          granted?: boolean
          id?: string
          permission_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          granted?: boolean
          id?: string
          permission_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["key"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          browser: string | null
          created_at: string
          device: string | null
          id: string
          ip_address: string | null
          last_seen_at: string
          remember_me: boolean
          revoked_at: string | null
          session_token_hash: string | null
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          browser?: string | null
          created_at?: string
          device?: string | null
          id?: string
          ip_address?: string | null
          last_seen_at?: string
          remember_me?: boolean
          revoked_at?: string | null
          session_token_hash?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          browser?: string | null
          created_at?: string
          device?: string | null
          id?: string
          ip_address?: string | null
          last_seen_at?: string
          remember_me?: boolean
          revoked_at?: string | null
          session_token_hash?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      waiting_list_entries: {
        Row: {
          application_id: string
          child_id: string | null
          classroom_id: string | null
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          position: number
          status: string
          updated_at: string
        }
        Insert: {
          application_id: string
          child_id?: string | null
          classroom_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          position?: number
          status?: string
          updated_at?: string
        }
        Update: {
          application_id?: string
          child_id?: string | null
          classroom_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          position?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "waiting_list_entries_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiting_list_entries_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "application_children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiting_list_entries_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_plans: {
        Row: {
          activities_ar: string | null
          classroom_id: string
          created_at: string
          created_by: string
          id: string
          lessons_ar: string | null
          notes_ar: string | null
          status: string
          subject_ar: string | null
          title_ar: string
          updated_at: string
          week_start_date: string
        }
        Insert: {
          activities_ar?: string | null
          classroom_id: string
          created_at?: string
          created_by: string
          id?: string
          lessons_ar?: string | null
          notes_ar?: string | null
          status?: string
          subject_ar?: string | null
          title_ar: string
          updated_at?: string
          week_start_date: string
        }
        Update: {
          activities_ar?: string | null
          classroom_id?: string
          created_at?: string
          created_by?: string
          id?: string
          lessons_ar?: string | null
          notes_ar?: string | null
          status?: string
          subject_ar?: string | null
          title_ar?: string
          updated_at?: string
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_plans_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      acquire_classroom_lock: {
        Args: { _classroom_id: string; _ttl_seconds?: number }
        Returns: {
          acquired: boolean
          acquired_at: string
          classroom_id: string
          expires_at: string
          user_id: string
          user_name: string
        }[]
      }
      active_admission_season: {
        Args: never
        Returns: {
          academic_year: string
          closure_message: string
          ends_at: string
          id: string
          kind: string
          name_ar: string
          reservation_enabled: boolean
          starts_at: string
        }[]
      }
      active_classroom_locks: {
        Args: never
        Returns: {
          acquired_at: string
          classroom_id: string
          expires_at: string
          user_id: string
          user_name: string
        }[]
      }
      admin_bulk_set_user_permissions: {
        Args: {
          _action: string
          _permission_keys: string[]
          _user_ids: string[]
        }
        Returns: number
      }
      admin_set_role_permission: {
        Args: {
          _granted: boolean
          _permission_key: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      admin_set_role_permissions_bulk: {
        Args: {
          _granted: boolean
          _permission_keys: string[]
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: number
      }
      admin_set_user_roles: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      assessment_classroom_id: {
        Args: { _assessment_id: string }
        Returns: string
      }
      can_read_classroom_curriculum: {
        Args: { _classroom_id: string; _user_id: string }
        Returns: boolean
      }
      can_read_tracking: {
        Args: { _tracking_id: string; _user_id: string }
        Returns: boolean
      }
      can_write_classroom_curriculum: {
        Args: { _classroom_id: string; _user_id: string }
        Returns: boolean
      }
      can_write_tracking: {
        Args: { _tracking_id: string; _user_id: string }
        Returns: boolean
      }
      child_classroom_id: { Args: { _child_id: string }; Returns: string }
      claim_child_by_identifier: {
        Args: { _identifier: string }
        Returns: {
          child_names: string[]
        }[]
      }
      claim_parent_invitation: {
        Args: { _token: string }
        Returns: {
          child_names: string[]
          linked: number
        }[]
      }
      classroom_enrolled_children: {
        Args: { _classroom_id: string }
        Returns: {
          gender: string
          id: string
          name_ar: string
          parent_id: string
          student_number: string
        }[]
      }
      dispatch_notification: {
        Args: {
          _application_id?: string
          _body_ar?: string
          _kind: string
          _link?: string
          _roles: Database["public"]["Enums"]["app_role"][]
          _severity?: string
          _title_ar: string
          _user_ids: string[]
        }
        Returns: number
      }
      duplicate_child_national_ids: {
        Args: {
          _academic_year: string
          _ids: string[]
          _ignore_application?: string
          _ignore_reservation?: string
        }
        Returns: {
          national_id: string
        }[]
      }
      has_permission: {
        Args: { _permission: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_child_parent: {
        Args: { _child_id: string; _user_id: string }
        Returns: boolean
      }
      is_classroom_teacher: {
        Args: { _classroom_id: string; _user_id: string }
        Returns: boolean
      }
      is_school_staff: { Args: { _user_id: string }; Returns: boolean }
      is_teacher: { Args: { _user_id: string }; Returns: boolean }
      is_teacher_of_child: {
        Args: { _child_id: string; _user_id: string }
        Returns: boolean
      }
      mark_notifications_read: { Args: { _ids: string[] }; Returns: number }
      my_permissions: {
        Args: never
        Returns: {
          permission_key: string
        }[]
      }
      next_academic_number: { Args: { _prefix: string }; Returns: string }
      normalize_phone: { Args: { _phone: string }; Returns: string }
      parent_has_child_in_classroom: {
        Args: { _classroom_id: string; _user_id: string }
        Returns: boolean
      }
      parent_invitation_preview: {
        Args: { _token: string }
        Returns: {
          child_name: string
          expired: boolean
          parent_name: string
          phone_tail: string
          siblings: number
          status: string
        }[]
      }
      recount_classroom_seats: { Args: never; Returns: undefined }
      recount_stage_seats: { Args: never; Returns: undefined }
      release_classroom_lock: {
        Args: { _classroom_id: string }
        Returns: boolean
      }
      release_my_classroom_locks: { Args: never; Returns: number }
      revoke_my_other_sessions: {
        Args: { _ip: string; _user_agent: string }
        Returns: number
      }
      study_plan_classroom_id: { Args: { _plan_id: string }; Returns: string }
      study_plan_published: { Args: { _plan_id: string }; Returns: boolean }
      subject_classroom_id: { Args: { _subject_id: string }; Returns: string }
      submit_site_testimonial: {
        Args: { _name: string; _quote: string; _rating: number; _role: string }
        Returns: string
      }
      topic_classroom_id: { Args: { _topic_id: string }; Returns: string }
      track_application_documents_public: {
        Args: { _application_number: string; _token: string }
        Returns: {
          document_name_ar: string
          id: string
          note: string
          requested_at: string
        }[]
      }
      track_application_events_public: {
        Args: { _application_number: string; _token: string }
        Returns: {
          created_at: string
          event_type: string
          id: string
          title_ar: string
        }[]
      }
      track_application_public: {
        Args: { _application_number: string; _token: string }
        Returns: {
          academic_year: string
          application_number: string
          id: string
          needs_action: boolean
          open_document_requests: number
          status: Database["public"]["Enums"]["application_status"]
          student_initial: string
          submitted_at: string
          updated_at: string
        }[]
      }
      withdraw_my_application: {
        Args: { _application_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "parent"
        | "registration_officer"
        | "accountant"
        | "principal"
        | "supervisor"
        | "admin"
        | "teacher"
      application_status:
        | "draft"
        | "submitted"
        | "under_review"
        | "needs_action"
        | "approved"
        | "rejected"
        | "withdrawn"
        | "principal_review"
        | "waitlisted"
      qurra_status:
        | "eligible"
        | "waiting_school_review"
        | "submitted_to_qurra"
        | "waiting_response"
        | "approved"
        | "rejected"
        | "not_requested"
      service_category:
        | "transportation"
        | "uniform"
        | "books"
        | "meals"
        | "activities"
        | "other"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "parent",
        "registration_officer",
        "accountant",
        "principal",
        "supervisor",
        "admin",
        "teacher",
      ],
      application_status: [
        "draft",
        "submitted",
        "under_review",
        "needs_action",
        "approved",
        "rejected",
        "withdrawn",
        "principal_review",
        "waitlisted",
      ],
      qurra_status: [
        "eligible",
        "waiting_school_review",
        "submitted_to_qurra",
        "waiting_response",
        "approved",
        "rejected",
        "not_requested",
      ],
      service_category: [
        "transportation",
        "uniform",
        "books",
        "meals",
        "activities",
        "other",
      ],
    },
  },
} as const
