"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getStudentsBySemester, getStudentDetailedAttendance, Student } from "@/lib/db";
import { supabase } from "@/lib/supabaseClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface ComprehensiveStudentReportProps {
  semesterId: number;
  year: number;
  months: number[];
  filterStudentTerm: string;
}

interface DetailedAttendanceRecord {
  date: string;
  period: number;
  is_present: boolean;
}

interface DailyAttendance {
  [date: string]: {
    [period: number]: boolean;
  };
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return "";
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

// Helper to safely get the month index (0-11) from a "YYYY-MM-DD" string
const getMonthFromDateStr = (dateStr: string) => parseInt(dateStr.split('-')[1], 10) - 1;

const ComprehensiveStudentReport = ({ semesterId, year, months, filterStudentTerm }: ComprehensiveStudentReportProps) => {
  const [studentsInSemester, setStudentsInSemester] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [detailedReportData, setDetailedReportData] = useState<DetailedAttendanceRecord[]>([]);
  const [overallPercentage, setOverallPercentage] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchStudents = async () => {
      if (!semesterId || !year || months.length === 0) {
        setStudentsInSemester([]);
        setSelectedStudentId(null);
        return;
      }
      try {
        const currentStudents = await getStudentsBySemester(semesterId);

        const minMonth = Math.min(...months);
        const maxMonth = Math.max(...months);
        const startDate = `${year}-${String(minMonth + 1).padStart(2, '0')}-01`;
        const endDate = `${year}-${String(maxMonth + 1).padStart(2, '0')}-${String(new Date(year, maxMonth + 1, 0).getDate()).padStart(2, '0')}`;

        const { data: historicalData, error: historicalError } = await supabase
          .from('attendance_records')
          .select('student_id, date, student:students(id, name, roll_number, semester_id)')
          .eq('semester_id', semesterId)
          .gte('date', startDate)
          .lte('date', endDate);

        if (historicalError) throw historicalError;

        const studentMap = new Map();
        currentStudents.forEach(s => studentMap.set(s.id.toString(), s));

        historicalData?.forEach(record => {
          // Filter exact selected months in JS
          if (!months.includes(getMonthFromDateStr(record.date))) return;

          const sId = record.student_id.toString();
          if (!studentMap.has(sId) && record.student) {
            studentMap.set(sId, record.student as any);
          }
        });

        const mergedStudents = Array.from(studentMap.values());
        mergedStudents.sort((a, b) => a.roll_number.localeCompare(b.roll_number));

        setStudentsInSemester(mergedStudents);
        
        if (selectedStudentId && mergedStudents.some(s => s.id.toString() === selectedStudentId)) {
          // Keep current selection
        } else {
          setSelectedStudentId(null); 
        }
      } catch (error: any) {
        toast({ title: "Error fetching students", description: error.message, variant: "destructive" });
        setStudentsInSemester([]);
        setSelectedStudentId(null);
      }
    };
    fetchStudents();
  }, [semesterId, year, months, toast]);

  useEffect(() => {
    const fetchDetailedReport = async () => {
      if (!selectedStudentId || !year || months.length === 0) { 
        setDetailedReportData([]);
        setOverallPercentage(0);
        return;
      }

      setIsLoading(true);
      try {
        const minMonth = Math.min(...months);
        const maxMonth = Math.max(...months);
        const startDate = `${year}-${String(minMonth + 1).padStart(2, '0')}-01`;
        const endDate = `${year}-${String(maxMonth + 1).padStart(2, '0')}-${String(new Date(year, maxMonth + 1, 0).getDate()).padStart(2, '0')}`;

        const data = await getStudentDetailedAttendance(
          parseInt(selectedStudentId), 
          semesterId, 
          startDate, 
          endDate
        );

        // Filter exact selected months
        const exactMonthData = data.filter(record => months.includes(getMonthFromDateStr(record.date)));
        setDetailedReportData(exactMonthData);

        const totalPeriods = exactMonthData.length;
        const periodsPresent = exactMonthData.filter(record => record.is_present).length;
        const percentage = totalPeriods > 0 ? Math.round((periodsPresent / totalPeriods) * 100) : 0;
        setOverallPercentage(percentage);

      } catch (error: any) {
        toast({ title: "Error fetching detailed report", description: error.message, variant: "destructive" });
        setDetailedReportData([]);
        setOverallPercentage(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetailedReport();
  }, [selectedStudentId, semesterId, year, months, toast]);

  const filteredStudents = useMemo(() => {
    if (!filterStudentTerm) return studentsInSemester;
    const lowerCaseTerm = filterStudentTerm.toLowerCase();
    return studentsInSemester.filter(student =>
      student.name.toLowerCase().includes(lowerCaseTerm) || student.roll_number.toLowerCase().includes(lowerCaseTerm)
    );
  }, [studentsInSemester, filterStudentTerm]);

  const dailyAttendance: DailyAttendance = useMemo(() => {
    const result: DailyAttendance = {};
    detailedReportData.forEach(record => {
      if (!result[record.date]) result[record.date] = {};
      result[record.date][record.period] = record.is_present;
    });
    return result;
  }, [detailedReportData]);

  const dates = useMemo(() => Object.keys(dailyAttendance).sort(), [dailyAttendance]);
  const periods = [1, 2, 3, 4, 5, 6]; 

  const handleDownload = () => {
    if (!selectedStudentId || detailedReportData.length === 0) {
      toast({ title: "No Data to Export", description: "Please select a student and ensure there is attendance data to export.", variant: "destructive" });
      return;
    }

    const student = studentsInSemester.find(s => s.id.toString() === selectedStudentId);
    if (!student) return;

    const headers = ["Date", ...periods.map(p => `Period ${p}`), "Daily Status"];
    const csvRows = dates.map(date => {
      const row: (string | boolean)[] = [formatDate(date)];
      let dailyPresentCount = 0;
      let dailyMarkedCount = 0;

      periods.forEach(period => {
        const isPresent = dailyAttendance[date][period];
        if (isPresent !== undefined) {
          row.push(isPresent ? "Present" : "Absent");
          dailyMarkedCount++;
          if (isPresent) dailyPresentCount++;
        } else {
          row.push("N/A");
        }
      });

      row.push(dailyMarkedCount > 0 ? `${Math.round((dailyPresentCount / dailyMarkedCount) * 100)}% Present` : "No Data");
      return row.map(field => `"${field}"`).join(',');
    });

    const overallSummary = [
      `"Student Name","${student.name}"`,
      `"Roll Number","${student.roll_number}"`,
      `"Report Class","Class ID: ${semesterId}"`, 
      `"Overall Attendance Percentage","${overallPercentage}%"`
    ].join('\n');

    const csvString = [overallSummary, "", headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    
    link.setAttribute('download', `detailed_attendance_${student.roll_number}_${year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Report Downloaded", description: "Detailed attendance report has been downloaded." });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Generating detailed report...</p>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Comprehensive Student Attendance</CardTitle>
            <CardDescription>Detailed attendance records for a single student in the selected semester.</CardDescription>
          </div>
          <Button onClick={handleDownload} className="mt-2 md:mt-0" disabled={!selectedStudentId || detailedReportData.length === 0}>
            <Download className="mr-2 h-4 w-4" /> Download Detailed Report
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 mb-6">
          <div className="space-y-2">
            <Label htmlFor="select-student">Select Student</Label>
            {(!semesterId || !year || months.length === 0) ? (
              <div className="p-3 bg-gray-50 border rounded-md text-sm text-gray-500">
                Please select Year, Month(s), and Class above to view students.
              </div>
            ) : (
              <>
                <Select value={selectedStudentId || ""} onValueChange={setSelectedStudentId} disabled={filteredStudents.length === 0}>
                  <SelectTrigger id="select-student"><SelectValue placeholder="Select a student" /></SelectTrigger>
                  <SelectContent>
                    {filteredStudents.map(student => (
                      <SelectItem key={student.id} value={student.id.toString()}>
                        {student.roll_number} - {student.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {filteredStudents.length === 0 && filterStudentTerm && (<p className="text-sm text-red-500">No students found matching "{filterStudentTerm}".</p>)}
                {filteredStudents.length === 0 && !filterStudentTerm && (<p className="text-sm text-gray-500">No students available.</p>)}
              </>
            )}
          </div>
        </div>

        {selectedStudentId && (
          <div className="mb-6 p-4 border rounded-lg bg-blue-50 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-blue-800">Overall Attendance:</h3>
            <Badge className="text-xl px-4 py-2" variant={overallPercentage > 90 ? "default" : overallPercentage > 75 ? "secondary" : "destructive"}>
              {overallPercentage}%
            </Badge>
          </div>
        )}

        {!selectedStudentId ? (
          <div className="text-center p-8 text-gray-500">Please select a student to view their detailed attendance report.</div>
        ) : detailedReportData.length === 0 ? (
          <div className="text-center p-8 text-gray-500">No attendance data available for the selected student in this date range.</div>
        ) : (
          <div className="overflow-x-auto"> 
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-white z-10">Date</TableHead>
                  {periods.map(p => (<TableHead key={p} className="text-center">P{p}</TableHead>))}
                  <TableHead className="text-right">Daily %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dates.map(date => {
                  const dailyRecords = dailyAttendance[date];
                  let dailyPresentCount = 0;
                  let dailyMarkedCount = 0;

                  periods.forEach(period => {
                    if (dailyRecords[period] !== undefined) {
                      dailyMarkedCount++;
                      if (dailyRecords[period]) dailyPresentCount++;
                    }
                  });

                  const dailyPercentage = dailyMarkedCount > 0 ? Math.round((dailyPresentCount / dailyMarkedCount) * 100) : 0;

                  return (
                    <TableRow key={date}>
                      <TableCell className="font-medium sticky left-0 bg-white z-10">{formatDate(date)}</TableCell>
                      {periods.map(period => (
                        <TableCell key={period} className="text-center">
                          {dailyRecords[period] === true ? (<Badge variant="default">P</Badge>) : dailyRecords[period] === false ? (<Badge variant="destructive">A</Badge>) : (<Badge variant="secondary">N/A</Badge>)}
                        </TableCell>
                      ))}
                      <TableCell className="text-right">
                        <Badge variant={dailyPercentage > 90 ? "default" : dailyPercentage > 75 ? "secondary" : "destructive"}>{dailyPercentage}%</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ComprehensiveStudentReport;
