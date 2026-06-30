"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { createMultipleStudents, Semester } from "@/lib/db";
import { supabase } from "@/lib/supabaseClient";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ImportStudentsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

const ImportStudentsDialog = ({ isOpen, onClose, onImportComplete }: ImportStudentsDialogProps) => {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [selectedSemester, setSelectedSemester] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();

  useEffect(() => {
    const fetchSemesters = async () => {
      const { data } = await supabase.from('semesters').select('*').order('id');
      if (data) setSemesters(data);
    };
    if (isOpen) {
      fetchSemesters();
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setFile(null);
    setSelectedSemester("");
    setError(null);
    setPreviewData([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Helper to accurately parse CSV rows, accounting for commas inside quotes
  const parseCSVRow = (str: string) => {
    const arr = [];
    let quote = false;
    let cell = '';
    for (let i = 0; i < str.length; i++) {
      let c = str[i];
      if (c === '"' && str[i + 1] === '"') { cell += '"'; i++; } 
      else if (c === '"') { quote = !quote; }
      else if (c === ',' && !quote) { arr.push(cell.trim()); cell = ''; }
      else { cell += c; }
    }
    arr.push(cell.trim());
    return arr.map(val => val.replace(/^"|"$/g, '').trim());
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    setError(null);
    
    if (!selectedFile) return;
    
    if (selectedFile.type !== "text/csv" && !selectedFile.name.endsWith(".csv")) {
      setError("Please upload a valid CSV file.");
      setFile(null);
      return;
    }

    setFile(selectedFile);
    
    // Generate a quick preview to ensure data maps correctly
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim() !== '');
        if (lines.length < 2) throw new Error("File appears to be empty or missing data rows.");

        const headers = parseCSVRow(lines[0].toLowerCase());
        
        const parsedPreview = lines.slice(1, 4).map(line => {
          const values = parseCSVRow(line);
          const rowData: any = {};
          
          headers.forEach((header, index) => {
            const val = values[index] || "";
            if (header.includes("roll")) rowData.roll_number = val;
            else if (header.includes("name") && !header.includes("parent")) rowData.name = val;
            else if (header.includes("email")) rowData.email = val;
            else if (header.includes("phone")) rowData.phone_number = val;
            else if (header.includes("address")) rowData.address = val;
            else if (header.includes("qual")) rowData.qualification = val;
            else if (header.includes("dob") || header.includes("birth")) rowData.date_of_birth = val;
            else if (header.includes("parent") || header.includes("father") || header.includes("mother")) rowData.parent_name = val;
            else if (header.includes("aadhaar")) rowData.aadhaar_number = val;
          });
          return rowData;
        });
        
        setPreviewData(parsedPreview);
      } catch (err: any) {
        setError("Could not read file. Ensure it is a standard CSV.");
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleImport = async () => {
    if (!file || !selectedSemester) {
      setError("Please select both a class and a CSV file.");
      return;
    }

    setIsLoading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim() !== '');
        
        if (lines.length < 2) throw new Error("File does not contain valid data rows.");

        const headers = parseCSVRow(lines[0].toLowerCase());
        const studentsToImport = [];

        for (let i = 1; i < lines.length; i++) {
          const values = parseCSVRow(lines[i]);
          const student: any = { semester_id: parseInt(selectedSemester) };
          let hasName = false;
          let hasRoll = false;

          headers.forEach((header, index) => {
            const val = values[index] ? values[index].trim() : null;
            
            // Map the CSV headers to our Database columns dynamically
            if (header.includes("roll")) { student.roll_number = val; hasRoll = !!val; }
            else if (header.includes("name") && !header.includes("parent")) { student.name = val; hasName = !!val; }
            else if (header.includes("email")) student.email = val || null;
            else if (header.includes("phone")) student.phone_number = val || null;
            else if (header.includes("address")) student.address = val || null;
            else if (header.includes("qual")) student.qualification = val || null;
            else if (header.includes("dob") || header.includes("birth")) {
              // Convert dd/mm/yyyy or dd-mm-yyyy to standard DB yyyy-mm-dd if necessary
              if (val && (val.includes('/') || val.split('-')[0].length === 2)) {
                 const parts = val.includes('/') ? val.split('/') : val.split('-');
                 if (parts.length === 3) student.date_of_birth = `${parts[2]}-${parts[1]}-${parts[0]}`;
                 else student.date_of_birth = val;
              } else {
                 student.date_of_birth = val || null;
              }
            }
            else if (header.includes("parent") || header.includes("father") || header.includes("mother")) student.parent_name = val || null;
            else if (header.includes("aadhaar")) student.aadhaar_number = val || null;
          });

          if (hasName && hasRoll) {
            studentsToImport.push(student);
          }
        }

        if (studentsToImport.length === 0) {
          throw new Error("No valid students found. Ensure columns 'Roll Number' and 'Name' exist.");
        }

        await createMultipleStudents(studentsToImport);
        
        toast({ title: "Import Successful", description: `Successfully imported ${studentsToImport.length} students.` });
        onImportComplete();
        onClose();
        
      } catch (err: any) {
        setError(err.message || "An error occurred during import.");
        toast({ title: "Import Failed", description: err.message, variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    
    reader.onerror = () => {
      setError("Failed to read the file.");
      setIsLoading(false);
    };
    
    reader.readAsText(file);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Import Students</DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk add students to a class.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="import-semester">Target Class</Label>
            <Select value={selectedSemester} onValueChange={setSelectedSemester}>
              <SelectTrigger id="import-semester">
                <SelectValue placeholder="Select class for imported students" />
              </SelectTrigger>
              <SelectContent>
                {semesters.map(semester => (
                  <SelectItem key={semester.id} value={semester.id.toString()}>
                    {semester.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>CSV File</Label>
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 flex flex-col items-center justify-center text-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <FileSpreadsheet className="h-10 w-10 text-gray-400 mb-2" />
              <p className="text-sm font-medium text-gray-700">
                {file ? file.name : "Click to select a CSV file"}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Must include "Roll Number" and "Name" columns.
              </p>
              <Input 
                ref={fileInputRef} type="file" accept=".csv" className="hidden" 
                onChange={handleFileChange}
              />
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {previewData.length > 0 && !error && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <div className="flex items-center gap-2 mb-2 text-blue-800 font-medium text-sm">
                <CheckCircle2 className="h-4 w-4" /> Data mapped successfully!
              </div>
              <div className="text-xs text-gray-600 space-y-1">
                <p><strong>Previewing first entry:</strong></p>
                <p>Roll No: {previewData[0].roll_number || "N/A"}</p>
                <p>Name: {previewData[0].name || "N/A"}</p>
                <p>Phone: {previewData[0].phone_number || "N/A"}</p>
                <p>DOB: {previewData[0].date_of_birth || "N/A"}</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button onClick={handleImport} disabled={!file || !selectedSemester || isLoading}>
            <Upload className="mr-2 h-4 w-4" />
            {isLoading ? "Importing..." : "Import Data"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportStudentsDialog;
