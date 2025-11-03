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
  console.log("ViewFacultyDialog render: isOpen =", isOpen, "facultyMember =", facultyMember?.name);

  if (!facultyMember) {
    console.log("ViewFacultyDialog: facultyMember is null, returning null.");
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {console.log("ViewFacultyDialog: Dialog component is mounted. Open state:", isOpen)}
      <DialogContent className="sm:max-w-[425px]">
        {isOpen && console.log("ViewFacultyDialog: DialogContent is rendering!")}
        <DialogHeader>
          <DialogTitle>View Faculty Member (DEBUG)</DialogTitle>
          <DialogDescription>
            This is a simplified debug version of the View Faculty Dialog.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 bg-green-100">
          <p>If you see this, the View Dialog content is rendering!</p>
          <p>Name: {facultyMember.name}</p>
          <p>Email: {facultyMember.email}</p>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Close Debug Dialog</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ViewFacultyDialog;