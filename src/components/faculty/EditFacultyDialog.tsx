"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { User } from "@/lib/db";

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
  status: z.enum(["active", "inactive"], {
    message: "Please select a valid status.",
  }),
});

type EditFacultyFormValues = z.infer<typeof editFacultyFormSchema>;

interface EditFacultyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  facultyMember: User | null;
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
    },
  });

  useEffect(() => {
    if (isOpen && facultyMember) {
      form.reset({
        name: facultyMember.name,
        email: facultyMember.email,
        role: facultyMember.role as "faculty" | "admin",
        status: facultyMember.status as "active" | "inactive",
      });
    }
  }, [isOpen, facultyMember, form]);

  const onSubmit = async (values: EditFacultyFormValues) => {
    if (!facultyMember) return;

    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: values.name,
          email: values.email,
          role: values.role,
          status: values.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', facultyMember.id);

      if (error) throw error;

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Faculty Member</DialogTitle>
          <DialogDescription>
            Update the details for {facultyMember?.name}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="John Doe"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="faculty@dietkolasib.edu.in"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="faculty">Faculty</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditFacultyDialog;