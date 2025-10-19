"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, Download, Plus, Search, Edit, Trash2 } from "lucide-react";
import Navigation from "@/components/Navigation";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import { Student, Semester } from "@/lib/db";
import AddStudentDialog from "@/components/students/AddStudentDialog";
import ImportStudentsDialog from "@/components/students/ImportStudentsDialog";
import EditStudentDialog from "@/components/students/EditStudentDialog"; // Import new component
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"; // Import AlertDialog
import LoadingSkeleton from "@/components/LoadingSkeleton"; // Import LoadingSkeleton
import MobileBottomNavigation from "@/components/MobileBottomNavigation"; // Import MobileBottomNavigation

const Students = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");
  const [students, setStudents] = useState<Student[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddStudentDialogOpen, setIsAddStudentDialogOpen] = useState(false);
  const [isImportStudentsDialogOpen, setIsImportStudentsDialogOpen] = useState(false);
  const [isEditStudentDialogOpen, setIsEditStudentDialogOpen] = useState(false); // State for edit dialog
  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState<Student | null>(null); // State for selected student
  const { toast } = useToast();

  const fetchStudentsAndSemesters = async () => {
    try {
      setIsLoading(true);
      
      // Get semesters
      const { data: semestersData, error: semestersError } = await supabase
        .from('semesters')
        .select('*')
        .order('id');
      
      if (semestersError) throw semestersError;
      setSemesters(semestersData || []);
      
      // Get students
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select(`
          *,
          semester:semesters (name)
        `)
        .order('semester_id', { ascending: true })
        .order('roll_number', { ascending: true });
      
      if (studentsError) throw studentsError;
      setStudents(studentsData || []);
    } catch (error: any) {
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentsAndSemesters();
  }, [toast]);

  const handleExport = () => {
    if (students.length === 0) {
      toast({
        title: "No Students to Export",
        description: "There are no student records to export.",
        variant: "destructive"
      });
      return;
    }

    const headers = ["Roll Number", "Student Name", "Email", "Semester"];
    const csvRows = students.map(student => [
      student.roll_number,
      student.name,
      student.email || "",
      (student as any).semester?.name || `Semester ${student.semester_id}`
    ].map(field => `"${field}"`).join(',')); // Wrap fields in quotes to handle commas

    const csvString = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'students_data.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Students Exported",
      description: "Student data has been downloaded as students_data.csv.",
    });
  };

  const handleEditStudent = (student: Student) => {
    setSelectedStudentForEdit(student);
    setIsEditStudentDialogOpen(true);
  };

  const handleDeleteStudent = async (id: number) => {
    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Refresh student list
      fetchStudentsAndSemesters();
      
      toast({
        title: "Student Deleted",
        description: "The student has been successfully removed."
      });
    } catch (error: any) {
      toast({
        title: "Error deleting student",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          student.roll_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = selectedClass === "all" || student.semester_id === parseInt(selectedClass);
    return matchesSearch && matchesClass;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="p-4 md:p-6 pb-20 md:pb-6"> {/* Added pb-20 for mobile bottom nav */}
          <LoadingSkeleton count={1} height="h-10" width="w-1/2" className="mb-6" />
          <LoadingSkeleton count={1} height="h-40" className="mb-6" />
          <LoadingSkeleton count={5} height="h-12" />
        </div>
        <MobileBottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="p-4 md:p-6 pb-20 md:pb-6"> {/* Added pb-20 for mobile bottom nav */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">Student Management</h1>
          <p className="text-gray-600">Manage student records and import/export data</p>
        </div>

        <Card className="shadow-sm rounded-lg">
          <CardHeader>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <CardTitle>Student Records</CardTitle>
                <CardDescription>
                  View and manage student information
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2"> {/* Use flex-wrap for buttons on small screens */}
                <Button onClick={() => setIsImportStudentsDialogOpen(true)} variant="outline">
                  <Upload className="mr-2 h-4 w-4" />
                  Import
                </Button>
                <Button onClick={handleExport} variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
                <Button onClick={() => setIsAddStudentDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Student
                </Button>
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
                  />
                </div>
              </div>
              <div>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {semesters.map(semester => (
                      <SelectItem key={semester.id} value={semester.id.toString()}>
                        {semester.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="overflow-x-auto"> {/* Make table horizontally scrollable */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Roll No.</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <Badge variant="outline">{student.roll_number}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell>{(student as any).semester?.name || `Semester ${student.semester_id}`}</TableCell>
                      <TableCell>{student.email || "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" size="sm" onClick={() => handleEditStudent(student)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete the student 
                                  record and any associated attendance data.
                                </AlertDialogDescription>
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
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
      <AddStudentDialog 
        isOpen={isAddStudentDialogOpen} 
        onClose={() => setIsAddStudentDialogOpen(false)} 
        onStudentAdded={fetchStudentsAndSemesters} 
      />
      <ImportStudentsDialog 
        isOpen={isImportStudentsDialogOpen} 
        onClose={() => setIsImportStudentsDialogOpen(false)} 
        onImportComplete={fetchStudentsAndSemesters} 
      />
      <EditStudentDialog
        isOpen={isEditStudentDialogOpen}
        onClose={() => setIsEditStudentDialogOpen(false)}
        student={selectedStudentForEdit}
        onStudentUpdated={fetchStudentsAndSemesters}
      />
    </div>
  );
};

export default Students;