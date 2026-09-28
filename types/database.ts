export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Lets createClient<Database>() infer the PostgREST version.
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      files: {
        Row: {
          content_type: string;
          created_at: string;
          document_id: string;
          original_name: string;
          s3_key: string;
          s3_url: string;
          size_bytes: number;
          user_id: string;
        };
        Insert: {
          content_type: string;
          created_at?: string;
          document_id?: string;
          original_name: string;
          s3_key: string;
          s3_url: string;
          size_bytes: number;
          user_id: string;
        };
        Update: {
          content_type?: string;
          created_at?: string;
          document_id?: string;
          original_name?: string;
          s3_key?: string;
          s3_url?: string;
          size_bytes?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "files_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["user_id"];
          },
        ];
      };
      users: {
        Row: {
          created_at: string;
          email: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"];

export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"];
