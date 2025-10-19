"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getComprehensiveStudentAttendance } from "@/lib/db";
import Papa from "papaparse";

interface ComprehensiveStudentReportProps {
  semesterId: number;
  startDate: string;
  endDate: string;
}

interface StudentReportRow {
  studentId: number;
  studentName: string;
  rollNumber: string;
  semesterName: string;
  totalPeriodsMarked: number;
  periodsPresent: number;
  totalDaysInPeriod: number; // Total unique days attendance was marked for this student
  daysPresent: number; // Total unique days student was present for at least one period
  overallPercentage: number;
}

const ComprehensiveStudentReport = ({ semesterId, startDate, endDate }: ComprehensiveStudentReportProps) => {
  const [reportData, setReportData] = useState<StudentReportRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchAndProcessReport = async () => {
      if (!semesterId || !startDate || !endDate) {
        setReportData([]);
        return;
      }

      setIsLoading(true);
      try {
        const rawAttendance = await getComprehensiveStudentAttendance(semesterId, startDate, endDate);

        const studentMap = new Map<number, {
          studentName: string;
          rollNumber: string;
          semesterName: string;
          totalPeriodsMarked: number;
          periodsPresent: number;
          daysAttended: Set<string>; // To count unique days present
          daysMarked: Set<string>; // To count unique days attendance was marked
        }>();

        rawAttendance.forEach(record => {
          const studentId = record.student?.id || 0;
          if (!studentId) return;

          if (!studentMap.has(studentId)) {
            studentMap.set(studentId, {
              studentName: record.student?.name || "N/A",
              rollNumber: record.student?.roll_number || "N/A",
              semesterName: record.semester?.name || "N/A",
              totalPeriodsMarked: 0,
              periodsPresent: 0,
              daysAttended: new Set<string>(),
              daysMarked: new Set<string>(),
            });
          }

          const studentStats = studentMap.get(studentId)!;
          studentStats.totalPeriodsMarked++;
          studentStats.daysMarked.add(record.date);

          if (record.is_present) {
            studentStats.periodsPresent++;
            studentStats.daysAttended.add(record.date);
          }
        });

        const processedData: StudentReportRow[] = Array.from(studentMap.entries()).map(([studentId, stats]) => {
          const overallPercentage = stats.totalPeriodsMarked > 0
            ? Math.round((stats.periodsPresent / stats.totalPeriodsMarked) * 100)
            : 0;
          return {
            studentId,
            studentName: stats.studentName,
            rollNumber: stats.rollNumber,
            semesterName: stats.semesterName,
            totalPeriodsMarked: stats.totalPeriodsMarked,
            periodsPresent: stats.periodsPresent,
            totalDaysInPeriod: stats.daysMarked.size,
            daysPresent: stats.daysAttended.size,
            overallPercentage,
          };
        }).sort((a, b) => a.studentName.localeCompare(b.studentName)); // Sort by student name

        setReportData(processedData);

      } catch (error: any) {
        toast({
          title: "Error generating comprehensive report",
          description: error.message,
          variant: "destructive"
        });
        setReportData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAndProcessReport();
  }, [semesterId, startDate, endDate, toast]);

  const handleDownload = () => {
    if (reportData.length === 0) {
      toast({
        title: "No Data to Export",
        description: "There are no comprehensive student attendance records to export.",
        variant: "destructive"
      });
      return;
    }

    const headers = [
      "Roll Number",
      "Student Name",
      "Semester",
      "Total Periods Marked",
      "Periods Present",
      "Total Days Attendance Marked",
      "Days Present",
      "Overall Attendance %"
    ];
    const csvRows = reportData.map(row => [
      row.rollNumber,
      row.studentName,
      row.semesterName,
      row.totalPeriodsMarked,
      row.periodsPresent,
      row.totalDaysInPeriod,
      row.daysPresent,
      `${row.overallPercentage}%`
    ].map(field => `"${field}"`).join(','));

    const csvString = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `comprehensive_attendance_report_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Report Downloaded",
      description: "Comprehensive attendance report has been downloaded.",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Generating comprehensive report...</p>
        </div>
      </div>
    );
  }

  if (reportData.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500">
        No comprehensive attendance data available for the selected filters.
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Comprehensive Student Attendance</CardTitle>
            <CardDescription>
              Detailed attendance records for students in the selected semester.
            </CardDescription>
          </div>
          <Button onClick={handleDownload} className="mt-2 md:mt-0">
            <Download className="mr-2 h-4 w-4" />
            Download Full Report
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Roll No.</TableHead>
                <TableHead>Student Name</TableHead>
                <TableHead>Semester</TableHead>
                <TableHead className="text-center">Total Periods Marked</TableHead>
                <TableHead className="text-center">Periods Present</TableHead>
                <TableHead className="text-center">Total Days Marked</TableHead>
                <TableHead className="text-center">Days Present</TableHead>
                <TableHead className="text-right">Overall %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportData.map((row) => (
                <TableRow key={row.studentId}>
                  <TableCell>
                    <Badge variant="outline">{row.rollNumber}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{row.studentName}</TableCell>
                  <TableCell>{row.semesterName}</TableCell>
                  <TableCell className="text-center">{row.totalPeriodsMarked}</TableCell>
                  <TableCell className="text-center">{row.periodsPresent}</TableCell>
                  <TableCell className="text-center">{row.totalDaysInPeriod}</TableCell>
                  <TableCell className="text-center">{row.daysPresent}</TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant={row.overallPercentage > 90 ? "default" : row.overallPercentage > 75 ? "secondary" : "destructive"}
                    >
                      {row.overallPercentage}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default ComprehensiveStudentReport;