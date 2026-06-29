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

const MONTH_OPTIONS = [
  { label: "January", value: 0 }, { label: "February", value: 1 }, { label: "March", value: 2 },
  { label: "April", value: 3 }, { label: "May", value: 4 }, { label: "June", value: 5 },
  { label: "July", value: 6 }, { label: "August", value: 7 }, { label: "September", value: 8 },
  { label: "October", value: 9 }, { label: "November", value: 10 }, { label: "December", value: 11 },
];

// Generate years from current year down to 5 years ago
const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => currentYear - i);

// Helper to safely get the month index (0-11) from a "YYYY-MM-DD" string, avoiding timezone bugs
const getMonthFromDateStr = (dateStr: string) => parseInt(dateStr.split('-')[1], 10) - 1;

const Reports = () => {
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonths, setSelectedMonths] = useState<number[]>([new Date().getMonth()]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  
  const [activeFilters, setActiveFilters] = useState({ year: 0, months: [] as number[], class: "" });

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
        const { data: userDetails } = await supabase.from('users').select('role').eq('id', user.id).single();
        if (userDetails) setCurrentUserRole(userDetails.role);
      }

      const { data: semestersData, error: semestersError } = await supabase.from('semesters').select('*').order('id');
      if (semestersError) throw semestersError;
      setSemesters(semestersData || []);
      
      const { data: studentsData, error: studentsError } = await supabase.from('students').select('*').order('name');
      if (studentsError) throw studentsError;
      setStudents(studentsData || []);
      
    } catch (error: any) {
      toast({ title: "Error loading data", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, [toast]);

  const fetchReportData = async (year: number, months: number[], classId: string) => {
    setIsLoading(true);
    try {
      const studentReportsMap: Record<string, { 
        id: string; name: string; roll: string; class: string; total: number; present: number 
      }> = {};

      // Determine date range for efficient database querying
      const minMonth = Math.min(...months);
      const maxMonth = Math.max(...months);
      const fromDate = `${year}-${String(minMonth + 1).padStart(2, '0')}-01`;
      const toDate = `${year}-${String(maxMonth + 1).padStart(2, '0')}-${String(new Date(year, maxMonth + 1, 0).getDate()).padStart(2, '0')}`;

      if (classId !== "all") {
        const className = semesters.find(s => s.id.toString() === classId)?.name || "Unknown";

        // 1. Load CURRENT students in the class (baseline 0%)
        const studentsInSelectedSemester = students.filter(s => s.semester_id.toString() === classId);
        for (const student of studentsInSelectedSemester) {
          const key = `${student.id}_${classId}`;
          studentReportsMap[key] = { id: key, name: student.name, roll: student.roll_number, class: className, total: 0, present: 0 };
        }

        // 2. Fetch ALL attendance for this class within the broad date span
        const { data: attendanceData, error: attendanceError } = await supabase
          .from('attendance_records')
          .select('student_id, is_present, date, student:students(name, roll_number)')
          .eq('semester_id', classId)
          .gte('date', fromDate).lte('date', toDate);

        if (attendanceError) throw attendanceError;

        // 3. Filter exactly the selected months in memory
        attendanceData?.forEach(record => {
          const recordMonth = getMonthFromDateStr(record.date);
          if (!months.includes(recordMonth)) return; // Skip if it's a month they didn't check off

          const key = `${record.student_id}_${classId}`;
          if (!studentReportsMap[key]) {
            const sData = record.student as any;
            studentReportsMap[key] = { id: key, name: sData?.name || "Unknown", roll: sData?.roll_number || "Unknown", class: className, total: 0, present: 0 };
          }
          studentReportsMap[key].total += 1;
          if (record.is_present) studentReportsMap[key].present += 1;
        });

      } else {
        // "All Classes" logic
        for (const student of students) {
          const key = `${student.id}_${student.semester_id}`;
          const className = semesters.find(s => s.id === student.semester_id)?.name || "Unknown";
          studentReportsMap[key] = { id: key, name: student.name, roll: student.roll_number, class: className, total: 0, present: 0 };
        }

        const { data: allAttendanceRecords, error: allAttendanceError } = await supabase
          .from('attendance_records')
          .select(`student_id, semester_id, is_present, date, student:students (name, roll_number), semester:semesters (name)`)
          .gte('date', fromDate).lte('date', toDate);

        if (allAttendanceError) throw allAttendanceError;

        allAttendanceRecords?.forEach(record => {
          const recordMonth = getMonthFromDateStr(record.date);
          if (!months.includes(recordMonth)) return;

          const key = `${record.student_id}_${record.semester_id}`;
          if (!studentReportsMap[key]) {
            studentReportsMap[key] = {
              id: key, name: (record.student as any)?.name || "Unknown", roll: (record.student as any)?.roll_number || "Unknown",
              class: (record.semester as any)?.name || "Unknown", total: 0, present: 0
            };
          }
          studentReportsMap[key].total += 1;
          if (record.is_present) studentReportsMap[key].present += 1;
        });
      }

      const generatedReports = Object.values(studentReportsMap).map(student => ({
        ...student,
        attendance: student.total > 0 ? Math.round((student.present / student.total) * 100) : 0
      }));
      
      generatedReports.sort((a, b) => {
        if (a.class < b.class) return -1;
        if (a.class > b.class) return 1;
        return a.roll.localeCompare(b.roll);
      });

      setStudentReports(generatedReports);
    } catch (error: any) {
      toast({ title: "Error loading report data", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleGenerateReport = () => {
    if (selectedMonths.length === 0 || !selectedClass) {
      toast({ title: "Incomplete Filters", description: "Please select a Year, at least one Month, and a Class before generating.", variant: "destructive" });
      return;
    }
    setActiveFilters({ year: selectedYear, months: selectedMonths, class: selectedClass });
    fetchReportData(selectedYear, selectedMonths, selectedClass);
    toast({ title: "Generating Report...", description: "Fetching attendance data based on your filters." });
  };

  const handleDownload = () => {
    if (studentReports.length === 0) {
      toast({ title: "No Data to Export", description: "There are no student attendance records to export.", variant: "destructive" });
      return;
    }

    const headers = ["Roll No.", "Student Name", "Class"];
    const dataKeys: (keyof typeof studentReports[0] | "attendance_percentage_string")[] = ["roll", "name", "class"];

    if (selectedReportColumns.includes("total_periods_marked")) { headers.push("Total Periods Marked"); dataKeys.push("total"); }
    if (selectedReportColumns.includes("total_present")) { headers.push("Total Present"); dataKeys.push("present"); }
    if (selectedReportColumns.includes("attendance_percentage")) { headers.push("Attendance %"); dataKeys.push("attendance_percentage_string"); }

    const csvRows = studentReports.map(student => {
      const row: (string | number)[] = [];
      dataKeys.forEach(key => {
        if (key === "attendance_percentage_string") row.push(`${student.attendance}%`);
        else row.push(student[key as keyof typeof student]);
      });
      return row.map(field => `"${field}"`).join(','); 
    });

    const csvString = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `attendance_summary_${activeFilters.year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Report Downloaded", description: "Attendance report has been downloaded." });
  };

  const handleResetData = () => {
    setActiveFilters({ year: 0, months: [], class: "" });
    setStudentReports([]);
    fetchInitialData();
  };

  // Helper to show nicely formatted selected months on the button
  const getMonthsDisplayText = () => {
    if (selectedMonths.length === 0) return "Select Months";
    if (selectedMonths.length === 1) return MONTH_OPTIONS.find(m => m.value === selectedMonths[0])?.label;
    if (selectedMonths.length === 2) return selectedMonths.map(val => MONTH_OPTIONS.find(m => m.value === val)?.label.substring(0, 3)).join(", ");
    return `${selectedMonths.length} months selected`;
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
            <CardDescription>Filter reports by Year, Month(s), and Class</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              
              {/* YEAR SELECTION */}
              <div className="space-y-2">
                <Label htmlFor="year">Year</Label>
                <Select value={selectedYear.toString()} onValueChange={(val) => setSelectedYear(parseInt(val))}>
                  <SelectTrigger><SelectValue placeholder="Select Year" /></SelectTrigger>
                  <SelectContent>
                    {YEAR_OPTIONS.map(year => (<SelectItem key={year} value={year.toString()}>{year}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>

              {/* MONTH SELECTION (MULTI-CHECKBOX) */}
              <div className="space-y-2">
                <Label htmlFor="months">Months</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between font-normal text-left">
                      <span className="truncate">{getMonthsDisplayText()}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 max-h-60 overflow-y-auto">
                    {MONTH_OPTIONS.map((m) => (
                      <DropdownMenuCheckboxItem
                        key={m.value}
                        checked={selectedMonths.includes(m.value)}
                        onCheckedChange={(checked) => {
                          setSelectedMonths((prev) => checked ? [...prev, m.value] : prev.filter((val) => val !== m.value));
                        }}
                      >
                        {m.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* CLASS SELECTION */}
              <div className="space-y-2">
                <Label htmlFor="class">Class</Label>
                <Select value={selectedClass || undefined} onValueChange={setSelectedClass}>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {semesters.map(semester => (<SelectItem key={semester.id} value={semester.id.toString()}>{semester.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>

              {/* STUDENT SEARCH */}
              <div className="space-y-2">
                <Label htmlFor="student">Student Filter (Optional)</Label>
                <Input id="student" placeholder="Filter by name or roll..." value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)} />
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
            <TabsTrigger value="daily-student-report" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
              DAR (Summary)
            </TabsTrigger>
            <TabsTrigger value="comprehensive-student-report" disabled={activeFilters.class === "all" || !activeFilters.class} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
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
                            key={option.value} checked={selectedReportColumns.includes(option.value)}
                            onCheckedChange={(checked) => { setSelectedReportColumns((prev) => checked ? [...prev, option.value] : prev.filter((col) => col !== option.value)); }}
                          >
                            {option.label}
                          </DropdownMenuCheckboxItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardDescription>
                    {activeFilters.year > 0 && activeFilters.class 
                      ? `Showing data for selected months in ${activeFilters.year}` 
                      : "Individual student attendance percentages"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {(!activeFilters.year || activeFilters.months.length === 0 || !activeFilters.class) ? (
                    <div className="text-center p-8 text-gray-500 border rounded-lg bg-gray-50">
                      Please select a Year, Month(s), and Class above, then click <strong>Generate Report</strong> to view students.
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
                            .filter(student => !selectedStudent || student.name.toLowerCase().includes(selectedStudent.toLowerCase()) || student.roll.toLowerCase().includes(selectedStudent.toLowerCase()))
                            .map((student) => (
                            <TableRow key={student.id}>
                              <TableCell><Badge variant="outline">{student.roll}</Badge></TableCell>
                              <TableCell className="font-medium">{student.name}</TableCell>
                              <TableCell>{student.class}</TableCell>
                              {selectedReportColumns.includes("total_periods_marked") && <TableCell>{student.total}</TableCell>}
                              {selectedReportColumns.includes("total_present") && <TableCell>{student.present}</TableCell>}
                              {selectedReportColumns.includes("attendance_percentage") && (
                                <TableCell className="text-right">
                                  <Badge variant={student.attendance > 90 ? "default" : student.attendance > 75 ? "secondary" : "destructive"}>
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
                <Download className="mr-2 h-4 w-4" /> Download Report
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
                year={activeFilters.year} 
                months={activeFilters.months}
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
