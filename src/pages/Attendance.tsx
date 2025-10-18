"use client";

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import { supabase } from "@/lib/supabaseClient";
import { Student, AttendanceRecord } from "@/lib/db";

const Attendance = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [facultyName, setFacultyName] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [period, setPeriod] = useState("1");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectAll, setSelectAll] = useState(false);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [students, setStudents] = useState<Student[]>([]);
  const [semesterName, setSemesterName] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/login");
          return;
        }
        
        setFacultyId(user.id);
        
        // Get user details
        const { data: userDetails } = await supabase
          .from('users')
          .select('name')
          .eq('id', user.id)
          .single();
        
        if (userDetails) {
          setFacultyName(userDetails.name);
        }
        
        // Get semester details
        const { data: semesterData } = await supabase
          .from('semesters')
          .select('name')
          .eq('id', id)
          .single();
        
        if (semesterData) {
          setSemesterName(semesterData.name);
        }
        
        // Get students for this semester
        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select('*')
          .eq('semester_id', id)
          .order('roll_number');
        
        if (studentsError) throw studentsError;
        setStudents(studentsData || []);
        
        // Get existing attendance records for this date and period
        const { data: attendanceData, error: attendanceError } = await supabase
          .from('attendance_records')
          .select(`
            student_id,
            is_present
          `)
          .eq('date', date)
          .eq('period', period)
          .eq('semester_id', id);
        
        if (attendanceError) throw attendanceError;
        
        // Initialize attendance state with existing records
        const initialAttendance: Record<string, boolean> = {};
        attendanceData?.forEach(record => {
          initialAttendance[record.student_id.toString()] = record.is_present;
        });
        
        setAttendance(initialAttendance);
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
    
    if (id) {
      fetchData();
    }
  }, [id, date, period, navigate, toast]);

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    const newAttendance: Record<string, boolean> = {};
    students.forEach(student => {
      newAttendance[student.id.toString()] = checked;
    });
    setAttendance(newAttendance);
  };

  const handleAttendanceChange = (studentId: string, checked: boolean) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: checked
    }));
  };

  const handleSubmit = async () => {
    if (!facultyName) {
      toast({
        title: "Faculty Name Required",
        description: "Please enter your name before submitting.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Prepare attendance records
      const attendanceRecords = students.map(student => ({
        date,
        period: parseInt(period),
        faculty_id: facultyId,
        semester_id: parseInt(id || "0"),
        student_id: student.id,
        is_present: attendance[student.id.toString()] ?? false
      }));

      // Delete existing records for this date/period/semester
      await supabase
        .from('attendance_records')
        .delete()
        .eq('date', date)
        .eq('period', period)
        .eq('semester_id', id);

      // Insert new records
      const { error } = await supabase
        .from('attendance_records')
        .insert(attendanceRecords);

      if (error) throw error;

      toast({
        title: "Attendance Submitted",
        description: `Attendance for ${semesterName} (Period ${period}) has been saved.`,
      });
    } catch (error: any) {
      toast({
        title: "Error saving attendance",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading attendance data...</p>
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
          <h1 className="text-2xl md:text-3xl font-bold">Take Attendance</h1>
          <p className="text-gray-600">
            {semesterName} - {date}
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Attendance Details</CardTitle>
            <CardDescription>
              Fill in the details and mark attendance for each student
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="faculty">Faculty Name</Label>
                <div className="flex">
                  <User className="h-10 w-10 p-2 border border-r-0 rounded-l-md bg-gray-100" />
                  <Input
                    id="faculty"
                    placeholder="Enter your name"
                    value={facultyName}
                    onChange={(e) => setFacultyName(e.target.value)}
                    className="rounded-l-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="period">Period</Label>
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6].map((p) => (
                      <SelectItem key={p} value={p.toString()}>
                        Period {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <div className="flex">
                  <Calendar className="h-10 w-10 p-2 border border-r-0 rounded-l-md bg-gray-100" />
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="rounded-l-none"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Student List</CardTitle>
                <CardDescription>
                  Mark attendance for each student
                </CardDescription>
              </div>
              <div className="flex space-x-2 mt-2 md:mt-0">
                <Button
                  variant="outline"
                  onClick={() => handleSelectAll(true)}
                >
                  Select All Present
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleSelectAll(false)}
                >
                  Select All Absent
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectAll}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Roll No.</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <Checkbox
                        checked={attendance[student.id.toString()] || false}
                        onCheckedChange={(checked) => 
                          handleAttendanceChange(student.id.toString(), checked as boolean)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{student.roll_number}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell className="text-right">
                      {attendance[student.id.toString()] === true ? (
                        <Badge>Present</Badge>
                      ) : attendance[student.id.toString()] === false ? (
                        <Badge variant="destructive">Absent</Badge>
                      ) : (
                        <Badge variant="secondary">Not Marked</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="mt-6 flex justify-end">
          <Button onClick={handleSubmit} size="lg">
            <Save className="mr-2 h-4 w-4" />
            Submit Attendance
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Attendance;