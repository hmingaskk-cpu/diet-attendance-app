"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar, Download, Filter, ListFilter } from "lucide-react"; // Import ListFilter icon
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import { Semester, Student } from "@/lib/db";
import Papa from "papaparse"; // Import PapaParse for CSV export
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Import Tabs components
import ComprehensiveStudentReport from "@/components/reports/ComprehensiveStudentReport"; // Import new component
import DeleteAllAttendanceDialog from "@/components/reports/DeleteAllAttendanceDialog"; // Import new component
import LoadingSkeleton from "@/components/LoadingSkeleton"; // Import LoadingSkeleton
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const reportColumnOptions = [
  { value: "total_periods_marked", label: "Total Periods Marked" },
  { value: "total_present", label: "Total Present" },
  { value: "attendance_percentage", label: "Attendance Percentage" },
];

const Reports = () => {
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedStudent, setSelectedStudent] = useState(""); // This will now filter the dropdown in ComprehensiveStudentReport
  const [attendanceData, setAttendanceData] = useState<any[]>([]); // Keep for potential future use or if chart is re-added
  const [studentReports, setStudentReports] = useState<any[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState(""); // State to store current user's role
  const [selectedReportColumns, setSelectedReportColumns] = useState<string[]>(
    reportColumnOptions.map(option => option.value)
  );
  const { toast } = useToast();

  const fetchInitialData = async () => {
    try {
      setIsLoading(true);
      
      // Get current user role
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userDetails } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();
        if (userDetails) {
          setCurrentUserRole(userDetails.role);
        }
      }

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

  useEffect(() => {
    fetchInitialData();
  }, [toast]);

  useEffect(() => {
    const fetchReportData = async () => {
      if (!dateRange.from || !dateRange.to) return;
      
      try {
        // Fetch attendance data for chart (still fetching, but not displayed)
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

    const headers = ["Roll No.", "Student Name", "Class"];
    const dataKeys: (keyof typeof studentReports[0] | "attendance_percentage_string")[] = ["roll", "name", "class"];

    if (selectedReportColumns.includes("total_periods_marked")) {
      headers.push("Total Periods Marked");
      dataKeys.push("total");
    }
    if (selectedReportColumns.includes("total_present")) {
      headers.push("Total Present");
      dataKeys.push("present");
    }
    if (selectedReportColumns.includes("attendance_percentage")) {
      headers.push("Attendance %");
      dataKeys.push("attendance_percentage_string"); // Custom key for formatted percentage
    }

    const csvRows = studentReports.map(student => {
      const row: (string | number)[] = [];
      dataKeys.forEach(key => {
        if (key === "attendance_percentage_string") {
          row.push(`${student.attendance}%`);
        } else {
          row.push(student[key as keyof typeof student]);
        }
      });
      return row.map(field => `"${field}"`).join(','); // Wrap fields in quotes to handle commas
    });

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
      <div className="min-h-screen bg-background">
        <div className="p-4 md:p-6 pb-20 md:pb-6"> {/* Added pb-20 for mobile bottom nav */}
          <LoadingSkeleton count={1} height="h-10" width="w-1/2" className="mb-6" />
          <LoadingSkeleton count={1} height="h-40" className="mb-6" />
          <LoadingSkeleton count={5} height="h-12" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 md:p-6 pb-20 md:pb-6"> {/* Added pb-20 for mobile bottom nav */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">Attendance Reports</h1>
          <p className="text-gray-600">Generate and view attendance reports</p>
        </div>

        <Card className="shadow-sm rounded-lg">
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
            <TabsTrigger 
              value="daily-student-report" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"
            >
              DAR
            </TabsTrigger>
            <TabsTrigger 
              value="comprehensive-student-report" 
              disabled={selectedClass === "all"}
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"
            >
              CSR
            </TabsTrigger>
          </TabsList>
          <TabsContent value="daily-student-report">
            <div className="grid grid-cols-1 gap-6 mb-6"> {/* Changed to grid-cols-1 */}
              <Card className="shadow-sm rounded-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Student Attendance</CardTitle>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <ListFilter className="mr-2 h-4 w-4" /> Customize Columns
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[200px]">
                        <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {reportColumnOptions.map((option) => (
                          <DropdownMenuCheckboxItem
                            key={option.value}
                            checked={selectedReportColumns.includes(option.value)}
                            onCheckedChange={(checked) => {
                              setSelectedReportColumns((prev) =>
                                checked
                                  ? [...prev, option.value]
                                  : prev.filter((col) => col !== option.value)
                              );
                            }}
                          >
                            {option.label}
                          </DropdownMenuCheckboxItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardDescription>Individual student attendance percentages</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto"> {/* Make table horizontally scrollable */}
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Roll No.</TableHead>
                          <TableHead>Student Name</TableHead>
                          <TableHead>Class</TableHead>
                          {selectedReportColumns.includes("total_periods_marked") && <TableHead>Total Periods Marked</TableHead>}
                          {selectedReportColumns.includes("total_present") && <TableHead>Total Present</TableHead>}
                          {selectedReportColumns.includes("attendance_percentage") && <TableHead className="text-right">Attendance %</TableHead>}
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
                            {selectedReportColumns.includes("total_periods_marked") && <TableCell>{student.total}</TableCell>}
                            {selectedReportColumns.includes("total_present") && <TableCell>{student.present}</TableCell>}
                            {selectedReportColumns.includes("attendance_percentage") && (
                              <TableCell className="text-right">
                                <Badge 
                                  variant={student.attendance > 90 ? "default" : student.attendance > 75 ? "secondary" : "destructive"}
                                >
                                  {student.attendance}%
                                </Badge>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end space-x-2">
              {currentUserRole === "admin" && (
                <DeleteAllAttendanceDialog onDeleteComplete={fetchInitialData} />
              )}
              <Button onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download Report
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="comprehensive-student-report">
            {selectedClass === "all" ? (
              <Card className="shadow-sm rounded-lg">
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