"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar, Download, Filter } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import Navigation from "@/components/Navigation";

const Reports = () => {
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedStudent, setSelectedStudent] = useState("");

  // Mock data for reports
  const attendanceData = [
    { date: "2023-10-01", present: 42, absent: 3 },
    { date: "2023-10-02", present: 39, absent: 6 },
    { date: "2023-10-03", present: 41, absent: 4 },
    { date: "2023-10-04", present: 40, absent: 5 },
    { date: "2023-10-05", present: 43, absent: 2 },
  ];

  const studentReports = [
    { id: "1", name: "Airi Satou", roll: "001", class: "1st Semester", attendance: 92 },
    { id: "2", name: "Angelica Ramos", roll: "002", class: "1st Semester", attendance: 85 },
    { id: "3", name: "Ashton Cox", roll: "003", class: "2nd Semester", attendance: 95 },
    { id: "4", name: "Bradley Greer", roll: "004", class: "2nd Semester", attendance: 78 },
    { id: "5", name: "Brenden Wagner", roll: "005", class: "3rd Semester", attendance: 88 },
  ];

  const handleDownload = () => {
    // In a real app, this would generate and download a report
    alert("Report download initiated");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="p-4 md:p-6">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">Attendance Reports</h1>
          <p className="text-gray-600">Generate and view attendance reports</p>
        </div>

        <Card className="mb-6">
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
                    <SelectItem value="1">1st Semester</SelectItem>
                    <SelectItem value="2">2nd Semester</SelectItem>
                    <SelectItem value="3">3rd Semester</SelectItem>
                    <SelectItem value="4">4th Semester</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="student">Student</Label>
                <Input
                  id="student"
                  placeholder="Search student..."
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <Button>
                <Filter className="mr-2 h-4 w-4" />
                Generate Report
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Overview</CardTitle>
              <CardDescription>Daily attendance statistics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={attendanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="present" fill="#10b981" name="Present" />
                    <Bar dataKey="absent" fill="#ef4444" name="Absent" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Student Attendance</CardTitle>
              <CardDescription>Individual student attendance percentages</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Roll No.</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead className="text-right">Attendance %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studentReports.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <Badge variant="outline">{student.roll}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell>{student.class}</TableCell>
                      <TableCell className="text-right">
                        <Badge 
                          variant={student.attendance > 90 ? "default" : student.attendance > 75 ? "secondary" : "destructive"}
                        >
                          {student.attendance}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download Report
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Reports;