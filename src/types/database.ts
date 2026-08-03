export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// Replace with generated types after linking Supabase:
// npx supabase gen types typescript --linked > src/types/database.ts
export interface Database {
  public: {
    Tables: Record<string, { Row: Record<string, Json>; Insert: Record<string, Json | undefined>; Update: Record<string, Json | undefined>; Relationships: [] }>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
