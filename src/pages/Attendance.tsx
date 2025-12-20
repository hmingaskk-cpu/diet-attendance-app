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
import { Calendar, User, Save, Copy, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { Student, AttendanceRecord, getSubjects, Subject, getStudentsBySemester, getStudentsWithoutOptionalSubject } from "@/lib/db";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const Attendance = () => {
  const { id } = useParams(); // id is semesterId
  const navigate = useNavigate();
  const { toast } = useToast();
  const [facultyName, setFacultyName] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [period, setPeriod] = useState("1");
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [selectAll, setSelectAll] = useState(false);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [students, setStudents] = useState<Student[]>([]);
  const [semesterName, setSemesterName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState("");
  const [globalPeriodStatuses, setGlobalPeriodStatuses] = useState<Record<number, { status: 'taken-by-me' | 'taken-by-other' | undefined; abbreviation?: string | null }>>({});
  const [previousPeriodAttendance, setPreviousPeriodAttendance] = useState<Record<string, boolean>>({});
  const [cachedAttendance, setCachedAttendance] = useState<any | null>(null);

  // States for optional subjects
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("none"); // Initialize with "none"
  const [otherSubjectsId, setOtherSubjectsId] = useState<string | null>(null); // To store the ID of 'Other Subjects'

  const isCurrentDate = date === today;
  const isFourthSemester = parseInt(id || "0") === 4;

  // Effect for fetching static data (semesters, subjects)
  useEffect(() => {
    const fetchStaticData = async () => {
      if (!id) return;

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/login");
          return;
        }
        setFacultyId(user.id);

        const { data: userDetails, error: userDetailsError } = await supabase
          .from('users')
          .select('name, role')
          .eq('id', user.id)
          .single();
        if (userDetailsError) throw userDetailsError;
        setFacultyName(userDetails?.name || "Faculty");
        setCurrentUserRole(userDetails?.role || "");

        const { data: semesterData, error: semesterError } = await supabase
          .from('semesters')
          .select('name')
          .eq('id', id)
          .single();
        if (semesterError) throw semesterError;
        setSemesterName(semesterData?.name || "");

        if (isFourthSemester) {
          const subjectsData = await getSubjects();
          
          if (subjectsData && subjectsData.length > 0) {
            setSubjects(subjectsData);
            const otherSub = subjectsData.find(s => s.name === 'Other Subjects');
            if (otherSub) {
              setOtherSubjectsId(otherSub.id.toString());
            }

            // Set default selectedSubjectId to "none" on initial load for 4th semester
            setSelectedSubjectId(prevSelectedSubjectId => {
              if (prevSelectedSubjectId === "none" || !subjectsData.some(s => s.id.toString() === prevSelectedSubjectId)) {
                return "none";
              }
              return prevSelectedSubjectId;
            });
          } else {
            setSubjects([]);
            setOtherSubjectsId(null);
            setSelectedSubjectId("none");
            toast({
              title: "No Optional Subjects Found",
              description: "Please ensure optional subjects (Maths, Science, English, Social Studies) are added to the 'subjects' table in Supabase.",
              variant: "destructive",
              duration: 7000,
            });
          }
        } else {
          setSubjects([]);
          setOtherSubjectsId(null);
          setSelectedSubjectId("none");
        }
      } catch (error: any) {
        toast({
          title: "Error loading initial data",
          description: error.message,
          variant: "destructive"
        });
      }
    };

    fetchStaticData();
  }, [id, navigate, toast, isFourthSemester]);

  // Effect for fetching dynamic data (students, attendance, period statuses)
  useEffect(() => {
    const fetchDynamicData = async () => {
      if (!id || !facultyId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        let studentsData: Student[] = [];
        if (isFourthSemester) {
          if (selectedSubjectId === "none") {
            // "None" selected, fetch students without any optional subject assigned
            studentsData = await getStudentsWithoutOptionalSubject(parseInt(id));
          } else if (selectedSubjectId === otherSubjectsId) {
            // "Other Subjects" selected, fetch all students for the 4th semester
            studentsData = await getStudentsBySemester(parseInt(id));
          } else {
            // Specific optional subject selected, fetch students assigned to that subject
            studentsData = await getStudentsBySemester(
              parseInt(id),
              parseInt(selectedSubjectId)
            );
          }
        } else {
          // Not 4th semester, fetch all students for the semester
          studentsData = await getStudentsBySemester(parseInt(id));
        }
        setStudents(studentsData || []);

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
          if (record.faculty_id === facultyId) {
            newGlobalPeriodStatuses[record.period] = { status: 'taken-by-me', abbreviation };
          } else {
            newGlobalPeriodStatuses[record.period] = { status: 'taken-by-other', abbreviation };
          }
        });
        setGlobalPeriodStatuses(newGlobalPeriodStatuses);

        // Check for cached data first
        const cachedKey = `cachedAttendance_${facultyId}_${id}_${date}_${period}_${selectedSubjectId || 'no_subject'}`;
        const storedCachedData = localStorage.getItem(cachedKey);

        if (storedCachedData) {
          const parsedCachedData = JSON.parse(storedCachedData);
          setCachedAttendance(parsedCachedData);

          const cachedRecordsMap: Record<string, boolean> = {};
          parsedCachedData.records.forEach((record: any) => {
            cachedRecordsMap[record.student_id.toString()] = record.is_present;
          });
          setAttendance(cachedRecordsMap);

          const allPresentInCache = studentsData.every(student => cachedRecordsMap[student.id.toString()] === true);
          setSelectAll(allPresentInCache);

          toast({
            title: "Offline Data Found",
            description: "Attendance data for this period was previously saved offline. Please review and submit.",
            variant: "default",
            duration: 7000,
          });
        } else {
          // If no cached data, then fetch existing attendance from DB
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
          const periodStatus = newGlobalPeriodStatuses[currentPeriodNum];

          if (!(currentUserRole === 'admin' && periodStatus?.status === 'taken-by-other')) {
            attendanceQuery = attendanceQuery.eq('faculty_id', facultyId);
          }

          const { data: attendanceData, error: attendanceError } = await attendanceQuery;

          if (attendanceError) throw attendanceError;

          const initialAttendance: Record<string, boolean> = {};
          attendanceData?.forEach(record => {
            initialAttendance[record.student_id.toString()] = record.is_present;
          });

          setAttendance(initialAttendance);
          setCachedAttendance(null); // Ensure cachedAttendance is null if no cache
        }

        if (parseInt(period) > 1) {
          const previousPeriodNum = parseInt(period) - 1;
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
          setPreviousPeriodAttendance({});
        }

      } catch (error: any) {
        toast({
          title: "Error loading attendance data",
          description: error.message,
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDynamicData();
  }, [id, date, period, facultyId, currentUserRole, isFourthSemester, selectedSubjectId, otherSubjectsId, toast]);

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

    const allPresentInPrevious = students.every(student => previousPeriodAttendance[student.id.toString()] === true);
    setSelectAll(allPresentInPrevious);

    toast({
      title: "Attendance Copied",
      description: `Attendance copied from Period ${parseInt(period) - 1}.`,
    });
  };

  const handleSubmit = async () => {
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
    const isCurrentDate = date === today;

    if (periodStatus?.status === 'taken-by-other' && currentUserRole !== 'admin') {
      toast({
        title: "Attendance Already Taken",
        description: `Attendance for Period ${period} on ${date} has already been submitted by another faculty member. You cannot modify it.`,
        variant: "destructive"
      });
      return;
    }

    try {
      if (periodStatus?.status === 'taken-by-other' && currentUserRole === 'admin') {
        toast({
          title: "Overwriting Attendance",
          description: `You are overwriting attendance for Period ${period} on ${date} previously submitted by another faculty.`,
          variant: "warning",
          duration: 5000,
        });
      }

      const attendanceRecordsForSupabase = students.map(student => ({
        date,
        period: currentPeriodNum,
        faculty_id: facultyId,
        semester_id: parseInt(id || "0"),
        student_id: student.id,
        is_present: attendance[student.id.toString()] ?? false
      }));

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

      const { error: insertError } = await supabase
        .from('attendance_records')
        .insert(attendanceRecordsForSupabase);

      if (insertError) throw insertError;

      // If successful, clear cached data
      const cachedKey = `cachedAttendance_${facultyId}_${id}_${date}_${period}_${selectedSubjectId || 'no_subject'}`;
      localStorage.removeItem(cachedKey);
      setCachedAttendance(null);

      toast({
        title: isCurrentDate ? "Attendance Submitted" : "Attendance Updated",
        description: `Attendance for ${semesterName} (Period ${period}) on ${date} has been ${isCurrentDate ? "saved" : "updated"}.`,
      });

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

      if (isCurrentDate) {
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
            optionalSubject: isFourthSemester && selectedSubjectId !== "none" ? subjects.find(s => s.id.toString() === selectedSubjectId)?.name : undefined,
          };

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

    } catch (error: any) {
      console.error("Error saving attendance:", error);

      // Construct cached data object
      const cachedData = {
        date,
        period: currentPeriodNum,
        semester_id: parseInt(id || "0"),
        faculty_id: facultyId,
        records: students.map(student => ({
          date,
          period: currentPeriodNum,
          faculty_id: facultyId,
          semester_id: parseInt(id || "0"),
          student_id: student.id,
          is_present: attendance[student.id.toString()] ?? false
        }))
      };
      const cachedKey = `cachedAttendance_${facultyId}_${id}_${date}_${period}_${selectedSubjectId || 'no_subject'}`;
      localStorage.setItem(cachedKey, JSON.stringify(cachedData));
      setCachedAttendance(cachedData);

      toast({
        title: "Submission Failed",
        description: `Failed to submit attendance: ${error.message}. Data has been saved locally. Please try again later.`,
        variant: "destructive",
        duration: 7000,
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

      if (currentUserRole !== 'admin') {
        deleteQuery = deleteQuery.eq('faculty_id', facultyId);
      }

      const { error } = await deleteQuery;

      if (error) throw error;

      // Clear cached data if it exists for this period
      const cachedKey = `cachedAttendance_${facultyId}_${id}_${date}_${period}_${selectedSubjectId || 'no_subject'}`;
      localStorage.removeItem(cachedKey);
      setCachedAttendance(null);

      toast({
        title: "Attendance Deleted",
        description: `Attendance for Period ${period} on ${date} has been deleted.`,
      });

      setAttendance({});
      setSelectAll(false);
      setGlobalPeriodStatuses(prev => {
        const newState = { ...prev };
        delete newState[parseInt(period)];
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

  // Determine if the student list is empty due to filtering (e.g., no students for selected subject)
  const isStudentListEmpty = students.length === 0;

  // Determine if submission/deletion should be disabled
  const isPeriodTakenByOtherFaculty = globalPeriodStatuses[parseInt(period)]?.status === 'taken-by-other' && currentUserRole !== 'admin';
  const isSubmitDisabled = isPeriodTakenByOtherFaculty || isStudentListEmpty;
  const currentPeriodStatus = globalPeriodStatuses[parseInt(period)];
  const isDeleteDisabled = !currentPeriodStatus || isPeriodTakenByOtherFaculty || isStudentListEmpty;


  if (isLoading) {
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
                    readOnly
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
            {isFourthSemester && (
              <div className="space-y-2">
                <Label htmlFor="subject">Select Subject</Label> {/* Renamed title */}
                <Select
                  value={selectedSubjectId}
                  onValueChange={setSelectedSubjectId}
                  disabled={subjects.length === 0 && selectedSubjectId !== "none"}
                >
                  <SelectTrigger id="subject">
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Students without optional subject)</SelectItem>
                    {subjects.map(subject => (
                      <SelectItem key={subject.id} value={subject.id.toString()}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {subjects.length === 0 && selectedSubjectId !== "none" && (
                  <p className="text-sm text-gray-500">No subjects available (except 'None').</p>
                )}
                {selectedSubjectId === "none" && subjects.length > 0 && (
                  <p className="text-sm text-gray-500">
                    Selecting "None" will display all 4th-semester students who do not have an optional subject assigned.
                  </p>
                )}
              </div>
            )}
            {isPeriodTakenByOtherFaculty && (
              <p className="text-destructive text-sm mt-2">
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
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <CardTitle>Student List</CardTitle>
                <CardDescription>
                  Mark attendance for each student
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                {parseInt(period) > 1 && (
                  <Button
                    variant="outline"
                    onClick={handleCopyFromPrevious}
                    disabled={isSubmitDisabled || Object.keys(previousPeriodAttendance).length === 0 || isStudentListEmpty}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy from Period {parseInt(period) - 1}
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => handleSelectAll(true)}
                  disabled={isSubmitDisabled || isStudentListEmpty}
                >
                  Select All Present
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleSelectAll(false)}
                  disabled={isSubmitDisabled || isStudentListEmpty}
                >
                  Select All Absent
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isStudentListEmpty ? (
              <div className="text-center p-8 text-gray-500">
                {isFourthSemester && selectedSubjectId === "none"
                  ? "No 4th-semester students found without an optional subject assigned."
                  : isFourthSemester && selectedSubjectId === otherSubjectsId
                    ? "No 4th-semester students found."
                    : isFourthSemester && selectedSubjectId !== "none"
                      ? `No students found for the selected subject.`
                      : "No students found for this semester."}
              </div>
            ) : (
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
            )}
          </CardContent>
        </Card>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
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
                {cachedAttendance ? "Retry Submission" : (isCurrentDate ? "Submit Attendance" : "Update Attendance")}
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
