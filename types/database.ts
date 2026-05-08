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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      rs_account_current_items: {
        Row: {
          ac_id: string
          amount_original: number
          amount_settlement_currency: number
          currency_code: string
          description: string | null
          direction: string
          exchange_rate: number | null
          snapshot_date: string
          transaction_type: string
          tx_id: string
        }
        Insert: {
          ac_id: string
          amount_original: number
          amount_settlement_currency: number
          currency_code: string
          description?: string | null
          direction: string
          exchange_rate?: number | null
          snapshot_date?: string
          transaction_type: string
          tx_id: string
        }
        Update: {
          ac_id?: string
          amount_original?: number
          amount_settlement_currency?: number
          currency_code?: string
          description?: string | null
          direction?: string
          exchange_rate?: number | null
          snapshot_date?: string
          transaction_type?: string
          tx_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rs_account_current_items_ac_id_fkey"
            columns: ["ac_id"]
            isOneToOne: false
            referencedRelation: "rs_account_currents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rs_account_current_items_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "rs_currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "rs_account_current_items_tx_id_fkey"
            columns: ["tx_id"]
            isOneToOne: false
            referencedRelation: "rs_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      rs_account_currents: {
        Row: {
          ac_no: string
          acknowledged_at: string | null
          acknowledged_by: string | null
          approved_at: string | null
          approved_by: string | null
          balance_bf: number
          contract_id: string
          counterparty_id: string
          created_at: string
          created_by: string | null
          currency_code: string
          direction: string
          due_date: string | null
          id: string
          issued_at: string | null
          issued_by: string | null
          net_balance: number
          notes: string | null
          period_from: string
          period_to: string
          period_type: string
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_email: string | null
          reviewer_name: string | null
          status: string
          subtotal_commission: number
          subtotal_loss: number
          subtotal_other: number
          subtotal_premium: number
          updated_at: string
        }
        Insert: {
          ac_no: string
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          approved_at?: string | null
          approved_by?: string | null
          balance_bf?: number
          contract_id: string
          counterparty_id: string
          created_at?: string
          created_by?: string | null
          currency_code: string
          direction: string
          due_date?: string | null
          id?: string
          issued_at?: string | null
          issued_by?: string | null
          net_balance?: number
          notes?: string | null
          period_from: string
          period_to: string
          period_type: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_email?: string | null
          reviewer_name?: string | null
          status?: string
          subtotal_commission?: number
          subtotal_loss?: number
          subtotal_other?: number
          subtotal_premium?: number
          updated_at?: string
        }
        Update: {
          ac_no?: string
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          approved_at?: string | null
          approved_by?: string | null
          balance_bf?: number
          contract_id?: string
          counterparty_id?: string
          created_at?: string
          created_by?: string | null
          currency_code?: string
          direction?: string
          due_date?: string | null
          id?: string
          issued_at?: string | null
          issued_by?: string | null
          net_balance?: number
          notes?: string | null
          period_from?: string
          period_to?: string
          period_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_email?: string | null
          reviewer_name?: string | null
          status?: string
          subtotal_commission?: number
          subtotal_loss?: number
          subtotal_other?: number
          subtotal_premium?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rs_account_currents_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "rs_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rs_account_currents_counterparty_id_fkey"
            columns: ["counterparty_id"]
            isOneToOne: false
            referencedRelation: "rs_counterparties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rs_account_currents_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "rs_currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      rs_contract_settlement_schedules: {
        Row: {
          contract_id: string
          created_at: string
          created_by: string | null
          currency_code: string | null
          expected_amount: number | null
          id: string
          notes: string | null
          period_from: string
          period_label: string
          period_to: string
          schedule_type: string
          status: string
          updated_at: string
        }
        Insert: {
          contract_id: string
          created_at?: string
          created_by?: string | null
          currency_code?: string | null
          expected_amount?: number | null
          id?: string
          notes?: string | null
          period_from: string
          period_label: string
          period_to: string
          schedule_type: string
          status?: string
          updated_at?: string
        }
        Update: {
          contract_id?: string
          created_at?: string
          created_by?: string | null
          currency_code?: string | null
          expected_amount?: number | null
          id?: string
          notes?: string | null
          period_from?: string
          period_label?: string
          period_to?: string
          schedule_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rs_contract_settlement_schedules_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "rs_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rs_contract_settlement_schedules_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "rs_currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      rs_contract_shares: {
        Row: {
          contract_id: string
          created_at: string
          effective_from: string
          effective_to: string | null
          id: string
          order_of_priority: number
          reinsurer_id: string
          signed_line: number
        }
        Insert: {
          contract_id: string
          created_at?: string
          effective_from: string
          effective_to?: string | null
          id?: string
          order_of_priority?: number
          reinsurer_id: string
          signed_line: number
        }
        Update: {
          contract_id?: string
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          order_of_priority?: number
          reinsurer_id?: string
          signed_line?: number
        }
        Relationships: [
          {
            foreignKeyName: "rs_contract_shares_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "rs_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rs_contract_shares_reinsurer_id_fkey"
            columns: ["reinsurer_id"]
            isOneToOne: false
            referencedRelation: "rs_counterparties"
            referencedColumns: ["id"]
          },
        ]
      }
      rs_contracts: {
        Row: {
          broker_id: string | null
          brokerage_rate: number | null
          cash_loss_threshold: number | null
          cedant_id: string
          ceding_commission_rate: number | null
          class_of_business: string
          commission_settlement_period: string | null
          confirmation_due_days: number | null
          contract_no: string
          contract_type: string
          created_at: string
          created_by: string | null
          description: string | null
          expiry_date: string | null
          id: string
          inception_date: string
          interest_rate: number | null
          loss_reserve_rate: number | null
          loss_settlement_period: string | null
          offset_allowed: boolean
          payment_due_days: number | null
          premium_reserve_rate: number | null
          premium_settlement_period: string | null
          profit_commission_rate: number | null
          reserve_release_timing: string | null
          settlement_currency: string
          settlement_period: string
          status: string
          treaty_type: string | null
          underwriting_basis: string | null
          updated_at: string
          verifier_user_id: string | null
        }
        Insert: {
          broker_id?: string | null
          brokerage_rate?: number | null
          cash_loss_threshold?: number | null
          cedant_id: string
          ceding_commission_rate?: number | null
          class_of_business: string
          commission_settlement_period?: string | null
          confirmation_due_days?: number | null
          contract_no: string
          contract_type: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expiry_date?: string | null
          id?: string
          inception_date: string
          interest_rate?: number | null
          loss_reserve_rate?: number | null
          loss_settlement_period?: string | null
          offset_allowed?: boolean
          payment_due_days?: number | null
          premium_reserve_rate?: number | null
          premium_settlement_period?: string | null
          profit_commission_rate?: number | null
          reserve_release_timing?: string | null
          settlement_currency: string
          settlement_period: string
          status?: string
          treaty_type?: string | null
          underwriting_basis?: string | null
          updated_at?: string
          verifier_user_id?: string | null
        }
        Update: {
          broker_id?: string | null
          brokerage_rate?: number | null
          cash_loss_threshold?: number | null
          cedant_id?: string
          ceding_commission_rate?: number | null
          class_of_business?: string
          commission_settlement_period?: string | null
          confirmation_due_days?: number | null
          contract_no?: string
          contract_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expiry_date?: string | null
          id?: string
          inception_date?: string
          interest_rate?: number | null
          loss_reserve_rate?: number | null
          loss_settlement_period?: string | null
          offset_allowed?: boolean
          payment_due_days?: number | null
          premium_reserve_rate?: number | null
          premium_settlement_period?: string | null
          profit_commission_rate?: number | null
          reserve_release_timing?: string | null
          settlement_currency?: string
          settlement_period?: string
          status?: string
          treaty_type?: string | null
          underwriting_basis?: string | null
          updated_at?: string
          verifier_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rs_contracts_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "rs_counterparties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rs_contracts_cedant_id_fkey"
            columns: ["cedant_id"]
            isOneToOne: false
            referencedRelation: "rs_counterparties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rs_contracts_settlement_currency_fkey"
            columns: ["settlement_currency"]
            isOneToOne: false
            referencedRelation: "rs_currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      rs_counterparties: {
        Row: {
          company_code: string
          company_name_en: string
          company_name_ko: string
          company_type: string
          contact_email: string | null
          country_code: string | null
          created_at: string
          default_currency: string | null
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          company_code: string
          company_name_en: string
          company_name_ko: string
          company_type: string
          contact_email?: string | null
          country_code?: string | null
          created_at?: string
          default_currency?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          company_code?: string
          company_name_en?: string
          company_name_ko?: string
          company_type?: string
          contact_email?: string | null
          country_code?: string | null
          created_at?: string
          default_currency?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rs_counterparties_default_currency_fkey"
            columns: ["default_currency"]
            isOneToOne: false
            referencedRelation: "rs_currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      rs_currencies: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          decimal_digits: number
          display_order: number
          is_active: boolean
          is_base: boolean
          name_en: string
          name_ko: string
          symbol: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          decimal_digits?: number
          display_order?: number
          is_active?: boolean
          is_base?: boolean
          name_en: string
          name_ko: string
          symbol: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          decimal_digits?: number
          display_order?: number
          is_active?: boolean
          is_base?: boolean
          name_en?: string
          name_ko?: string
          symbol?: string
        }
        Relationships: []
      }
      rs_exchange_rates: {
        Row: {
          created_at: string
          created_by: string | null
          from_currency: string
          id: string
          notes: string | null
          rate: number
          rate_date: string
          rate_type: string
          source: string | null
          to_currency: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          from_currency: string
          id?: string
          notes?: string | null
          rate: number
          rate_date: string
          rate_type: string
          source?: string | null
          to_currency?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          from_currency?: string
          id?: string
          notes?: string | null
          rate?: number
          rate_date?: string
          rate_type?: string
          source?: string | null
          to_currency?: string
        }
        Relationships: [
          {
            foreignKeyName: "rs_exchange_rates_from_currency_fkey"
            columns: ["from_currency"]
            isOneToOne: false
            referencedRelation: "rs_currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      rs_loss_bordereau: {
        Row: {
          cession_pct: number
          claim_no: string
          confirmed_at: string | null
          confirmed_by: string | null
          confirmer_email: string | null
          confirmer_name: string | null
          contract_id: string
          created_at: string
          created_by: string | null
          currency: string
          id: string
          is_cash_loss: boolean
          loss_date: string
          loss_status: string
          os_reserve: number
          paid_amount: number
          period_yyyyqn: string
          premium_bordereau_id: string | null
          recoverable_amount: number
          report_date: string | null
          review_notes: string | null
          review_status: string | null
          settlement_schedule_id: string | null
          transaction_id: string | null
          updated_at: string
          validation_messages: Json | null
          validation_status: string
          verified_at: string | null
          verified_by: string | null
          verifier_email: string | null
          verifier_name: string | null
        }
        Insert: {
          cession_pct: number
          claim_no: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          confirmer_email?: string | null
          confirmer_name?: string | null
          contract_id: string
          created_at?: string
          created_by?: string | null
          currency: string
          id?: string
          is_cash_loss?: boolean
          loss_date: string
          loss_status?: string
          os_reserve?: number
          paid_amount?: number
          period_yyyyqn: string
          premium_bordereau_id?: string | null
          recoverable_amount?: number
          report_date?: string | null
          review_notes?: string | null
          review_status?: string | null
          settlement_schedule_id?: string | null
          transaction_id?: string | null
          updated_at?: string
          validation_messages?: Json | null
          validation_status?: string
          verified_at?: string | null
          verified_by?: string | null
          verifier_email?: string | null
          verifier_name?: string | null
        }
        Update: {
          cession_pct?: number
          claim_no?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          confirmer_email?: string | null
          confirmer_name?: string | null
          contract_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          is_cash_loss?: boolean
          loss_date?: string
          loss_status?: string
          os_reserve?: number
          paid_amount?: number
          period_yyyyqn?: string
          premium_bordereau_id?: string | null
          recoverable_amount?: number
          report_date?: string | null
          review_notes?: string | null
          review_status?: string | null
          settlement_schedule_id?: string | null
          transaction_id?: string | null
          updated_at?: string
          validation_messages?: Json | null
          validation_status?: string
          verified_at?: string | null
          verified_by?: string | null
          verifier_email?: string | null
          verifier_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rs_loss_bordereau_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "rs_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rs_loss_bordereau_currency_fkey"
            columns: ["currency"]
            isOneToOne: false
            referencedRelation: "rs_currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "rs_loss_bordereau_premium_bordereau_id_fkey"
            columns: ["premium_bordereau_id"]
            isOneToOne: false
            referencedRelation: "rs_premium_bordereau"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rs_loss_bordereau_settlement_schedule_id_fkey"
            columns: ["settlement_schedule_id"]
            isOneToOne: false
            referencedRelation: "rs_contract_settlement_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rs_loss_bordereau_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "rs_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      rs_loss_claim_transactions: {
        Row: {
          claim_id: string
          created_at: string
          notes: string | null
          role: string
          transaction_id: string
        }
        Insert: {
          claim_id: string
          created_at?: string
          notes?: string | null
          role: string
          transaction_id: string
        }
        Update: {
          claim_id?: string
          created_at?: string
          notes?: string | null
          role?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rs_loss_claim_transactions_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "rs_loss_claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rs_loss_claim_transactions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "rs_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      rs_loss_claims: {
        Row: {
          cedant_id: string
          claim_no: string | null
          collected_amount: number
          contract_id: string
          created_at: string
          created_by: string | null
          currency_code: string
          description: string | null
          id: string
          loss_event_date: string
          loss_reference: string | null
          paid_amount: number
          reported_date: string | null
          status: string
          total_claimed_amount: number
          updated_at: string
        }
        Insert: {
          cedant_id: string
          claim_no?: string | null
          collected_amount?: number
          contract_id: string
          created_at?: string
          created_by?: string | null
          currency_code: string
          description?: string | null
          id?: string
          loss_event_date: string
          loss_reference?: string | null
          paid_amount?: number
          reported_date?: string | null
          status?: string
          total_claimed_amount: number
          updated_at?: string
        }
        Update: {
          cedant_id?: string
          claim_no?: string | null
          collected_amount?: number
          contract_id?: string
          created_at?: string
          created_by?: string | null
          currency_code?: string
          description?: string | null
          id?: string
          loss_event_date?: string
          loss_reference?: string | null
          paid_amount?: number
          reported_date?: string | null
          status?: string
          total_claimed_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rs_loss_claims_cedant_id_fkey"
            columns: ["cedant_id"]
            isOneToOne: false
            referencedRelation: "rs_counterparties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rs_loss_claims_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "rs_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rs_loss_claims_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "rs_currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      rs_premium_bordereau: {
        Row: {
          ceded_premium: number
          cession_pct: number
          confirmed_at: string | null
          confirmed_by: string | null
          confirmer_email: string | null
          confirmer_name: string | null
          contract_id: string
          created_at: string
          created_by: string | null
          currency: string
          entry_type: string
          id: string
          insured_name: string | null
          original_premium: number
          period_yyyyqn: string
          policy_no: string
          review_notes: string | null
          review_status: string | null
          risk_period_from: string
          risk_period_to: string
          settlement_schedule_id: string | null
          sum_insured: number
          transaction_id: string | null
          updated_at: string
          validation_messages: Json | null
          validation_status: string
          verified_at: string | null
          verified_by: string | null
          verifier_email: string | null
          verifier_name: string | null
        }
        Insert: {
          ceded_premium: number
          cession_pct: number
          confirmed_at?: string | null
          confirmed_by?: string | null
          confirmer_email?: string | null
          confirmer_name?: string | null
          contract_id: string
          created_at?: string
          created_by?: string | null
          currency: string
          entry_type?: string
          id?: string
          insured_name?: string | null
          original_premium: number
          period_yyyyqn: string
          policy_no: string
          review_notes?: string | null
          review_status?: string | null
          risk_period_from: string
          risk_period_to: string
          settlement_schedule_id?: string | null
          sum_insured: number
          transaction_id?: string | null
          updated_at?: string
          validation_messages?: Json | null
          validation_status?: string
          verified_at?: string | null
          verified_by?: string | null
          verifier_email?: string | null
          verifier_name?: string | null
        }
        Update: {
          ceded_premium?: number
          cession_pct?: number
          confirmed_at?: string | null
          confirmed_by?: string | null
          confirmer_email?: string | null
          confirmer_name?: string | null
          contract_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          entry_type?: string
          id?: string
          insured_name?: string | null
          original_premium?: number
          period_yyyyqn?: string
          policy_no?: string
          review_notes?: string | null
          review_status?: string | null
          risk_period_from?: string
          risk_period_to?: string
          settlement_schedule_id?: string | null
          sum_insured?: number
          transaction_id?: string | null
          updated_at?: string
          validation_messages?: Json | null
          validation_status?: string
          verified_at?: string | null
          verified_by?: string | null
          verifier_email?: string | null
          verifier_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rs_premium_bordereau_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "rs_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rs_premium_bordereau_currency_fkey"
            columns: ["currency"]
            isOneToOne: false
            referencedRelation: "rs_currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "rs_premium_bordereau_settlement_schedule_id_fkey"
            columns: ["settlement_schedule_id"]
            isOneToOne: false
            referencedRelation: "rs_contract_settlement_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rs_premium_bordereau_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "rs_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      rs_reconciliation_items: {
        Row: {
          broker_amount: number
          contract_id: string
          counterparty_claimed_amount: number | null
          counterparty_id: string
          created_at: string
          created_by: string | null
          difference: number | null
          id: string
          notes: string | null
          period_from: string
          period_to: string
          status: string
          transaction_type: string
          tx_id: string | null
        }
        Insert: {
          broker_amount: number
          contract_id: string
          counterparty_claimed_amount?: number | null
          counterparty_id: string
          created_at?: string
          created_by?: string | null
          difference?: number | null
          id?: string
          notes?: string | null
          period_from: string
          period_to: string
          status?: string
          transaction_type: string
          tx_id?: string | null
        }
        Update: {
          broker_amount?: number
          contract_id?: string
          counterparty_claimed_amount?: number | null
          counterparty_id?: string
          created_at?: string
          created_by?: string | null
          difference?: number | null
          id?: string
          notes?: string | null
          period_from?: string
          period_to?: string
          status?: string
          transaction_type?: string
          tx_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rs_reconciliation_items_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "rs_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rs_reconciliation_items_counterparty_id_fkey"
            columns: ["counterparty_id"]
            isOneToOne: false
            referencedRelation: "rs_counterparties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rs_reconciliation_items_tx_id_fkey"
            columns: ["tx_id"]
            isOneToOne: false
            referencedRelation: "rs_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      rs_settlement_matches: {
        Row: {
          account_current_id: string
          currency_code: string
          id: string
          matched_amount: number
          matched_at: string
          matched_by: string | null
          notes: string | null
          settlement_id: string
        }
        Insert: {
          account_current_id: string
          currency_code: string
          id?: string
          matched_amount: number
          matched_at?: string
          matched_by?: string | null
          notes?: string | null
          settlement_id: string
        }
        Update: {
          account_current_id?: string
          currency_code?: string
          id?: string
          matched_amount?: number
          matched_at?: string
          matched_by?: string | null
          notes?: string | null
          settlement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rs_settlement_matches_account_current_id_fkey"
            columns: ["account_current_id"]
            isOneToOne: false
            referencedRelation: "rs_account_currents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rs_settlement_matches_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "rs_currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "rs_settlement_matches_settlement_id_fkey"
            columns: ["settlement_id"]
            isOneToOne: false
            referencedRelation: "rs_settlements"
            referencedColumns: ["id"]
          },
        ]
      }
      rs_settlements: {
        Row: {
          amount: number
          amount_krw: number | null
          bank_reference: string | null
          counterparty_id: string
          created_at: string
          created_by: string | null
          currency_code: string
          exchange_rate: number | null
          id: string
          match_status: string
          matched_amount: number
          notes: string | null
          remit_status: string
          remitted_at: string | null
          remitted_by: string | null
          remitter_email: string | null
          remitter_name: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_email: string | null
          reviewer_name: string | null
          settlement_date: string
          settlement_no: string
          settlement_type: string
        }
        Insert: {
          amount: number
          amount_krw?: number | null
          bank_reference?: string | null
          counterparty_id: string
          created_at?: string
          created_by?: string | null
          currency_code: string
          exchange_rate?: number | null
          id?: string
          match_status?: string
          matched_amount?: number
          notes?: string | null
          remit_status?: string
          remitted_at?: string | null
          remitted_by?: string | null
          remitter_email?: string | null
          remitter_name?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_email?: string | null
          reviewer_name?: string | null
          settlement_date: string
          settlement_no: string
          settlement_type: string
        }
        Update: {
          amount?: number
          amount_krw?: number | null
          bank_reference?: string | null
          counterparty_id?: string
          created_at?: string
          created_by?: string | null
          currency_code?: string
          exchange_rate?: number | null
          id?: string
          match_status?: string
          matched_amount?: number
          notes?: string | null
          remit_status?: string
          remitted_at?: string | null
          remitted_by?: string | null
          remitter_email?: string | null
          remitter_name?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_email?: string | null
          reviewer_name?: string | null
          settlement_date?: string
          settlement_no?: string
          settlement_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "rs_settlements_counterparty_id_fkey"
            columns: ["counterparty_id"]
            isOneToOne: false
            referencedRelation: "rs_counterparties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rs_settlements_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "rs_currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      rs_share_token_logs: {
        Row: {
          accessed_at: string
          action: string
          id: string
          ip_address: unknown
          token_id: string
          user_agent: string | null
        }
        Insert: {
          accessed_at?: string
          action?: string
          id?: string
          ip_address?: unknown
          token_id: string
          user_agent?: string | null
        }
        Update: {
          accessed_at?: string
          action?: string
          id?: string
          ip_address?: unknown
          token_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rs_share_token_logs_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "rs_share_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      rs_share_tokens: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          notes: string | null
          revoked: boolean
          revoked_at: string | null
          revoked_by: string | null
          target_id: string
          target_type: string
          token: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          notes?: string | null
          revoked?: boolean
          revoked_at?: string | null
          revoked_by?: string | null
          target_id: string
          target_type?: string
          token: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          notes?: string | null
          revoked?: boolean
          revoked_at?: string | null
          revoked_by?: string | null
          target_id?: string
          target_type?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "rs_share_tokens_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "rs_account_currents"
            referencedColumns: ["id"]
          },
        ]
      }
      rs_transaction_audit: {
        Row: {
          action: string
          changed_at: string
          changed_by: string | null
          id: string
          new_values: Json | null
          old_values: Json | null
          reason: string | null
          transaction_id: string
        }
        Insert: {
          action: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          reason?: string | null
          transaction_id: string
        }
        Update: {
          action?: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          reason?: string | null
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rs_transaction_audit_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "rs_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      rs_transactions: {
        Row: {
          account_current_id: string | null
          allocation_type: string | null
          amount_krw: number | null
          amount_original: number
          confirmed_at: string | null
          confirmed_by: string | null
          confirmer_email: string | null
          confirmer_name: string | null
          contract_id: string
          contract_match_status: string | null
          contract_type: string
          counterparty_id: string
          created_at: string
          created_by: string | null
          currency_code: string
          description: string | null
          direction: string
          due_date: string | null
          exchange_rate: number | null
          id: string
          is_allocation_parent: boolean
          is_deleted: boolean
          is_locked: boolean
          loss_reference: string | null
          parent_tx_id: string | null
          period_from: string | null
          period_to: string | null
          review_notes: string | null
          review_status: string | null
          settlement_schedule_id: string | null
          status: string
          transaction_date: string
          transaction_no: string
          transaction_type: string
          updated_at: string
          updated_by: string | null
          verified_at: string | null
          verified_by: string | null
          verifier_email: string | null
          verifier_name: string | null
        }
        Insert: {
          account_current_id?: string | null
          allocation_type?: string | null
          amount_krw?: number | null
          amount_original: number
          confirmed_at?: string | null
          confirmed_by?: string | null
          confirmer_email?: string | null
          confirmer_name?: string | null
          contract_id: string
          contract_match_status?: string | null
          contract_type: string
          counterparty_id: string
          created_at?: string
          created_by?: string | null
          currency_code: string
          description?: string | null
          direction: string
          due_date?: string | null
          exchange_rate?: number | null
          id?: string
          is_allocation_parent?: boolean
          is_deleted?: boolean
          is_locked?: boolean
          loss_reference?: string | null
          parent_tx_id?: string | null
          period_from?: string | null
          period_to?: string | null
          review_notes?: string | null
          review_status?: string | null
          settlement_schedule_id?: string | null
          status?: string
          transaction_date: string
          transaction_no: string
          transaction_type: string
          updated_at?: string
          updated_by?: string | null
          verified_at?: string | null
          verified_by?: string | null
          verifier_email?: string | null
          verifier_name?: string | null
        }
        Update: {
          account_current_id?: string | null
          allocation_type?: string | null
          amount_krw?: number | null
          amount_original?: number
          confirmed_at?: string | null
          confirmed_by?: string | null
          confirmer_email?: string | null
          confirmer_name?: string | null
          contract_id?: string
          contract_match_status?: string | null
          contract_type?: string
          counterparty_id?: string
          created_at?: string
          created_by?: string | null
          currency_code?: string
          description?: string | null
          direction?: string
          due_date?: string | null
          exchange_rate?: number | null
          id?: string
          is_allocation_parent?: boolean
          is_deleted?: boolean
          is_locked?: boolean
          loss_reference?: string | null
          parent_tx_id?: string | null
          period_from?: string | null
          period_to?: string | null
          review_notes?: string | null
          review_status?: string | null
          settlement_schedule_id?: string | null
          status?: string
          transaction_date?: string
          transaction_no?: string
          transaction_type?: string
          updated_at?: string
          updated_by?: string | null
          verified_at?: string | null
          verified_by?: string | null
          verifier_email?: string | null
          verifier_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_tx_account_current"
            columns: ["account_current_id"]
            isOneToOne: false
            referencedRelation: "rs_account_currents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rs_transactions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "rs_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rs_transactions_counterparty_id_fkey"
            columns: ["counterparty_id"]
            isOneToOne: false
            referencedRelation: "rs_counterparties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rs_transactions_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "rs_currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "rs_transactions_parent_tx_id_fkey"
            columns: ["parent_tx_id"]
            isOneToOne: false
            referencedRelation: "rs_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rs_transactions_settlement_schedule_id_fkey"
            columns: ["settlement_schedule_id"]
            isOneToOne: false
            referencedRelation: "rs_contract_settlement_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      rs_user_profiles: {
        Row: {
          company_id: string | null
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          role: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          full_name: string
          id?: string
          is_active?: boolean
          role: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rs_user_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "rs_counterparties"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      fn_contract_cedant_id: {
        Args: { p_contract_id: string }
        Returns: string
      }
      fn_contract_has_reinsurer: {
        Args: { p_contract_id: string; p_reinsurer_id: string }
        Returns: boolean
      }
      fn_is_broker_internal: { Args: never; Returns: boolean }
      fn_is_broker_manager_or_admin: { Args: never; Returns: boolean }
      fn_is_reviewer_or_above: { Args: never; Returns: boolean }
      get_user_company_id: { Args: never; Returns: string }
      get_user_role: { Args: never; Returns: string }
      is_broker_internal: { Args: never; Returns: boolean }
      rs_calc_aging: {
        Args: {
          p_cedant_id?: string
          p_contract_id?: string
          p_counterparty_id?: string
        }
        Returns: {
          counterparty: string
          currency: string
          current_amount: number
          days_1_30: number
          days_31_60: number
          days_61_90: number
          days_over_90: number
          total: number
        }[]
      }
      rs_calc_outstanding: {
        Args: {
          p_cedant_id?: string
          p_contract_id?: string
          p_counterparty_id?: string
          p_currency_code?: string
        }
        Returns: {
          currency: string
          net: number
          payable: number
          receivable: number
        }[]
      }
      rs_calc_outstanding_detail: {
        Args: {
          p_cedant_id?: string
          p_contract_id?: string
          p_counterparty_id?: string
          p_currency_code?: string
        }
        Returns: {
          aging_bucket: string
          amount: number
          contract_id: string
          contract_no: string
          counterparty_id: string
          counterparty_name: string
          currency_code: string
          direction: string
          due_date: string
        }[]
      }
      rs_cancel_account_current: {
        Args: { p_ac_id: string }
        Returns: undefined
      }
      rs_issue_account_current: {
        Args: { p_ac_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
