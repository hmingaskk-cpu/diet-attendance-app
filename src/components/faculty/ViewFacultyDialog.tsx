"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { User } from "@/lib/db";

interface ViewFacultyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  facultyMember: User | null;
}

const ViewFacultyDialog = ({ isOpen, onClose, facultyMember }: ViewFacultyDialogProps) => {
  console.log("ViewFacultyDialog render: isOpen =", isOpen, "facultyMember =", facultyMember?.name); // Added log

  if (!facultyMember) {
    console.log("ViewFacultyDialog: facultyMember is null, returning null."); // Added log
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {console.log("ViewFacultyDialog: Dialog component is mounted. Open state:", isOpen)} {/* New log */}
      <DialogContent className="sm:max-w-[425px]">
        {isOpen && console.log("ViewFacultyDialog: DialogContent is rendering.")} {/* Existing log */}
        <DialogHeader>
          <DialogTitle>Faculty Member Details</DialogTitle>
          <DialogDescription>
            Viewing details for {facultyMember.name}.
          </DialogDescription>
        </DialogHeader>
        {/* Temporarily simplified content */}
        <div className="p-4">
          <p>This is a test for ViewFacultyDialog content.</p>
          <p>Faculty Name: {facultyMember?.name}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ViewFacultyDialog;