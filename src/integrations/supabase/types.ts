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
            foreignKeyName: "applications_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
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
      classrooms: {
        Row: {
          capacity: number
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
          created_at: string
          email: string | null
          id: string
          message: string
          name: string
          phone: string
          program: string | null
          subject: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          message: string
          name: string
          phone: string
          program?: string | null
          subject?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          message?: string
          name?: string
          phone?: string
          program?: string | null
          subject?: string | null
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
          category: string
          created_at: string
          description_ar: string
          key: string
        }
        Insert: {
          category?: string
          created_at?: string
          description_ar?: string
          key: string
        }
        Update: {
          category?: string
          created_at?: string
          description_ar?: string
          key?: string
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
      admin_set_user_roles: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
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
      is_school_staff: { Args: { _user_id: string }; Returns: boolean }
      mark_notifications_read: { Args: { _ids: string[] }; Returns: number }
      my_permissions: {
        Args: never
        Returns: {
          permission_key: string
        }[]
      }
      release_classroom_lock: {
        Args: { _classroom_id: string }
        Returns: boolean
      }
      release_my_classroom_locks: { Args: never; Returns: number }
      revoke_my_other_sessions: {
        Args: { _ip: string; _user_agent: string }
        Returns: number
      }
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
