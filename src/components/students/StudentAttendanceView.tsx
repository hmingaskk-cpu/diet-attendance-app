"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getStudentDetailedAttendance } from "@/lib/db";
import LoadingSkeleton from "@/components/LoadingSkeleton";

interface DetailedAttendanceRecord {
  date: string;
  period: number;
  is_present: boolean;
}

interface DailyAttendance {
  [date: string]: {
    [period: number]: boolean; // true for present, false for absent
  };
}

interface StudentAttendanceViewProps {
  studentId: number;
  semesterId: number;
  studentName: string;
  studentRollNumber: string;
  startDate: string; // New prop
  endDate: string;   // New prop
}

const StudentAttendanceView = ({ studentId, semesterId, studentName, studentRollNumber, startDate, endDate }: StudentAttendanceViewProps) => {
  const [detailedReportData, setDetailedReportData] = useState<DetailedAttendanceRecord[]>([]);
  const [overallPercentage, setOverallPercentage] = useState<number>(0);
  const [totalPeriodsMarked, setTotalPeriodsMarked] = useState<number>(0);
  const [totalPresent, setTotalPresent] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchDetailedReport = async () => {
      if (!studentId || !semesterId || !startDate || !endDate) {
        setDetailedReportData([]);
        setOverallPercentage(0);
        setTotalPeriodsMarked(0);
        setTotalPresent(0);
        return;
      }

      setIsLoading(true);
      try {
        const data = await getStudentDetailedAttendance(studentId, semesterId, startDate, endDate);
        setDetailedReportData(data);

        // Calculate overall percentage and totals
        const periodsMarked = data.length;
        const periodsPresent = data.filter(record => record.is_present).length;
        const percentage = periodsMarked > 0 ? Math.round((periodsPresent / periodsMarked) * 100) : 0;
        
        setTotalPeriodsMarked(periodsMarked);
        setTotalPresent(periodsPresent);
        setOverallPercentage(percentage);

      } catch (error: any) {
        toast({
          title: "Error fetching detailed report",
          description: error.message,
          variant: "destructive"
        });
        setDetailedReportData([]);
        setOverallPercentage(0);
        setTotalPeriodsMarked(0);
        setTotalPresent(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetailedReport();
  }, [studentId, semesterId, startDate, endDate, toast]); // Added startDate and endDate to dependencies

  // Process detailed report data for table display
  const dailyAttendance: DailyAttendance = useMemo(() => {
    const result: DailyAttendance = {};
    detailedReportData.forEach(record => {
      if (!result[record.date]) {
        result[record.date] = {};
      }
      result[record.date][record.period] = record.is_present;
    });
    return result;
  }, [detailedReportData]);

  const dates = useMemo(() => Object.keys(dailyAttendance).sort(), [dailyAttendance]);
  const periods = [1, 2, 3, 4, 5, 6]; // Assuming 6 periods

  if (isLoading) {
    return <LoadingSkeleton count={5} height="h-12" className="mt-4" />;
  }

  return (
    <Card className="shadow-sm rounded-lg">
      <CardHeader>
        <CardTitle>Attendance Report for {studentName} ({studentRollNumber})</CardTitle>
        <CardDescription>
          Detailed attendance records across all periods.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 border rounded-lg bg-blue-50 text-blue-800">
            <h3 className="text-sm font-medium">Total Periods Marked</h3>
            <p className="text-2xl font-bold">{totalPeriodsMarked}</p>
          </div>
          <div className="p-4 border rounded-lg bg-green-50 text-green-800">
            <h3 className="text-sm font-medium">Total Present</h3>
            <p className="text-2xl font-bold">{totalPresent}</p>
          </div>
          <div className="p-4 border rounded-lg bg-purple-50 text-purple-800">
            <h3 className="text-sm font-medium">Overall Percentage</h3>
            <Badge
              className="text-xl px-4 py-2"
              variant={overallPercentage > 90 ? "default" : overallPercentage > 75 ? "secondary" : "destructive"}
            >
              {overallPercentage}%
            </Badge>
          </div>
        </div>

        {detailedReportData.length === 0 ? (
          <div className="text-center p-8 text-gray-500">
            No attendance data available for this student in the selected period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-white z-10">Date</TableHead>
                  {periods.map(p => (
                    <TableHead key={p} className="text-center">P{p}</TableHead>
                  ))}
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
                      <TableCell className="font-medium sticky left-0 bg-white z-10">{date}</TableCell>
                      {periods.map(period => (
                        <TableCell key={period} className="text-center">
                          {dailyRecords[period] === true ? (
                            <Badge variant="default">P</Badge>
                          ) : dailyRecords[period] === false ? (
                            <Badge variant="destructive">A</Badge>
                          ) : (
                            <Badge variant="secondary">N/A</Badge>
                          )}
                        </TableCell>
                      ))}
                      <TableCell className="text-right">
                        <Badge
                          variant={dailyPercentage > 90 ? "default" : dailyPercentage > 75 ? "secondary" : "destructive"}
                        >
                          {dailyPercentage}%
                        </Badge>
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

export default StudentAttendanceView;