export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          name: string
          email: string
          role: "admin" | "faculty" // Updated to ENUM type
          status: "pending" | "active" | "inactive" // Updated to ENUM type
        }
        Insert: {
          id: string
          created_at?: string
          updated_at?: string
          name: string
          email: string
          role: "admin" | "faculty" // Updated to ENUM type
          status?: "pending" | "active" | "inactive" // Updated to ENUM type
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          name?: string
          email?: string
          role?: "admin" | "faculty" // Updated to ENUM type
          status?: "pending" | "active" | "inactive" // Updated to ENUM type
        }
        Relationships: [
          {
            foreignKeyName: "users_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      semesters: {
        Row: {
          id: number
          name: string
          created_at: string
        }
        Insert: {
          id?: number
          name: string
          created_at?: string
        }
        Update: {
          id?: number
          name?: string
          created_at?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          id: number
          created_at: string
          updated_at: string
          roll_number: string
          name: string
          email: string | null
          semester_id: number
        }
        Insert: {
          id?: number
          created_at?: string
          updated_at?: string
          roll_number: string
          name: string
          email?: string | null
          semester_id: number
        }
        Update: {
          id?: number
          created_at?: string
          updated_at?: string
          roll_number?: string
          name?: string
          email?: string | null
          semester_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "students_semester_id_fkey"
            columns: ["semester_id"]
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          }
        ]
      }
      attendance_records: {
        Row: {
          id: number
          created_at: string
          date: string
          period: number
          faculty_id: string
          semester_id: number
          student_id: number
          is_present: boolean
        }
        Insert: {
          id?: number
          created_at?: string
          date: string
          period: number
          faculty_id: string
          semester_id: number
          student_id: number
          is_present: boolean
        }
        Update: {
          id?: number
          created_at?: string
          date?: string
          period?: number
          faculty_id?: string
          semester_id?: number
          student_id?: number
          is_present?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_faculty_id_fkey"
            columns: ["faculty_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_semester_id_fkey"
            columns: ["semester_id"]
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_student_id_fkey"
            columns: ["student_id"]
            referencedRelation: "students"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_status_enum: ["pending", "active", "inactive"]
      user_role_enum: ["admin", "faculty"]
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}