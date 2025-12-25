"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { updateStudent, getSemesters, Semester, Student, getSubjects, Subject, getStudentOptionalSubject, assignStudentOptionalSubject, removeStudentOptionalSubject } from "@/lib/db";
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
  }).optional().or(z.literal("")), // Allow empty string for optional email
  semesterId: z.string().min(1, {
    message: "Please select a semester.",
  }),
  optionalSubjectId: z.string().optional(), // New field for optional subject
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
  const [subjects, setSubjects] = useState<Subject[]>([]); // New state for subjects
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<EditStudentFormValues>({
    resolver: zodResolver(editStudentFormSchema),
    defaultValues: {
      name: "",
      rollNumber: "",
      email: "",
      semesterId: "",
      optionalSubjectId: "none", // Default to "none" for the Select component
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
          optionalSubjectId: "none", // Reset optional subject initially to "none"
        });

        // Fetch optional subject if student is in 4th semester
        if (student.semester_id === 4) {
          getStudentOptionalSubject(student.id, 4).then(subjectId => {
            // Set to "none" if null, otherwise toString()
            form.setValue("optionalSubjectId", subjectId ? subjectId.toString() : "none");
          }).catch(error => {
            toast({
              title: "Error fetching optional subject",
              description: error.message,
              variant: "destructive"
            });
          });
        }
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

      // Handle optional subject assignment only for 4th semester
      if (parseInt(values.semesterId) === 4) {
        // FIX: Always remove the existing assignment first to avoid duplicate key constraint violations
        // when switching from one subject to another.
        const currentOptionalSubject = await getStudentOptionalSubject(student.id, 4);
        if (currentOptionalSubject) {
          await removeStudentOptionalSubject(student.id, 4);
        }

        // If the user selected a specific subject (not "none"), assign it.
        // Since we removed the old one above, this will insert cleanly.
        if (values.optionalSubjectId !== "none") {
          await assignStudentOptionalSubject(student.id, parseInt(values.optionalSubjectId), 4);
        }
      } else {
        // If student is moved out of 4th semester, remove any optional subject assignment
        const currentOptionalSubject = await getStudentOptionalSubject(student.id, 4);
        if (currentOptionalSubject) {
          await removeStudentOptionalSubject(student.id, 4);
        }
      }

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
