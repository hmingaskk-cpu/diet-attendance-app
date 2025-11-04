"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getSemesters, getStudentsBySemester, Semester, Student } from "@/lib/db";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import StudentAttendanceView from "@/components/students/StudentAttendanceView"; // Import the new component

const StudentPublicReport = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState<string | null>(null);
  const [studentsInSemester, setStudentsInSemester] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedStudentName, setSelectedStudentName] = useState<string>("");
  const [selectedStudentRollNumber, setSelectedStudentRollNumber] = useState<string>("");
  const [isLoadingData, setIsLoadingData] = useState(true);
  const { toast } = useToast();

  // Fetch semesters on initial load
  useEffect(() => {
    const fetchSemesters = async () => {
      try {
        const fetchedSemesters = await getSemesters();
        setSemesters(fetchedSemesters);
        if (fetchedSemesters.length > 0) {
          setSelectedSemesterId(fetchedSemesters[0].id.toString());
        }
      } catch (error: any) {
        toast({
          title: "Error fetching semesters",
          description: error.message,
          variant: "destructive"
        });
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchSemesters();
  }, [toast]);

  // Fetch students when selectedSemesterId changes
  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedSemesterId) {
        setStudentsInSemester([]);
        setSelectedStudentId(null);
        setSelectedStudentName("");
        setSelectedStudentRollNumber("");
        return;
      }
      try {
        const students = await getStudentsBySemester(parseInt(selectedSemesterId));
        setStudentsInSemester(students);
        if (students.length > 0) {
          setSelectedStudentId(students[0].id.toString());
          setSelectedStudentName(students[0].name);
          setSelectedStudentRollNumber(students[0].roll_number);
        } else {
          setSelectedStudentId(null);
          setSelectedStudentName("");
          setSelectedStudentRollNumber("");
        }
      } catch (error: any) {
        toast({
          title: "Error fetching students",
          description: error.message,
          variant: "destructive"
        });
        setStudentsInSemester([]);
        setSelectedStudentId(null);
        setSelectedStudentName("");
        setSelectedStudentRollNumber("");
      }
    };
    if (isAuthenticated) {
      fetchStudents();
    }
  }, [selectedSemesterId, isAuthenticated, toast]);

  const handlePasswordSubmit = () => {
    const correctPassword = import.meta.env.VITE_STUDENT_REPORT_PASSWORD;
    if (passwordInput === correctPassword) {
      setIsAuthenticated(true);
      setPasswordError("");
      toast({
        title: "Access Granted",
        description: "You can now view student attendance reports.",
      });
    } else {
      setPasswordError("Incorrect password. Please try again.");
      toast({
        title: "Access Denied",
        description: "The password you entered is incorrect.",
        variant: "destructive"
      });
    }
  };

  const handleStudentSelect = (studentId: string) => {
    setSelectedStudentId(studentId);
    const student = studentsInSemester.find(s => s.id.toString() === studentId);
    if (student) {
      setSelectedStudentName(student.name);
      setSelectedStudentRollNumber(student.roll_number);
    }
  };

  if (isLoadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100 p-4">
        <LoadingSkeleton count={1} height="h-10" width="w-1/2" className="mb-6" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-4">
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">Student Attendance Report</h1>

        {!isAuthenticated ? (
          <Card className="w-full max-w-md mx-auto shadow-lg rounded-lg">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-gray-800">Access Report</CardTitle>
              <CardDescription className="text-gray-600 mt-2">
                Enter the shared password to view attendance reports.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handlePasswordSubmit();
                    }
                  }}
                />
                {passwordError && <p className="text-red-500 text-sm">{passwordError}</p>}
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={handlePasswordSubmit}>
                Submit
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card className="shadow-sm rounded-lg">
              <CardHeader>
                <CardTitle>Select Student</CardTitle>
                <CardDescription>
                  Choose the semester and then your name to view your attendance.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="semester">Semester</Label>
                  <Select
                    value={selectedSemesterId || ""}
                    onValueChange={setSelectedSemesterId}
                    disabled={semesters.length === 0}
                  >
                    <SelectTrigger id="semester">
                      <SelectValue placeholder="Select semester" />
                    </SelectTrigger>
                    <SelectContent>
                      {semesters.map(semester => (
                        <SelectItem key={semester.id} value={semester.id.toString()}>
                          {semester.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {semesters.length === 0 && (
                    <p className="text-sm text-gray-500">No semesters available.</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="student">Student Name / Roll Number</Label>
                  <Select
                    value={selectedStudentId || ""}
                    onValueChange={handleStudentSelect}
                    disabled={studentsInSemester.length === 0}
                  >
                    <SelectTrigger id="student">
                      <SelectValue placeholder="Select your name or roll number" />
                    </SelectTrigger>
                    <SelectContent>
                      {studentsInSemester.map(student => (
                        <SelectItem key={student.id} value={student.id.toString()}>
                          {student.roll_number} - {student.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {studentsInSemester.length === 0 && (
                    <p className="text-sm text-gray-500">No students available in this semester.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {selectedStudentId && selectedSemesterId ? (
              <StudentAttendanceView
                studentId={parseInt(selectedStudentId)}
                semesterId={parseInt(selectedSemesterId)}
                studentName={selectedStudentName}
                studentRollNumber={selectedStudentRollNumber}
              />
            ) : (
              <Card className="shadow-sm rounded-lg">
                <CardContent className="p-6 text-center text-gray-500">
                  Please select a semester and your name to view the attendance report.
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentPublicReport;