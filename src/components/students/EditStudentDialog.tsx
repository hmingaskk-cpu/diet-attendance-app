"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { updateStudent, getSemesters, Semester, Student } from "@/lib/db";
import { supabase } from "@/lib/supabaseClient";

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

const editStudentFormSchema = z.object({
  name: z.string().min(2, {
    message: "Student name must be at least 2 characters.",
  }).max(100, {
    message: "Student name must not be longer than 100 characters.",
  }),
  rollNumber: z.string().min(1, {
    message: "Roll number is required.",
  }).max(20, {
    message: "Roll number must not be longer than 20 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }).optional().or(z.literal("")), // Allow empty string for optional email
  semesterId: z.string().min(1, {
    message: "Please select a semester.",
  }),
});

type EditStudentFormValues = z.infer<typeof editStudentFormSchema>;

interface EditStudentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  onStudentUpdated: () => void;
}

const EditStudentDialog = ({ isOpen, onClose, student, onStudentUpdated }: EditStudentDialogProps) => {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<EditStudentFormValues>({
    resolver: zodResolver(editStudentFormSchema),
    defaultValues: {
      name: "",
      rollNumber: "",
      email: "",
      semesterId: "",
    },
  });

  useEffect(() => {
    const fetchSemesters = async () => {
      const { data, error } = await supabase
        .from('semesters')
        .select('*')
        .order('id');
      
      if (error) {
        toast({
          title: "Error fetching semesters",
          description: error.message,
          variant: "destructive"
        });
      } else {
        setSemesters(data || []);
      }
    };
    
    if (isOpen) {
      fetchSemesters();
      if (student) {
        form.reset({
          name: student.name,
          rollNumber: student.roll_number,
          email: student.email || "",
          semesterId: student.semester_id.toString(),
        });
      }
    }
  }, [isOpen, student, toast, form]);

  const onSubmit = async (values: EditStudentFormValues) => {
    if (!student) return;

    setIsLoading(true);

    try {
      await updateStudent(student.id, {
        name: values.name,
        roll_number: values.rollNumber,
        email: values.email || null,
        semester_id: parseInt(values.semesterId),
        updated_at: new Date().toISOString(),
      });

      toast({
        title: "Student Updated",
        description: `${values.name}'s details have been updated successfully.`,
      });
      onStudentUpdated();
      onClose();
    } catch (error: any) {
      toast({
        title: "Error updating student",
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
          <DialogTitle>Edit Student</DialogTitle>
          <DialogDescription>
            Update the details for {student?.name}. Click save when you're done.
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
                    <FormLabel>Student Name</FormLabel>
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
                name="rollNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Roll Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="DIET/2023/001"
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
                    <FormLabel>Email (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="john.doe@example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="semesterId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Semester</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select semester" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {semesters.map(semester => (
                          <SelectItem key={semester.id} value={semester.id.toString()}>
                            {semester.name}
                          </SelectItem>
                        ))}
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

export default EditStudentDialog;