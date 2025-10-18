"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Papa from "papaparse";
import { createMultipleStudents, getSemesters, Semester } from "@/lib/db";
import { supabase } from "@/lib/supabaseClient";

interface ImportStudentsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

const ImportStudentsDialog = ({ isOpen, onClose, onImportComplete }: ImportStudentsDialogProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      if (!isOpen) return;

      try {
        // Fetch semesters for mapping
        const fetchedSemesters = await getSemesters();
        setSemesters(fetchedSemesters);

        // Get current user role for authorization
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: userDetails } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();
          if (userDetails) {
            setCurrentUserRole(userDetails.role);
          }
        }
      } catch (error: any) {
        toast({
          title: "Error loading data",
          description: error.message,
          variant: "destructive"
        });
      }
    };
    fetchData();
  }, [isOpen, toast]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      // Basic file type check
      if (file.type === "text/csv" || file.name.endsWith(".csv")) {
        setSelectedFile(file);
      } else {
        toast({
          title: "Unsupported file type",
          description: "Please upload a CSV file. XLSX is not supported yet.",
          variant: "destructive"
        });
        setSelectedFile(null);
      }
    } else {
      setSelectedFile(null);
    }
  };

  const handleImport = async () => {
    if (currentUserRole !== "admin") {
      toast({
        title: "Access Denied",
        description: "Only administrators can import student data.",
        variant: "destructive"
      });
      return;
    }

    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a CSV file to import.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const semesterMap = new Map(semesters.map(s => [s.name.toLowerCase(), s.id]));

      Papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          if (results.errors.length > 0) {
            toast({
              title: "CSV Parsing Error",
              description: results.errors[0].message,
              variant: "destructive"
            });
            setIsLoading(false);
            return;
          }

          const studentsToInsert = [];
          const errors: string[] = [];

          for (const row of results.data as any[]) {
            const name = row["Student Name"] || row["name"];
            const rollNumber = row["Roll Number"] || row["roll_number"];
            const email = row["Email"] || row["email"];
            const semesterName = row["Semester"] || row["semester"];

            if (!name || !rollNumber || !semesterName) {
              errors.push(`Skipping row due to missing data: Name='${name}', Roll='${rollNumber}', Semester='${semesterName}'`);
              continue;
            }

            const semesterId = semesterMap.get(semesterName.toLowerCase());
            if (semesterId === undefined) {
              errors.push(`Skipping student '${name}' (Roll: ${rollNumber}) due to unknown semester: '${semesterName}'`);
              continue;
            }

            studentsToInsert.push({
              name: String(name),
              roll_number: String(rollNumber),
              email: email ? String(email) : null,
              semester_id: semesterId,
            });
          }

          if (errors.length > 0) {
            toast({
              title: "Import Warnings/Errors",
              description: `Some rows were skipped: ${errors.join("; ")}. Please check your CSV file.`,
              variant: "destructive",
              duration: 8000
            });
          }

          if (studentsToInsert.length === 0) {
            toast({
              title: "No Valid Students to Import",
              description: "No valid student records found in the file after processing.",
              variant: "destructive"
            });
            setIsLoading(false);
            return;
          }

          try {
            await createMultipleStudents(studentsToInsert);
            toast({
              title: "Students Imported Successfully",
              description: `${studentsToInsert.length} student(s) have been added.`,
            });
            onImportComplete();
            onClose();
          } catch (dbError: any) {
            toast({
              title: "Database Import Failed",
              description: dbError.message || "An error occurred while inserting students into the database.",
              variant: "destructive"
            });
          } finally {
            setIsLoading(false);
            setSelectedFile(null);
          }
        },
        error: (err: any) => {
          toast({
            title: "File Reading Error",
            description: err.message,
            variant: "destructive"
          });
          setIsLoading(false);
          setSelectedFile(null);
        }
      });
    } catch (error: any) {
      toast({
        title: "Import Failed",
        description: error.message || "An unexpected error occurred during import.",
        variant: "destructive"
      });
      setIsLoading(false);
      setSelectedFile(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Import Students</DialogTitle>
          <DialogDescription>
            Upload a CSV file to import student data.
            <br />
            <span className="text-red-500">Only administrators can perform this action.</span>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium">
              {selectedFile ? selectedFile.name : "Drag and drop or click to upload"}
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Supported format: CSV (XLSX not supported yet)
            </p>
            <Label htmlFor="file-upload" className="cursor-pointer">
              <Input
                id="file-upload"
                type="file"
                className="sr-only"
                accept=".csv"
                onChange={handleFileChange}
              />
              <Button variant="outline" className="mt-4" asChild>
                <span>Select File</span>
              </Button>
            </Label>
          </div>
          <p className="text-sm text-gray-500">
            **CSV Format Hint:** Your CSV should have columns like "Student Name", "Roll Number", "Email", and "Semester". The "Semester" column should match existing semester names (e.g., "1st Semester", "2nd Semester").
          </p>
        </div>
        <DialogFooter>
          <Button onClick={handleImport} disabled={isLoading || !selectedFile || currentUserRole !== "admin"}>
            {isLoading ? "Importing..." : "Import Students"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportStudentsDialog;