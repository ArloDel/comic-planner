export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ItemType = 'manga' | 'manhua' | 'manhwa' | 'komik lokal';
export type ListingStatus = 'ready' | 'po';
export type PlanStatus = 'wishlist' | 'po' | 'dp' | 'lunas' | 'diterima' | 'batal';
export type TransactionType = 'dp' | 'pelunasan' | 'bayar_penuh' | 'refund';

export interface Database {
  public: {
    Tables: {
      budgets: {
        Row: {
          id: string;
          periode: string; // YYYY-MM-DD
          total_budget: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          periode: string;
          total_budget: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          periode?: string;
          total_budget?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      items: {
        Row: {
          id: string;
          judul: string;
          seri: string | null;
          volume: number | null;
          penerbit: string | null;
          tipe: ItemType | null;
          cover_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          judul: string;
          seri?: string | null;
          volume?: number | null;
          penerbit?: string | null;
          tipe?: ItemType | null;
          cover_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          judul?: string;
          seri?: string | null;
          volume?: number | null;
          penerbit?: string | null;
          tipe?: ItemType | null;
          cover_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      listings: {
        Row: {
          id: string;
          item_id: string;
          marketplace: string;
          shop_id: string;
          item_id_shopee: string;
          nama_toko: string | null;
          url: string | null;
          harga: number;
          status: ListingStatus;
          deadline_po: string | null;
          tanggal_rilis: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          item_id: string;
          marketplace?: string;
          shop_id: string;
          item_id_shopee: string;
          nama_toko?: string | null;
          url?: string | null;
          harga?: number;
          status: ListingStatus;
          deadline_po?: string | null;
          tanggal_rilis?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          item_id?: string;
          marketplace?: string;
          shop_id?: string;
          item_id_shopee?: string;
          nama_toko?: string | null;
          url?: string | null;
          harga?: number;
          status?: ListingStatus;
          deadline_po?: string | null;
          tanggal_rilis?: string | null;
          updated_at?: string;
        };
      };
      plans: {
        Row: {
          id: string;
          item_id: string;
          listing_id: string | null;
          prioritas: number;
          estimasi_harga: number;
          status: PlanStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          item_id: string;
          listing_id?: string | null;
          prioritas?: number;
          estimasi_harga?: number;
          status: PlanStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          item_id?: string;
          listing_id?: string | null;
          prioritas?: number;
          estimasi_harga?: number;
          status?: PlanStatus;
          created_at?: string;
          updated_at?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          plan_id: string;
          jumlah: number;
          jenis: TransactionType;
          tanggal: string;
          catatan: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          plan_id: string;
          jumlah: number;
          jenis: TransactionType;
          tanggal?: string;
          catatan?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          plan_id?: string;
          jumlah?: number;
          jenis?: TransactionType;
          tanggal?: string;
          catatan?: string | null;
          created_at?: string;
        };
      };
      status_history: {
        Row: {
          id: string;
          plan_id: string;
          status_lama: string | null;
          status_baru: string;
          changed_at: string;
        };
        Insert: {
          id?: string;
          plan_id: string;
          status_lama?: string | null;
          status_baru: string;
          changed_at?: string;
        };
        Update: {
          id?: string;
          plan_id?: string;
          status_lama?: string | null;
          status_baru?: string;
          changed_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      item_type: ItemType;
      listing_status: ListingStatus;
      plan_status: PlanStatus;
      transaction_type: TransactionType;
    };
  };
}
