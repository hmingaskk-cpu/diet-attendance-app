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
import { Calendar, User, Save, Copy, Trash2 } from "lucide-react"; // Import Copy and Trash2 icons
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { Student, AttendanceRecord } from "@/lib/db";
import LoadingSkeleton from "@/components/LoadingSkeleton"; // Import LoadingSkeleton
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"; // Import AlertDialog

const Attendance = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [facultyName, setFacultyName] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [period, setPeriod] = useState("1");
  const today = new Date().toISOString().split('T')[0]; // Get current date once
  const [date, setDate] = useState(today); // Initialize with current date
  const [selectAll, setSelectAll] = useState(false);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [students, setStudents] = useState<Student[]>([]);
  const [semesterName, setSemesterName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState(""); // New state for current user's role
  // Stores status for each period: { status: 'taken-by-me' | 'taken-by-other', abbreviation?: string }
  const [globalPeriodStatuses, setGlobalPeriodStatuses] = useState<Record<number, { status: 'taken-by-me' | 'taken-by-other' | undefined; abbreviation?: string | null }>>({});
  const [previousPeriodAttendance, setPreviousPeriodAttendance] = useState<Record<string, boolean>>({}); // New state for previous period's attendance

  // Define isCurrentDate here, accessible in JSX
  const isCurrentDate = date === today;

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
        
        // Get user details and role
        const { data: userDetails, error: userDetailsError } = await supabase
          .from('users')
          .select('name, role')
          .eq('id', user.id)
          .single();
        
        if (userDetailsError) throw userDetailsError;
        
        setFacultyName(userDetails?.name || "Faculty");
        setCurrentUserRole(userDetails?.role || ""); // Set the current user's role
        
        // Get semester details
        const { data: semesterData, error: semesterError } = await supabase
          .from('semesters')
          .select('name')
          .eq('id', id)
          .single();
        
        if (semesterError) throw semesterError;
        setSemesterName(semesterData?.name || "");
        
        // Get students for this semester
        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select('*')
          .eq('semester_id', id)
          .order('roll_number');
        
        if (studentsError) throw studentsError;
        setStudents(studentsData || []);
        
        // --- New Logic: Check global attendance status for all periods today ---
        // Fetch all attendance records for the selected date and semester, including faculty abbreviation
        const { data: allAttendanceToday, error: allAttendanceError } = await supabase
          .from('attendance_records')
          .select(`
            period,
            faculty_id,
            faculty:users (abbreviation)
          `)
          .eq('date', date)
          .eq('semester_id', id);
        
        if (allAttendanceError) throw allAttendanceError;
        
        const newGlobalPeriodStatuses: Record<number, { status: 'taken-by-me' | 'taken-by-other' | undefined; abbreviation?: string | null }> = {};
        allAttendanceToday?.forEach(record => {
          const abbreviation = (record.faculty as { abbreviation: string | null })?.abbreviation;
          if (record.faculty_id === user.id) {
            newGlobalPeriodStatuses[record.period] = { status: 'taken-by-me', abbreviation };
          } else {
            newGlobalPeriodStatuses[record.period] = { status: 'taken-by-other', abbreviation };
          }
        });
        setGlobalPeriodStatuses(newGlobalPeriodStatuses);
        // --- End New Logic ---

        // Get existing attendance records for the CURRENTLY SELECTED period
        let attendanceQuery = supabase
          .from('attendance_records')
          .select(`
            student_id,
            is_present
          `)
          .eq('date', date)
          .eq('period', period)
          .eq('semester_id', id);

        const currentPeriodNum = parseInt(period);
        const periodStatus = newGlobalPeriodStatuses[currentPeriodNum]; // Use the newly fetched statuses

        // If the current user is an admin AND the period was taken by someone else,
        // we should load ALL records for that period, not just the admin's.
        // Otherwise, load only records taken by the current user (or if no one took it yet).
        if (!(currentUserRole === 'admin' && periodStatus?.status === 'taken-by-other')) {
          attendanceQuery = attendanceQuery.eq('faculty_id', user.id);
        }
        
        const { data: attendanceData, error: attendanceError } = await attendanceQuery;
        
        if (attendanceError) throw attendanceError;
        
        // Initialize attendance state with existing records
        const initialAttendance: Record<string, boolean> = {};
        attendanceData?.forEach(record => {
          initialAttendance[record.student_id.toString()] = record.is_present;
        });
        
        setAttendance(initialAttendance);

        // --- Fetch attendance for the previous period (if applicable) ---
        if (currentPeriodNum > 1) {
          const previousPeriodNum = currentPeriodNum - 1;
          const { data: prevPeriodData, error: prevPeriodError } = await supabase
            .from('attendance_records')
            .select(`
              student_id,
              is_present
            `)
            .eq('date', date)
            .eq('period', previousPeriodNum)
            .eq('semester_id', id);
          
          if (prevPeriodError) throw prevPeriodError;

          const prevAttendanceMap: Record<string, boolean> = {};
          prevPeriodData?.forEach(record => {
            prevAttendanceMap[record.student_id.toString()] = record.is_present;
          });
          setPreviousPeriodAttendance(prevAttendanceMap);
        } else {
          setPreviousPeriodAttendance({}); // Clear if on first period
        }

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
  }, [id, date, period, navigate, toast, currentUserRole]); // Added currentUserRole to dependencies

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

  const handleCopyFromPrevious = () => {
    if (Object.keys(previousPeriodAttendance).length === 0) {
      toast({
        title: "No Previous Attendance",
        description: `No attendance records found for Period ${parseInt(period) - 1} on ${date}.`,
        variant: "destructive"
      });
      return;
    }

    setAttendance(previousPeriodAttendance);
    
    // Check if all students were present in the previous period to update selectAll checkbox
    const allPresentInPrevious = students.every(student => previousPeriodAttendance[student.id.toString()] === true);
    setSelectAll(allPresentInPrevious);

    toast({
      title: "Attendance Copied",
      description: `Attendance copied from Period ${parseInt(period) - 1}.`,
    });
  };

  const handleSubmit = async () => {
    console.log("handleSubmit triggered!");

    if (!facultyId) {
      toast({
        title: "Authentication Error",
        description: "Faculty ID not found. Please log in again.",
        variant: "destructive"
      });
      return;
    }

    const currentPeriodNum = parseInt(period);
    const periodStatus = globalPeriodStatuses[currentPeriodNum];
    const isCurrentDate = date === today; // Check if the selected date is today

    // If attendance is taken by another faculty and current user is NOT admin, prevent submission
    if (periodStatus?.status === 'taken-by-other' && currentUserRole !== 'admin') {
      toast({
        title: "Attendance Already Taken",
        description: `Attendance for Period ${period} on ${date} has already been submitted by another faculty member. You cannot modify it.`,
        variant: "destructive"
      });
      return;
    }

    try {
      // If attendance was taken by another faculty and current user IS admin, warn them
      if (periodStatus?.status === 'taken-by-other' && currentUserRole === 'admin') {
        toast({
          title: "Overwriting Attendance",
          description: `You are overwriting attendance for Period ${period} on ${date} previously submitted by another faculty.`,
          variant: "warning",
          duration: 5000,
        });
      }

      // Prepare attendance records for Supabase
      const attendanceRecordsForSupabase = students.map(student => ({
        date,
        period: currentPeriodNum,
        faculty_id: facultyId, // Always use the current faculty's ID for the new records
        semester_id: parseInt(id || "0"),
        student_id: student.id,
        is_present: attendance[student.id.toString()] ?? false
      }));

      // Delete existing records for this date/period/semester
      // If admin, delete ALL records for this period/date/semester.
      // If faculty, delete only their OWN records for this period/date/semester (if they had taken it).
      let deleteQuery = supabase
        .from('attendance_records')
        .delete()
        .eq('date', date)
        .eq('period', period)
        .eq('semester_id', id);
      
      if (currentUserRole !== 'admin') {
        deleteQuery = deleteQuery.eq('faculty_id', facultyId);
      }

      const { error: deleteError } = await deleteQuery;
      if (deleteError) throw deleteError;

      // Insert new records into Supabase
      const { error: insertError } = await supabase
        .from('attendance_records')
        .insert(attendanceRecordsForSupabase);

      if (insertError) throw insertError;

      toast({
        title: isCurrentDate ? "Attendance Submitted" : "Attendance Updated",
        description: `Attendance for ${semesterName} (Period ${period}) on ${date} has been ${isCurrentDate ? "saved" : "updated"}.`,
      });

      // Update global period status to 'taken-by-me' after successful submission
      // We need to fetch the current user's abbreviation to update the status correctly
      const { data: currentUserDetails, error: currentUserDetailsError } = await supabase
        .from('users')
        .select('abbreviation')
        .eq('id', facultyId)
        .single();

      if (currentUserDetailsError) throw currentUserDetailsError;

      setGlobalPeriodStatuses(prev => ({
        ...prev,
        [currentPeriodNum]: { status: 'taken-by-me', abbreviation: currentUserDetails?.abbreviation }
      }));

      // --- Invoke Edge Function for Google Sheets Export using direct fetch ---
      if (isCurrentDate) { // Only export if it's the current date
        try {
          const studentsForExport = students.map(student => ({
            name: student.name,
            roll_number: student.roll_number,
            is_present: attendance[student.id.toString()] ?? false,
          }));

          const exportBody = {
            date,
            period: currentPeriodNum,
            semesterName,
            facultyName,
            studentsAttendance: studentsForExport,
          };

          console.log("Client-side: Sending body to Edge Function (direct fetch):", exportBody);

          const { data: { session } } = await supabase.auth.getSession();
          const accessToken = session?.access_token;

          if (!accessToken) {
            throw new Error("User not authenticated for Edge Function export.");
          }

          const edgeFunctionUrl = `https://ligxffklcdiosnitdqim.supabase.co/functions/v1/export-attendance-to-sheets`;

          const response = await fetch(edgeFunctionUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify(exportBody),
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Edge Function returned a non-2xx status: ${response.status} - ${errorText}`);
          }

          const result = await response.json();
          console.log("Google Sheets Export successful:", result);
          toast({
            title: "Google Sheets Exported",
            description: "Attendance data has been exported to Google Sheets.",
          });
          
        } catch (exportInvokeError: any) {
          console.error("Unexpected error during Edge Function invocation:", exportInvokeError);
          toast({
            title: "Google Sheets Export Failed",
            description: `An unexpected error occurred during Google Sheets export: ${exportInvokeError.message}`,
            variant: "destructive",
          });
        }
      }
      // --- End Edge Function Invocation ---

    } catch (error: any) {
      toast({
        title: "Error saving attendance",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDeleteAttendance = async () => {
    if (!facultyId) {
      toast({
        title: "Authentication Error",
        description: "Faculty ID not found. Please log in again.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      let deleteQuery = supabase
        .from('attendance_records')
        .delete()
        .eq('date', date)
        .eq('period', period)
        .eq('semester_id', id);

      // If not admin, restrict deletion to their own records.
      // RLS will also enforce this, but it's good practice to filter client-side.
      if (currentUserRole !== 'admin') {
        deleteQuery = deleteQuery.eq('faculty_id', facultyId);
      }

      const { error } = await deleteQuery;

      if (error) throw error;

      toast({
        title: "Attendance Deleted",
        description: `Attendance for Period ${period} on ${date} has been deleted.`,
      });

      // Clear attendance state and update global period status
      setAttendance({});
      setSelectAll(false); // Reset select all checkbox
      setGlobalPeriodStatuses(prev => {
        const newState = { ...prev };
        delete newState[parseInt(period)]; // Remove the status for the deleted period
        return newState;
      });

    } catch (error: any) {
      toast({
        title: "Error deleting attendance",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Disable submission only if it's taken by another faculty AND the current user is NOT an admin
  const isSubmitDisabled = globalPeriodStatuses[parseInt(period)]?.status === 'taken-by-other' && currentUserRole !== 'admin';

  // Disable delete button if no attendance is taken for this period,
  // OR if it's taken by another faculty and current user is NOT admin.
  const currentPeriodStatus = globalPeriodStatuses[parseInt(period)];
  const isDeleteDisabled = !currentPeriodStatus || (currentPeriodStatus.status === 'taken-by-other' && currentUserRole !== 'admin');


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
          <h1 className="text-2xl md:text-3xl font-bold">Take Attendance</h1>
          <p className="text-gray-600">
            {semesterName} - {date}
          </p>
        </div>

        <Card className="shadow-sm rounded-lg mb-6">
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
                    readOnly // Faculty name should ideally come from auth and not be editable here
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
                    {[1, 2, 3, 4, 5, 6].map((p) => {
                      const statusInfo = globalPeriodStatuses[p];
                      let itemClassName = "";
                      let statusText = "";

                      if (statusInfo?.status === 'taken-by-me') {
                        itemClassName = "text-primary font-medium";
                        statusText = "(Taken by you)";
                      } else if (statusInfo?.status === 'taken-by-other') {
                        itemClassName = "text-destructive font-medium";
                        statusText = statusInfo.abbreviation ? `(Taken by ${statusInfo.abbreviation})` : "(Taken by other)";
                      }

                      return (
                        <SelectItem 
                          key={p} 
                          value={p.toString()}
                          className={itemClassName}
                        >
                          Period {p} {statusText}
                        </SelectItem>
                      );
                    })}
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
            {isSubmitDisabled && (
              <p className="text-destructive text-sm mt-2"> {/* Use destructive color */}
                Attendance for Period {period} on {date} has already been submitted by another faculty member. You cannot modify it.
              </p>
            )}
            {globalPeriodStatuses[parseInt(period)]?.status === 'taken-by-other' && currentUserRole === 'admin' && (
              <p className="text-orange-600 text-sm mt-2">
                As an admin, you can overwrite this attendance record. Submitting will replace the existing data.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-lg">
          <CardHeader>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4"> {/* Added flex-col and gap-4 for responsiveness */}
              <div>
                <CardTitle>Student List</CardTitle>
                <CardDescription>
                  Mark attendance for each student
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2"> {/* Changed to flex-wrap gap-2 */}
                {parseInt(period) > 1 && (
                  <Button
                    variant="outline"
                    onClick={handleCopyFromPrevious}
                    disabled={isSubmitDisabled || Object.keys(previousPeriodAttendance).length === 0}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy from Period {parseInt(period) - 1}
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => handleSelectAll(true)}
                  disabled={isSubmitDisabled}
                >
                  Select All Present
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleSelectAll(false)}
                  disabled={isSubmitDisabled}
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
                      disabled={isSubmitDisabled}
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
                        disabled={isSubmitDisabled}
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

        <div className="mt-6 flex flex-wrap justify-end gap-2"> {/* Changed to flex-wrap gap-2 */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isDeleteDisabled}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Attendance
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete attendance for Period {period} on {date}? This action cannot be undone.
                  {currentPeriodStatus?.status === 'taken-by-other' && currentUserRole === 'admin' && (
                    <p className="text-orange-600 mt-2">
                      As an admin, this will permanently delete the attendance record for this period, even if taken by another faculty.
                    </p>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAttendance}>
                  Confirm Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="lg" disabled={isSubmitDisabled}>
                <Save className="mr-2 h-4 w-4" />
                {isCurrentDate ? "Submit Attendance" : "Update Attendance"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {isCurrentDate ? "Confirm Attendance Submission" : "Confirm Attendance Update"}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to {isCurrentDate ? "submit" : "update"} attendance for Period {period} on {date}?
                  {globalPeriodStatuses[parseInt(period)]?.status === 'taken-by-other' && currentUserRole === 'admin' && (
                    <p className="text-orange-600 mt-2">
                      As an admin, this action will overwrite existing attendance data for this period.
                    </p>
                  )}
                  {!isCurrentDate && (
                    <p className="text-gray-500 mt-2">
                      Note: Updating past attendance will not export data to Google Sheets.
                    </p>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleSubmit}>
                  {isCurrentDate ? "Confirm Submit" : "Confirm Update"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
};

export default Attendance;