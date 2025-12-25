"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { updateStudent, getSemesters, Semester, Student, getSubjects, Subject, removeStudentOptionalSubject } from "@/lib/db";
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
  FormDescription,
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
  }).optional().or(z.literal("")),
  semesterId: z.string().min(1, {
    message: "Please select a semester.",
  }),
  optionalSubjectId: z.string().optional(),
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
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<EditStudentFormValues>({
    resolver: zodResolver(editStudentFormSchema),
    defaultValues: {
      name: "",
      rollNumber: "",
      email: "",
      semesterId: "",
      optionalSubjectId: "none",
    },
  });

  const selectedSemester = form.watch("semesterId");

  useEffect(() => {
    const fetchData = async () => {
      const { data: semestersData, error: semestersError } = await supabase
        .from('semesters')
        .select('*')
        .order('id');
      
      if (semestersError) {
        toast({
          title: "Error fetching semesters",
          description: semestersError.message,
          variant: "destructive"
        });
      } else {
        setSemesters(semestersData || []);
      }

      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('*')
        .order('name');

      if (subjectsError) {
        toast({
          title: "Error fetching subjects",
          description: subjectsError.message,
          variant: "destructive"
        });
      } else {
        setSubjects(subjectsData || []);
      }
    };
    
    if (isOpen) {
      fetchData();
      if (student) {
        form.reset({
          name: student.name,
          rollNumber: student.roll_number,
          email: student.email || "",
          semesterId: student.semester_id.toString(),
          optionalSubjectId: "none",
        });

        // Fetch optional subject if student is in 4th semester
        if (student.semester_id === 4) {
          // We use raw supabase here to ensure we get the data regardless of library logic filters
          supabase
            .from('student_subjects') // VERIFY THIS TABLE NAME
            .select('subject_id')
            .eq('student_id', student.id)
            .eq('semester_id', 4)
            .maybeSingle()
            .then(({ data, error }) => {
               if (!error && data) {
                 form.setValue("optionalSubjectId", data.subject_id.toString());
               } else {
                 form.setValue("optionalSubjectId", "none");
               }
            });
        }
      }
    }
  }, [isOpen, student, toast, form]);

  const onSubmit = async (values: EditStudentFormValues) => {
    if (!student) return;

    setIsLoading(true);

    try {
      // 1. Update core student details
      await updateStudent(student.id, {
        name: values.name,
        roll_number: values.rollNumber,
        email: values.email || null,
        semester_id: parseInt(values.semesterId),
        updated_at: new Date().toISOString(),
      });

      // 2. Handle Optional Subject Logic
      if (parseInt(values.semesterId) === 4) {
        if (values.optionalSubjectId === "none") {
          // User selected "None": Remove the assignment
          // We blindly remove to ensure cleanup even if we couldn't "see" the row earlier
          await removeStudentOptionalSubject(student.id, 4);
        } else {
          // User selected a Subject: Use UPSERT
          // This updates the existing row if found (avoiding duplicate key errors)
          // or inserts a new one if it doesn't exist.
          const { error: upsertError } = await supabase
            .from('student_subjects') // VERIFY THIS TABLE NAME MATCHES YOUR DB
            .upsert({
              student_id: student.id,
              semester_id: 4,
              subject_id: parseInt(values.optionalSubjectId)
            }, {
              onConflict: 'student_id,semester_id' // VERIFY THIS MATCHES YOUR UNIQUE CONSTRAINT
            });

          if (upsertError) throw upsertError;
        }
      } else {
        // Student moved out of 4th semester: Cleanup any assignment
        await removeStudentOptionalSubject(student.id, 4);
      }

      toast({
        title: "Student Updated",
        description: `${values.name}'s details have been updated successfully.`,
      });
      onStudentUpdated();
      onClose();
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Error updating student",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
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
                      <Input placeholder="John Doe" {...field} />
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
                      <Input placeholder="DIET/2023/001" {...field} />
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
                      <Input type="email" placeholder="john.doe@example.com" {...field} />
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
              {parseInt(selectedSemester) === 4 && (
                <FormField
                  control={form.control}
                  name="optionalSubjectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Optional Subject (4th Semester)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select optional subject" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {subjects.map(subject => (
                            <SelectItem key={subject.id} value={subject.id.toString()}>
                              {subject.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Assign an optional subject for this 4th-semester student.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
            <DialogFooter className="sticky bottom-0 bg-background pt-4 border-t">
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
