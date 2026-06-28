"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar, Download, Filter, ListFilter } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import { Semester, Student } from "@/lib/db";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ComprehensiveStudentReport from "@/components/reports/ComprehensiveStudentReport";
import DeleteAllAttendanceDialog from "@/components/reports/DeleteAllAttendanceDialog";
import LoadingSkeleton from "@/components/LoadingSkeleton";
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

// HELPER FUNCTION: Convert yyyy-mm-dd to dd/mm/yyyy
const formatDate = (dateStr: string) => {
  if (!dateStr) return "";
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

const Reports = () => {
  // Input states (What the user is currently typing/selecting)
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");

  // Active filters (What is actually generating the table)
  const [activeFilters, setActiveFilters] = useState({ from: "", to: "", class: "" });

  const [studentReports, setStudentReports] = useState<any[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState("");
  const [selectedReportColumns, setSelectedReportColumns] = useState<string[]>(
    reportColumnOptions.map(option => option.value)
  );
  const { toast } = useToast();

  const fetchInitialData = async () => {
    try {
      setIsLoading(true);
      
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

      const { data: semestersData, error: semestersError } = await supabase
        .from('semesters')
        .select('*')
        .order('id');
      
      if (semestersError) throw semestersError;
      setSemesters(semestersData || []);
      
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .order('name');
      
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
    fetchInitialData();
  }, [toast]);

  // Function to actually fetch data based on LOCKED IN filters
  const fetchReportData = async (fromDate: string, toDate: string, classId: string) => {
    setIsLoading(true);
    try {
      const studentReportsMap: Record<number, { 
        id: number; 
        name: string; 
        roll: string; 
        class: string; 
        total: number; 
        present: number 
      }> = {};

      if (classId !== "all") {
        // --- OPTIMIZED BULK FETCHING LOGIC ---
        const studentsInSelectedSemester = students.filter(s => s.semester_id.toString() === classId);
        const className = semesters.find(s => s.id.toString() === classId)?.name || "Unknown";
        
        // 1. Initialize all students with 0 attendance so they still show up if they have no records
        for (const student of studentsInSelectedSemester) {
          studentReportsMap[student.id] = {
            id: student.id,
            name: student.name,
            roll: student.roll_number,
            class: className,
            total: 0,
            present: 0
          };
        }

        // 2. Fetch ALL attendance records for this class and date range in ONE single request
        const { data: attendanceData, error: attendanceError } = await supabase
          .from('attendance_records')
          .select('student_id, is_present')
          .eq('semester_id', classId)
          .gte('date', fromDate)
          .lte('date', toDate);

        if (attendanceError) throw attendanceError;

        // 3. Tally up the totals instantly in memory
        attendanceData?.forEach(record => {
          const studentId = record.student_id;
          if (studentReportsMap[studentId]) {
            studentReportsMap[studentId].total += 1;
            if (record.is_present) {
              studentReportsMap[studentId].present += 1;
            }
          }
        });
      } else {
        // "All Classes" logic (already optimized to use a single request)
        const { data: allAttendanceRecords, error: allAttendanceError } = await supabase
          .from('attendance_records')
          .select(`
            student_id,
            is_present,
            student:students (name, roll_number),
            semester:semesters (name)
          `)
          .gte('date', fromDate)
          .lte('date', toDate);

        if (allAttendanceError) throw allAttendanceError;

        allAttendanceRecords?.forEach(record => {
          const studentId = record.student_id;
          if (!studentReportsMap[studentId]) {
            studentReportsMap[studentId] = {
              id: studentId,
              name: (record.student as any)?.name || "Unknown",
              roll: (record.student as any)?.roll_number || "Unknown",
              class: "All Semesters",
              total: 0,
              present: 0
            };
          }
          
          studentReportsMap[studentId].total += 1;
          if (record.is_present) {
            studentReportsMap[studentId].present += 1;
          }
        });
      }

      // Calculate final percentages
      const generatedReports = Object.values(studentReportsMap).map(student => ({
        ...student,
        attendance: student.total > 0 ? Math.round((student.present / student.total) * 100) : 0
      }));
      
      setStudentReports(generatedReports);
    } catch (error: any) {
      toast({
        title: "Error loading report data",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleGenerateReport = () => {
    if (!dateRange.from || !dateRange.to || !selectedClass) {
      toast({
        title: "Incomplete Filters",
        description: "Please select a From Date, To Date, and Class before generating.",
        variant: "destructive"
      });
      return;
    }

    // Lock in the filters and run the query!
    setActiveFilters({ from: dateRange.from, to: dateRange.to, class: selectedClass });
    fetchReportData(dateRange.from, dateRange.to, selectedClass);
    
    toast({
      title: "Generating Report...",
      description: "Fetching attendance data based on your filters."
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
      dataKeys.push("attendance_percentage_string"); 
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
      return row.map(field => `"${field}"`).join(','); 
    });

    const csvString = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    
    // Use the safe formatted dates for the filename
    const safeStartDate = formatDate(activeFilters.from).replace(/\//g, '-');
    const safeEndDate = formatDate(activeFilters.to).replace(/\//g, '-');
    link.setAttribute('download', `attendance_summary_${safeStartDate}_to_${safeEndDate}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Report Downloaded",
      description: "Attendance report has been downloaded.",
    });
  };

  // Called if admin wipes all attendance data
  const handleResetData = () => {
    setActiveFilters({ from: "", to: "", class: "" });
    setStudentReports([]);
    fetchInitialData();
  };

  if (isLoading && !activeFilters.class) {
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
                <Label htmlFor="student">Student Filter (Optional)</Label>
                <Input
                  id="student"
                  placeholder="Filter by name or roll..."
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <Button onClick={handleGenerateReport} disabled={isLoading}>
                <Filter className="mr-2 h-4 w-4" />
                {isLoading ? "Loading..." : "Generate Report"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="daily-student-report" className="w-full mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger 
              value="daily-student-report" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"
            >
              DAR (Summary)
            </TabsTrigger>
            <TabsTrigger 
              value="comprehensive-student-report" 
              disabled={activeFilters.class === "all" || !activeFilters.class}
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"
            >
              CSR (Detailed)
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="daily-student-report">
            <div className="grid grid-cols-1 gap-6 mb-6"> 
              <Card className="shadow-sm rounded-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Student Attendance Summary</CardTitle>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" disabled={!activeFilters.class}>
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
                  <CardDescription>
                    {activeFilters.from && activeFilters.to 
                      ? `Showing data from ${formatDate(activeFilters.from)} to ${formatDate(activeFilters.to)}` 
                      : "Individual student attendance percentages"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  
                  {(!activeFilters.from || !activeFilters.to || !activeFilters.class) ? (
                    <div className="text-center p-8 text-gray-500 border rounded-lg bg-gray-50">
                      Please select a Class and Date Range above, then click <strong>Generate Report</strong> to view students.
                    </div>
                  ) : studentReports.length === 0 ? (
                    <div className="text-center p-8 text-gray-500 border rounded-lg bg-gray-50">
                      No attendance data found for the selected dates and class.
                    </div>
                  ) : (
                    <div className="overflow-x-auto"> 
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
                          {studentReports
                            .filter(student => 
                               !selectedStudent || 
                               student.name.toLowerCase().includes(selectedStudent.toLowerCase()) || 
                               student.roll.toLowerCase().includes(selectedStudent.toLowerCase())
                             )
                            .map((student) => (
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
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end space-x-2">
              {currentUserRole === "admin" && (
                <DeleteAllAttendanceDialog onDeleteComplete={handleResetData} />
              )}
              <Button onClick={handleDownload} disabled={!activeFilters.class || studentReports.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Download Report
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="comprehensive-student-report">
            {activeFilters.class === "all" || !activeFilters.class ? (
              <Card className="shadow-sm rounded-lg">
                <CardContent className="p-6 text-center text-gray-500">
                  Please select a <strong>specific class</strong> (not 'All Classes') and <strong>Date Range</strong> to view the detailed report.
                </CardContent>
              </Card>
            ) : (
              <ComprehensiveStudentReport 
                semesterId={parseInt(activeFilters.class)} 
                startDate={activeFilters.from} 
                endDate={activeFilters.to}
                filterStudentTerm={selectedStudent} 
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Reports;
