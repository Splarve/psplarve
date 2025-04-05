// types/database.types.ts - Database type definitions
export type Database = {
    public: {
      tables: {
        profiles: {
          Row: {
            id: string
            created_at: string
            updated_at: string
            full_name: string | null
            avatar_url: string | null
          }
          Insert: {
            id: string
            created_at?: string
            updated_at?: string
            full_name?: string | null
            avatar_url?: string | null
          }
          Update: {
            id?: string
            created_at?: string
            updated_at?: string
            full_name?: string | null
            avatar_url?: string | null
          }
        }
      }
    }
  }