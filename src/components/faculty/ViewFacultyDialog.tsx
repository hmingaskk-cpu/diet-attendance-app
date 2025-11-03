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
        {isOpen && console.log("ViewFacultyDialog: DialogContent is rendering.")}
        <DialogHeader>
          <DialogTitle>Faculty Member Details</DialogTitle>
          <DialogDescription>
            Viewing details for {facultyMember.name}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input id="name" value={facultyMember.name} readOnly className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">
              Email
            </Label>
            <Input id="email" value={facultyMember.email} readOnly className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="role" className="text-right">
              Role
            </Label>
            <div className="col-span-3">
              <Badge variant={facultyMember.role === "admin" ? "default" : "secondary"}>
                {facultyMember.role}
              </Badge>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">
              Status
            </Label>
            <div className="col-span-3">
              <Badge variant={facultyMember.status === "active" ? "default" : "destructive"}>
                {facultyMember.status}
              </Badge>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="createdAt" className="text-right">
              Created At
            </Label>
            <Input id="createdAt" value={new Date(facultyMember.created_at).toLocaleString()} readOnly className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="updatedAt" className="text-right">
              Last Updated
            </Label>
            <Input id="updatedAt" value={new Date(facultyMember.updated_at).toLocaleString()} readOnly className="col-span-3" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ViewFacultyDialog;