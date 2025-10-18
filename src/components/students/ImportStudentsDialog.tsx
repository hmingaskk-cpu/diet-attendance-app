"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ImportStudentsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

const ImportStudentsDialog = ({ isOpen, onClose, onImportComplete }: ImportStudentsDialogProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
    } else {
      setSelectedFile(null);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a CSV or Excel file to import.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    // In a real application, you would parse the file here (e.g., using PapaParse for CSV or xlsx for Excel)
    // and then insert the data into your Supabase 'students' table.
    // For this example, we'll simulate the import process.

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500)); 

      toast({
        title: "Import Initiated",
        description: `Processing file: ${selectedFile.name}. This is a simulated import.`,
      });
      
      // In a real scenario, after successful import, you'd call onImportComplete()
      // and potentially refresh the student list.
      onImportComplete();
      onClose();
    } catch (error: any) {
      toast({
        title: "Import Failed",
        description: error.message || "An unexpected error occurred during import.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setSelectedFile(null); // Clear selected file
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Import Students</DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel file to import student data.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium">
              {selectedFile ? selectedFile.name : "Drag and drop or click to upload"}
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Supported formats: CSV, XLSX
            </p>
            <Label htmlFor="file-upload" className="cursor-pointer">
              <Input
                id="file-upload"
                type="file"
                className="sr-only"
                accept=".csv, .xlsx"
                onChange={handleFileChange}
              />
              <Button variant="outline" className="mt-4" asChild>
                <span>Select File</span>
              </Button>
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleImport} disabled={isLoading || !selectedFile}>
            {isLoading ? "Importing..." : "Import Students"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportStudentsDialog;