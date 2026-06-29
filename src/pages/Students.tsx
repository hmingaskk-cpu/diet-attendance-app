"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Upload, Download, Plus, Search, Edit, Trash2, Mail, Phone, MapPin, Hash, GraduationCap, Calendar as CalendarIcon, Users, CreditCard, PieChart } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import { Semester } from "@/lib/db";
import AddStudentDialog from "@/components/students/AddStudentDialog";
import ImportStudentsDialog from "@/components/students/ImportStudentsDialog";
import EditStudentDialog from "@/components/students/EditStudentDialog"; 
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"; 
import LoadingSkeleton from "@/components/LoadingSkeleton"; 

// Helper function to format dates to dd/mm/yyyy
const formatDOB = (dateStr: string) => {
  if (!dateStr) return "Not provided";
  const parts = dateStr.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
};

const Students = () => {
  const [searchParams] = useSearchParams();
  const initialClass = searchParams.get("class") || "";

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState(initialClass); 
  const [students, setStudents] = useState<any[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isAddStudentDialogOpen, setIsAddStudentDialogOpen] = useState(false);
  const [isImportStudentsDialogOpen, setIsImportStudentsDialogOpen] = useState(false);
  const [isEditStudentDialogOpen, setIsEditStudentDialogOpen] = useState(false); 
  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState<any | null>(null); 
  
  const [isViewStudentDialogOpen, setIsViewStudentDialogOpen] = useState(false);
  const [selectedStudentForView, setSelectedStudentForView] = useState<any | null>(null);

  // New States for Attendance Calculation
  const [studentAttendancePercentage, setStudentAttendancePercentage] = useState<number | null>(null);
  const [isFetchingAttendance, setIsFetchingAttendance] = useState(false);

  const { toast } = useToast();

  const fetchStudentsAndSemesters = async () => {
    try {
      setIsLoading(true);
      const { data: semestersData, error: semestersError } = await supabase.from('semesters').select('*').order('id');
      if (semestersError) throw semestersError;
      setSemesters(semestersData || []);
      
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('*, semester:semesters (name)')
        .order('semester_id', { ascending: true })
        .order('roll_number', { ascending: true });
      
      if (studentsError) throw studentsError;
      setStudents(studentsData || []);
    } catch (error: any) {
      toast({ title: "Error loading data", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentsAndSemesters();
  }, [toast]);

  useEffect(() => {
    const classFromUrl = searchParams.get("class");
    if (classFromUrl) setSelectedClass(classFromUrl);
  }, [searchParams]);

  // Handle opening the profile card and calculating attendance on the fly
  const handleRowClick = async (student: any) => {
    setSelectedStudentForView(student);
    setIsViewStudentDialogOpen(true);
    setStudentAttendancePercentage(null); // Reset from previous views
    setIsFetchingAttendance(true);

    try {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('is_present')
        .eq('student_id', student.id)
        .eq('semester_id', student.semester_id); // Calculate only for their CURRENT class

      if (error) throw error;

      if (data && data.length > 0) {
        const total = data.length;
        const present = data.filter((r) => r.is_present).length;
        setStudentAttendancePercentage(Math.round((present / total) * 100));
      }
    } catch (err) {
      console.error("Error fetching attendance for profile:", err);
    } finally {
      setIsFetchingAttendance(false);
    }
  };

  const handleExport = () => {
    if (filteredStudents.length === 0) {
      toast({ title: "No Students to Export", description: "There are no student records to export for this class.", variant: "destructive" });
      return;
    }

    const headers = ["Roll Number", "Student Name", "Email", "Phone", "Address", "Qualification", "DOB", "Parent Name", "Aadhaar", "Semester", "Photo URL"];
    const csvRows = filteredStudents.map(student => [
      student.roll_number, student.name, student.email || "", student.phone_number || "", student.address || "",
      student.qualification || "", student.date_of_birth || "", student.parent_name || "", student.aadhaar_number || "",
      student.semester?.name || `Semester ${student.semester_id}`, student.profile_photo_url || ""
    ].map(field => `"${field}"`).join(',')); 

    const csvString = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'students_data.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: "Students Exported", description: "Student data has been downloaded." });
  };

  const handleEditStudent = (student: any) => {
    setSelectedStudentForEdit(student);
    setIsEditStudentDialogOpen(true);
  };

  const handleDeleteStudent = async (id: number) => {
    try {
      const { error } = await supabase.from('students').delete().eq('id', id);
      if (error) throw error;
      fetchStudentsAndSemesters();
      toast({ title: "Student Deleted", description: "The student has been successfully removed." });
    } catch (error: any) {
      toast({ title: "Error deleting student", description: error.message, variant: "destructive" });
    }
  };

  const filteredStudents = selectedClass === "" ? [] : students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) || student.roll_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = selectedClass === "all" || student.semester_id === parseInt(selectedClass);
    return matchesSearch && matchesClass;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="p-4 md:p-6 pb-20 md:pb-6"> 
          <LoadingSkeleton count={1} height="h-10" width="w-1/2" className="mb-6" />
          <LoadingSkeleton count={1} height="h-40" className="mb-6" />
          <LoadingSkeleton count={5} height="h-12" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 md:p-6 pb-20 md:pb-6"> 
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">Student Management</h1>
          <p className="text-gray-600">Manage student records, profiles, and import/export data</p>
        </div>

        <Card className="shadow-sm rounded-lg">
          <CardHeader>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <CardTitle>Student Records</CardTitle>
                <CardDescription>View and manage student information</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2"> 
                <Button onClick={() => setIsImportStudentsDialogOpen(true)} variant="outline"><Upload className="mr-2 h-4 w-4" />Import</Button>
                <Button onClick={handleExport} variant="outline" disabled={selectedClass === ""}><Download className="mr-2 h-4 w-4" />Export</Button>
                <Button onClick={() => setIsAddStudentDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />Add Student</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input 
                    placeholder="Search students by name or roll number..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    className="pl-10" 
                    disabled={selectedClass === ""} 
                  />
                </div>
              </div>
              <div>
                <Select value={selectedClass || undefined} onValueChange={setSelectedClass}>
                  <SelectTrigger><SelectValue placeholder="Select Class" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {semesters.map(semester => (<SelectItem key={semester.id} value={semester.id.toString()}>{semester.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="overflow-x-auto"> 
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Roll No.</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedClass === "" ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-gray-500 bg-gray-50/50 rounded-b-md">
                        Please select a class from the dropdown above to view students.
                      </TableCell>
                    </TableRow>
                  ) : filteredStudents.length > 0 ? (
                    filteredStudents.map((student) => (
                      <TableRow 
                        key={student.id} 
                        onClick={() => handleRowClick(student)}
                        className="cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        <TableCell>
                          <Badge variant="outline">{student.roll_number}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 border">
                              <AvatarImage src={student.profile_photo_url || ""} />
                              <AvatarFallback className="bg-blue-50 text-blue-700 text-xs">
                                {student.name.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{student.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{student.semester?.name || `Semester ${student.semester_id}`}</TableCell>
                        <TableCell>{student.email || "-"}</TableCell>
                        <TableCell>{student.phone_number || "-"}</TableCell>
                        <TableCell className="max-w-[150px] truncate" title={student.address || ""}>{student.address || "-"}</TableCell>
                        
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end space-x-2">
                            <Button variant="outline" size="sm" onClick={() => handleEditStudent(student)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm"><Trash2 className="h-4 w-4" /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                  <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteStudent(student.id)}>Continue</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-gray-500">No students found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <AddStudentDialog isOpen={isAddStudentDialogOpen} onClose={() => setIsAddStudentDialogOpen(false)} onStudentAdded={fetchStudentsAndSemesters} />
      <ImportStudentsDialog isOpen={isImportStudentsDialogOpen} onClose={() => setIsImportStudentsDialogOpen(false)} onImportComplete={fetchStudentsAndSemesters} />
      <EditStudentDialog isOpen={isEditStudentDialogOpen} onClose={() => setIsEditStudentDialogOpen(false)} student={selectedStudentForEdit} onStudentUpdated={fetchStudentsAndSemesters} />
      
      {/* Student Profile Dialog */}
      <Dialog open={isViewStudentDialogOpen} onOpenChange={setIsViewStudentDialogOpen}>
        <DialogContent className="sm:max-w-[450px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">Student Profile</DialogTitle>
            <DialogDescription className="text-center hidden">Detailed view of the student.</DialogDescription>
          </DialogHeader>
          
          {selectedStudentForView && (
            <div className="flex flex-col items-center gap-2 py-4">
              <Avatar className="h-32 w-32 border-4 border-white shadow-lg mb-2">
                <AvatarImage src={selectedStudentForView.profile_photo_url || ""} />
                <AvatarFallback className="bg-blue-50 text-blue-700 text-4xl font-semibold">
                  {selectedStudentForView.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="text-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900">{selectedStudentForView.name}</h2>
                <Badge variant="secondary" className="mt-2 text-sm font-medium px-3 py-1">
                  {selectedStudentForView.semester?.name || `Semester ${selectedStudentForView.semester_id}`}
                </Badge>
              </div>
              
              <div className="w-full space-y-4 mt-2 px-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                <div className="grid grid-cols-1 gap-4">
                  
                  {/* NEW: Live Attendance Row */}
                  <div className="flex items-center gap-3 bg-white p-3 rounded-lg border shadow-sm">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-full"><PieChart className="h-5 w-5" /></div>
                    <div className="flex flex-col flex-1">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Current Attendance</span>
                      {isFetchingAttendance ? (
                        <span className="text-sm font-semibold text-gray-400">Calculating...</span>
                      ) : studentAttendancePercentage !== null ? (
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-lg font-bold text-gray-900">{studentAttendancePercentage}%</span>
                          <Badge 
                            variant={studentAttendancePercentage >= 75 ? "default" : "destructive"} 
                            className="text-[10px] px-2 py-0 h-5"
                          >
                            {studentAttendancePercentage >= 75 ? "Good Standing" : "Needs Attention"}
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-sm font-semibold text-gray-500">No data for this class</span>
                      )}
                    </div>
                  </div>

                  {/* Rest of the data rows... */}
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 text-blue-700 rounded-full"><Hash className="h-4 w-4" /></div>
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Roll Number</span>
                      <span className="text-sm font-semibold text-gray-900">{selectedStudentForView.roll_number}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 text-indigo-700 rounded-full"><GraduationCap className="h-4 w-4" /></div>
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Qualification</span>
                      <span className="text-sm font-semibold text-gray-900">{selectedStudentForView.qualification || "Not provided"}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-pink-100 text-pink-700 rounded-full"><CalendarIcon className="h-4 w-4" /></div>
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Date of Birth</span>
                      <span className="text-sm font-semibold text-gray-900">{formatDOB(selectedStudentForView.date_of_birth)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 text-purple-700 rounded-full"><Mail className="h-4 w-4" /></div>
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Email Address</span>
                      <span className="text-sm font-semibold text-gray-900">{selectedStudentForView.email || "Not provided"}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 text-green-700 rounded-full"><Phone className="h-4 w-4" /></div>
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Phone Number</span>
                      <span className="text-sm font-semibold text-gray-900">{selectedStudentForView.phone_number || "Not provided"}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-teal-100 text-teal-700 rounded-full"><Users className="h-4 w-4" /></div>
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Parent Name</span>
                      <span className="text-sm font-semibold text-gray-900">{selectedStudentForView.parent_name || "Not provided"}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-100 text-yellow-700 rounded-full"><CreditCard className="h-4 w-4" /></div>
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Aadhaar Number</span>
                      <span className="text-sm font-semibold text-gray-900">{selectedStudentForView.aadhaar_number || "Not provided"}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 text-orange-700 rounded-full"><MapPin className="h-4 w-4" /></div>
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Home Address</span>
                      <span className="text-sm font-semibold text-gray-900 leading-tight mt-0.5">{selectedStudentForView.address || "Not provided"}</span>
                    </div>
                  </div>
                </div>
              </div>
              
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Students;
