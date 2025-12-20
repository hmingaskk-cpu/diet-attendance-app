import { supabase } from '@/lib/supabaseClient'
import { Database } from '@/types/supabase'

// Type definitions for our tables
export type User = Database['public']['Tables']['users']['Row']
export type Semester = Database['public']['Tables']['semesters']['Row']
export type Student = Database['public']['Tables']['students']['Row']
export type AttendanceRecord = Database['public']['Tables']['attendance_records']['Row']
export type Subject = Database['public']['Tables']['subjects']['Row'] // New type
export type StudentSubject = Database['public']['Tables']['student_subjects']['Row'] // New type

// User operations
export const getUsers = async () => {
  const { data, error } = await supabase
    .from('users')
    .select('*, abbreviation') // Select abbreviation
    .order('name')
  
  if (error) throw error
  return data
}

export const getUserById = async (id: string) => {
  const { data, error } = await supabase
    .from('users')
    .select('*, abbreviation') // Select abbreviation
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

// Subject operations (New)
export const getSubjects = async () => {
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .order('name');

  if (error) {
    console.error("db.ts: Error fetching subjects:", error);
    throw error;
  }
  return data;
}

// Student operations
export const getStudentsBySemester = async (semesterId: number, subjectId?: number) => {
  let query = supabase
    .from('students')
    .select(`
      id, name, roll_number, email, semester_id
    `)
    .eq('semester_id', semesterId)
    .order('roll_number');
  
  if (subjectId) {
    // If a subjectId is provided, we need to filter students who are linked to this subject
    const { data: studentSubjectsData, error: studentSubjectsError } = await supabase
      .from('student_subjects')
      .select('student_id')
      .eq('semester_id', semesterId)
      .eq('subject_id', subjectId);

    if (studentSubjectsError) throw studentSubjectsError;

    const studentIds = studentSubjectsData.map(ss => ss.student_id);
    query = query.in('id', studentIds);
  }

  const { data, error } = await query;
  
  if (error) throw error
  return data;
}

// New function to get students who are in 4th semester but have NO optional subject assigned
export const getStudentsWithoutOptionalSubject = async (semesterId: number) => {
  const { data: studentsWithSubjects, error: studentsWithSubjectsError } = await supabase
    .from('student_subjects')
    .select('student_id')
    .eq('semester_id', semesterId);

  if (studentsWithSubjectsError) throw studentsWithSubjectsError;

  const studentIdsWithSubjects = studentsWithSubjects.map(ss => ss.student_id);

  let query = supabase
    .from('students')
    .select(`
      id, name, roll_number, email, semester_id
    `)
    .eq('semester_id', semesterId)
    .order('roll_number');

  if (studentIdsWithSubjects.length > 0) {
    query = query.not('id', 'in', `(${studentIdsWithSubjects.join(',')})`);
  }
  // If studentIdsWithSubjects is empty, it means no students have optional subjects,
  // so the 'not in' filter is not needed, and all students in the semester will be returned.

  const { data, error } = await query;

  if (error) throw error;
  return data;
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

export const createMultipleStudents = async (students: Omit<Student, 'id' | 'created_at' | 'updated_at'>[]) => {
  const { data, error } = await supabase
    .from('students')
    .insert(students)
    .select()
  
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

// Student Subject operations (New)
export const getStudentOptionalSubject = async (studentId: number, semesterId: number) => {
  const { data, error } = await supabase
    .from('student_subjects')
    .select('subject_id')
    .eq('student_id', studentId)
    .eq('semester_id', semesterId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
    throw error;
  }
  return data ? data.subject_id : null;
}

export const assignStudentOptionalSubject = async (studentId: number, subjectId: number, semesterId: number) => {
  const { data, error } = await supabase
    .from('student_subjects')
    .upsert({ student_id: studentId, subject_id: subjectId, semester_id: semesterId }, { onConflict: 'student_id, semester_id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export const removeStudentOptionalSubject = async (studentId: number, semesterId: number) => {
  const { error } = await supabase
    .from('student_subjects')
    .delete()
    .eq('student_id', studentId)
    .eq('semester_id', semesterId);

  if (error) throw error;
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

export const deleteAllAttendanceRecords = async () => {
  const { error } = await supabase
    .from('attendance_records')
    .delete()
    .neq('id', 0); // Delete all records where id is not 0 (i.e., all records)
  
  if (error) throw error;
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

export const getComprehensiveStudentAttendance = async (semesterId: number, startDate: string, endDate: string) => {
  const { data, error } = await supabase
    .from('attendance_records')
    .select(`
      date,
      period,
      is_present,
      student:students (id, name, roll_number),
      semester:semesters (name)
    `)
    .eq('semester_id', semesterId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date')
    .order('period');

  if (error) throw error;
  return data;
}

export const getStudentDetailedAttendance = async (studentId: number, semesterId: number, startDate: string, endDate: string) => {
  const { data, error } = await supabase
    .from('attendance_records')
    .select(`
      date,
      period,
      is_present,
      student:students (name, roll_number),
      semester:semesters (name)
    `)
    .eq('student_id', studentId)
    .eq('semester_id', semesterId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })
    .order('period', { ascending: true });

  if (error) throw error;
  return data;
}
