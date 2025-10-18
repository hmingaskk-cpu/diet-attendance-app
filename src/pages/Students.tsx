"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, Download, Plus, Search, Edit, Trash2 } from "lucide-react";
import Navigation from "@/components/Navigation";

const Students = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");

  // Mock student data
  const students = [
    { id: "1", name: "Airi Satou", roll: "001", class: "1st Semester", email: "airi@example.com" },
    { id: "2", name: "Angelica Ramos", roll: "002", class: "1st Semester", email: "angelica@example.com" },
    { id: "3", name: "Ashton Cox", roll: "003", class: "2nd Semester", email: "ashton@example.com" },
    { id: "4", name: "Bradley Greer", roll: "004", class: "2nd Semester", email: "bradley@example.com" },
    { id: "5", name: "Brenden Wagner", roll: "005", class: "3rd Semester", email: "brenden@example.com" },
    { id: "6", name: "Brielle Williamson", roll: "006", class: "3rd Semester", email: "brielle@example.com" },
    { id: "7", name: "Bruno Nash", roll: "007", class: "4th Semester", email: "bruno@example.com" },
    { id: "8", name: "Caesar Vance", roll: "008", class: "4th Semester", email: "caesar@example.com" },
  ];

  const handleImport = () => {
    // In a real app, this would open a file dialog and process the file
    alert("Import functionality would open file dialog here");
  };

  const handleExport = () => {
    // In a real app, this would generate and download a CSV file
    alert("Export functionality would generate CSV file here");
  };

  const handleAddStudent = () => {
    // In a real app, this would open a modal to add a new student
    alert("Add student functionality would open modal here");
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          student.roll.includes(searchTerm);
    const matchesClass = selectedClass === "all" || student.class === `${selectedClass} Semester`;
    return matchesSearch && matchesClass;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="p-4 md:p-6">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">Student Management</h1>
          <p className="text-gray-600">Manage student records and import/export data</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Student Records</CardTitle>
                <CardDescription>
                  View and manage student information
                </CardDescription>
              </div>
              <div className="flex space-x-2 mt-2 md:mt-0">
                <Button onClick={handleImport} variant="outline">
                  <Upload className="mr-2 h-4 w-4" />
                  Import
                </Button>
                <Button onClick={handleExport} variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
                <Button onClick={handleAddStudent}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Student
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search students by name or roll number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by class" />
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
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Roll No.</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <Badge variant="outline">{student.roll}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell>{student.class}</TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Import Students</CardTitle>
            <CardDescription>
              Upload a CSV or Excel file to import student data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium">Upload file</h3>
              <p className="mt-1 text-sm text-gray-500">
                Drag and drop your CSV or Excel file here, or click to browse
              </p>
              <Button variant="outline" className="mt-4" onClick={handleImport}>
                Select File
              </Button>
              <p className="mt-2 text-xs text-gray-500">
                Supported formats: CSV, XLSX
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Students;