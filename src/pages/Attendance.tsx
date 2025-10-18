"use client";

import { useState } from "react";
import { useParams } from "react-router-dom";
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

const Attendance = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const [facultyName, setFacultyName] = useState("");
  const [period, setPeriod] = useState("1");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectAll, setSelectAll] = useState(false);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});

  // Mock student data - in a real app this would come from the database
  const students = [
    { id: "1", name: "Airi Satou", roll: "001" },
    { id: "2", name: "Angelica Ramos", roll: "002" },
    { id: "3", name: "Ashton Cox", roll: "003" },
    { id: "4", name: "Bradley Greer", roll: "004" },
    { id: "5", name: "Brenden Wagner", roll: "005" },
    { id: "6", name: "Brielle Williamson", roll: "006" },
    { id: "7", name: "Bruno Nash", roll: "007" },
    { id: "8", name: "Caesar Vance", roll: "008" },
    { id: "9", name: "Cara Stevens", roll: "009" },
    { id: "10", name: "Cedric Kelly", roll: "010" },
  ];

  const semesterNames = [
    "1st Semester",
    "2nd Semester",
    "3rd Semester",
    "4th Semester"
  ];

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    const newAttendance: Record<string, boolean> = {};
    students.forEach(student => {
      newAttendance[student.id] = checked;
    });
    setAttendance(newAttendance);
  };

  const handleAttendanceChange = (studentId: string, checked: boolean) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: checked
    }));
  };

  const handleSubmit = () => {
    if (!facultyName) {
      toast({
        title: "Faculty Name Required",
        description: "Please enter your name before submitting.",
        variant: "destructive"
      });
      return;
    }

    // In a real app, this would save to Supabase
    toast({
      title: "Attendance Submitted",
      description: `Attendance for ${semesterNames[Number(id) - 1]} (Period ${period}) has been saved.`,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="p-4 md:p-6">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">Take Attendance</h1>
          <p className="text-gray-600">
            {semesterNames[Number(id) - 1]} - {date}
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
                        checked={attendance[student.id] || false}
                        onCheckedChange={(checked) => 
                          handleAttendanceChange(student.id, checked as boolean)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{student.roll}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell className="text-right">
                      {attendance[student.id] === true ? (
                        <Badge>Present</Badge>
                      ) : attendance[student.id] === false ? (
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