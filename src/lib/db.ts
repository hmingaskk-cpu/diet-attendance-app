import { supabase } from '@/lib/supabaseClient'
import { Database } from '@/types/supabase'

// Type definitions for our tables
export type User = Database['public']['Tables']['users']['Row']
export type Semester = Database['public']['Tables']['semesters']['Row']
export type Student = Database['public']['Tables']['students']['Row']
export type AttendanceRecord = Database['public']['Tables']['attendance_records']['Row']

// User operations
export const getUsers = async () => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('name')
  
  if (error) throw error
  return data
}

export const getUserById = async (id: string) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data
}

// Semester operations
export const getSemesters = async () => {
  const { data, error } = await supabase
    .from('semesters')
    .select('*')
    .order('id')
  
  if (error) throw error
  return data
}

// Student operations
export const getStudentsBySemester = async (semesterId: number) => {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('semester_id', semesterId)
    .order('roll_number')
  
  if (error) throw error
  return data
}

export const createStudent = async (student: Omit<Student, 'id' | 'created_at' | 'updated_at'>) => {
  const { data, error } = await supabase
    .from('students')
    .insert(student)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const updateStudent = async (id: number, student: Partial<Student>) => {
  const { data, error } = await supabase
    .from('students')
    .update(student)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const deleteStudent = async (id: number) => {
  const { error } = await supabase
    .from('students')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// Attendance operations
export const getAttendanceRecords = async (date: string, period: number, semesterId: number) => {
  const { data, error } = await supabase
    .from('attendance_records')
    .select(`
      *,
      student:students (id, name, roll_number)
    `)
    .eq('date', date)
    .eq('period', period)
    .eq('semester_id', semesterId)
  
  if (error) throw error
  return data
}

export const createAttendanceRecord = async (record: Omit<AttendanceRecord, 'id' | 'created_at'>) => {
  const { data, error } = await supabase
    .from('attendance_records')
    .insert(record)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const createMultipleAttendanceRecords = async (records: Omit<AttendanceRecord, 'id' | 'created_at'>[]) => {
  const { data, error } = await supabase
    .from('attendance_records')
    .insert(records)
    .select()
  
  if (error) throw error
  return data
}

export const updateAttendanceRecord = async (id: number, record: Partial<AttendanceRecord>) => {
  const { data, error } = await supabase
    .from('attendance_records')
    .update(record)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Report operations
export const getAttendanceReport = async (startDate: string, endDate: string, semesterId?: number) => {
  let query = supabase
    .from('attendance_records')
    .select(`
      date,
      period,
      is_present,
      student:students (name, roll_number),
      semester:semesters (name)
    `)
    .gte('date', startDate)
    .lte('date', endDate)
  
  if (semesterId) {
    query = query.eq('semester_id', semesterId)
  }
  
  const { data, error } = await query.order('date')
  
  if (error) throw error
  return data
}

export const getStudentAttendanceReport = async (studentId: number) => {
  const { data, error } = await supabase
    .from('attendance_records')
    .select(`
      date,
      period,
      is_present,
      semester:semesters (name)
    `)
    .eq('student_id', studentId)
    .order('date')
  
  if (error) throw error
  return data
}