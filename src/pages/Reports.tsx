"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar, Download, Filter } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import Navigation from "@/components/Navigation";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import { Semester, Student } from "@/lib/db";
import Papa from "papaparse"; // Import PapaParse for CSV export
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Import Tabs components
import ComprehensiveStudentReport from "@/components/reports/ComprehensiveStudentReport"; // Import new component

const Reports = () => {
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedStudent, setSelectedStudent] = useState(""); // This will now filter the dropdown in ComprehensiveStudentReport
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [studentReports, setStudentReports] = useState<any[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
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
          .select('*')
          .order('name');
        
        if (studentsError) throw studentsError;
        setStudents(studentsData || []);
        
        // Set default date range to last 30 days
        const today = new Date();
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);
        
        setDateRange({
          from: thirtyDaysAgo.toISOString().split('T')[0],
          to: today.toISOString().split('T')[0]
        });
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
    
    fetchData();
  }, [toast]);

  useEffect(() => {
    const fetchReportData = async () => {
      if (!dateRange.from || !dateRange.to) return;
      
      try {
        // Fetch attendance data for chart
        let query = supabase
          .from('attendance_records')
          .select(`
            date,
            is_present
          `)
          .gte('date', dateRange.from)
          .lte('date', dateRange.to);
        
        if (selectedClass !== "all") {
          query = query.eq('semester_id', selectedClass);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        // Process data for chart
        const chartData: Record<string, { date: string; present: number; absent: number }> = {};
        
        data?.forEach(record => {
          const date = record.date;
          if (!chartData[date]) {
            chartData[date] = { date, present: 0, absent: 0 };
          }
          
          if (record.is_present) {
            chartData[date].present += 1;
          } else {
            chartData[date].absent += 1;
          }
        });
        
        setAttendanceData(Object.values(chartData));
        
        // Fetch student attendance percentages
        const studentAttendanceQuery = supabase
          .from('attendance_records')
          .select(`
            student_id,
            is_present,
            student:students (name, roll_number),
            semester:semesters (name)
          `)
          .gte('date', dateRange.from)
          .lte('date', dateRange.to);
        
        if (selectedClass !== "all") {
          studentAttendanceQuery.eq('semester_id', selectedClass);
        }
        
        const { data: studentData, error: studentError } = await studentAttendanceQuery;
        
        if (studentError) throw studentError;
        
        // Process student attendance data
        const studentMap: Record<number, { 
          id: number; 
          name: string; 
          roll: string; 
          class: string; 
          total: number; 
          present: number 
        }> = {};
        
        studentData?.forEach(record => {
          const studentId = record.student_id;
          if (!studentMap[studentId]) {
            studentMap[studentId] = {
              id: studentId,
              name: record.student?.name || "Unknown",
              roll: record.student?.roll_number || "Unknown",
              class: record.semester?.name || "Unknown",
              total: 0,
              present: 0
            };
          }
          
          studentMap[studentId].total += 1;
          if (record.is_present) {
            studentMap[studentId].present += 1;
          }
        });
        
        // Calculate percentages
        const studentReports = Object.values(studentMap).map(student => ({
          ...student,
          attendance: student.total > 0 ? Math.round((student.present / student.total) * 100) : 0
        }));
        
        setStudentReports(studentReports);
      } catch (error: any) {
        toast({
          title: "Error loading report data",
          description: error.message,
          variant: "destructive"
        });
      }
    };
    
    if (!isLoading) {
      fetchReportData();
    }
  }, [dateRange, selectedClass, isLoading, toast]);

  const handleGenerateReport = () => {
    // This will trigger the useEffect above
    toast({
      title: "Report Generated",
      description: "Attendance report has been updated."
    });
  };

  const handleDownload = () => {
    if (studentReports.length === 0) {
      toast({
        title: "No Data to Export",
        description: "There are no student attendance records to export based on current filters.",
        variant: "destructive"
      });
      return;
    }

    const headers = ["Roll No.", "Student Name", "Class", "Attendance %"];
    const csvRows = studentReports.map(student => [
      student.roll,
      student.name,
      student.class,
      `${student.attendance}%`
    ].map(field => `"${field}"`).join(',')); // Wrap fields in quotes to handle commas

    const csvString = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'attendance_report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Report Downloaded",
      description: "Attendance report has been downloaded as attendance_report.csv.",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading report data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="p-4 md:p-6">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">Attendance Reports</h1>
          <p className="text-gray-600">Generate and view attendance reports</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Generate Report</CardTitle>
            <CardDescription>
              Filter reports by date range, class, or student
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="from-date">From Date</Label>
                <div className="flex">
                  <Calendar className="h-10 w-10 p-2 border border-r-0 rounded-l-md bg-gray-100" />
                  <Input
                    id="from-date"
                    type="date"
                    value={dateRange.from}
                    onChange={(e) => setDateRange({...dateRange, from: e.target.value})}
                    className="rounded-l-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="to-date">To Date</Label>
                <div className="flex">
                  <Calendar className="h-10 w-10 p-2 border border-r-0 rounded-l-md bg-gray-100" />
                  <Input
                    id="to-date"
                    type="date"
                    value={dateRange.to}
                    onChange={(e) => setDateRange({...dateRange, to: e.target.value})}
                    className="rounded-l-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="class">Class</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
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
              <div className="space-y-2">
                <Label htmlFor="student">Student</Label>
                <Input
                  id="student"
                  placeholder="Search student by name or roll number..."
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <Button onClick={handleGenerateReport}>
                <Filter className="mr-2 h-4 w-4" />
                Generate Report
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="daily-student-report" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="daily-student-report">Daily & Student Attendance</TabsTrigger>
            <TabsTrigger value="comprehensive-student-report" disabled={selectedClass === "all"}>Comprehensive Student Report</TabsTrigger>
          </TabsList>
          <TabsContent value="daily-student-report">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle>Attendance Overview</CardTitle>
                  <CardDescription>Daily attendance statistics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={attendanceData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="present" fill="#10b981" name="Present" />
                        <Bar dataKey="absent" fill="#ef4444" name="Absent" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Student Attendance</CardTitle>
                  <CardDescription>Individual student attendance percentages</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Roll No.</TableHead>
                        <TableHead>Student Name</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead className="text-right">Attendance %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {studentReports.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell>
                            <Badge variant="outline">{student.roll}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{student.name}</TableCell>
                          <TableCell>{student.class}</TableCell>
                          <TableCell className="text-right">
                            <Badge 
                              variant={student.attendance > 90 ? "default" : student.attendance > 75 ? "secondary" : "destructive"}
                            >
                              {student.attendance}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download Report
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="comprehensive-student-report">
            {selectedClass === "all" ? (
              <Card>
                <CardContent className="p-6 text-center text-gray-500">
                  Please select a specific class (semester) to view the comprehensive student report.
                </CardContent>
              </Card>
            ) : (
              <ComprehensiveStudentReport 
                semesterId={parseInt(selectedClass)} 
                startDate={dateRange.from} 
                endDate={dateRange.to}
                filterStudentTerm={selectedStudent} // Pass the filter term
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Reports;