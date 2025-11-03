"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { User } from "@/lib/db"; // Ensure User type is correctly imported

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";

const editFacultyFormSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }).max(50, {
    message: "Name must not be longer than 50 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  role: z.enum(["faculty", "admin"], {
    message: "Please select a valid role.",
  }),
  status: z.enum(["active", "inactive", "pending"], {
    message: "Please select a valid status.",
  }),
  abbreviation: z.string().min(1, {
    message: "Abbreviation is required.",
  }).max(5, { // Allowing a bit more flexibility than 3, but keeping it short
    message: "Abbreviation must not be longer than 5 characters.",
  }),
  newPassword: z.string().min(6, {
    message: "Password must be at least 6 characters.",
  }).optional().or(z.literal("")),
});

type EditFacultyFormValues = z.infer<typeof editFacultyFormSchema>;

interface EditFacultyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  facultyMember: User | null; // Corrected type from Student to User
  onFacultyUpdated: () => void;
}

const EditFacultyDialog = ({ isOpen, onClose, facultyMember, onFacultyUpdated }: EditFacultyDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<EditFacultyFormValues>({
    resolver: zodResolver(editFacultyFormSchema),
    defaultValues: {
      name: "",
      email: "",
      role: "faculty",
      status: "active",
      abbreviation: "",
      newPassword: "",
    },
  });

  useEffect(() => {
    if (isOpen && facultyMember) {
      console.log("EditFacultyDialog useEffect: isOpen is true, facultyMember:", facultyMember); // Added log
      const validRoles = ["faculty", "admin"];
      const validStatuses = ["active", "inactive", "pending"];

      const initialRole = validRoles.includes(facultyMember.role) ? facultyMember.role : "faculty";
      const initialStatus = validStatuses.includes(facultyMember.status) ? facultyMember.status : "pending";

      form.reset({
        name: facultyMember.name,
        email: facultyMember.email,
        role: initialRole as "faculty" | "admin",
        status: initialStatus as "active" | "inactive" | "pending",
        abbreviation: facultyMember.abbreviation || "",
        newPassword: "",
      });
    }
  }, [isOpen, facultyMember, form]);

  const onSubmit = async (values: EditFacultyFormValues) => {
    if (!facultyMember) return;

    setIsLoading(true);
    
    try {
      // Update user details in public.users table
      const { error: userUpdateError } = await supabase
        .from('users')
        .update({
          name: values.name,
          email: values.email,
          role: values.role,
          status: values.status,
          abbreviation: values.abbreviation, // Update abbreviation
          updated_at: new Date().toISOString(),
        })
        .eq('id', facultyMember.id);

      if (userUpdateError) throw userUpdateError;

      // If a new password is provided, call the Edge Function to update it
      if (values.newPassword) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error("User not authenticated to perform this action.");
        }

        // Call the Edge Function to update the password
        // Pass a plain object for the body, supabase.functions.invoke will stringify it
        const { data: passwordUpdateData, error: passwordUpdateError } = await supabase.functions.invoke(
          'admin-update-user-password',
          {
            body: { userId: facultyMember.id, newPassword: values.newPassword }, // Corrected: pass plain object
            headers: {
              'Authorization': `Bearer ${user.access_token}`,
            },
          }
        );

        if (passwordUpdateError) {
          console.error("Edge Function error:", passwordUpdateError);
          throw new Error(passwordUpdateError.message || "Failed to update password via Edge Function.");
        }
        if (passwordUpdateData && passwordUpdateData.error) {
          throw new Error(passwordUpdateData.error);
        }
      }

      toast({
        title: "Faculty Member Updated",
        description: `${values.name}'s details have been updated successfully.`,
      });
      onFacultyUpdated();
      onClose();
    } catch (error: any) {
      toast({
        title: "Error updating faculty member",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  console.log("EditFacultyDialog render: isOpen =", isOpen, "facultyMember =", facultyMember?.name); // Added log

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {console.log("EditFacultyDialog: Dialog component is mounted. Open state:", isOpen)} {/* New log */}
      <DialogContent className="sm:max-w-[425px]">
        {isOpen && console.log("EditFacultyDialog: DialogContent is rendering.")} {/* Existing log */}
        <DialogHeader>
          <DialogTitle>Edit Faculty Member</DialogTitle>
          <DialogDescription>
            Update the details for {facultyMember?.name}.
          </DialogDescription>
        </DialogHeader>
        {/* Temporarily simplified content */}
        <div className="p-4">
          <p>This is a test for EditFacultyDialog content.</p>
          <p>Faculty Name: {facultyMember?.name}</p>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditFacultyDialog;