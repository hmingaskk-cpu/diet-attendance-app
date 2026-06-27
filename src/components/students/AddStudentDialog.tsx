"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { createStudent, Semester, Subject } from "@/lib/db";
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

const addStudentFormSchema = z.object({
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
  optionalSubject4th: z.string().optional().default("none"),
  optionalSubject2nd_1: z.string().optional().default("none"),
  optionalSubject2nd_2: z.string().optional().default("none"),
});

type AddStudentFormValues = z.infer<typeof addStudentFormSchema>;

interface AddStudentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onStudentAdded: () => void;
}

const AddStudentDialog = ({ isOpen, onClose, onStudentAdded }: AddStudentDialogProps) => {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<AddStudentFormValues>({
    resolver: zodResolver(addStudentFormSchema),
    defaultValues: {
      name: "",
      rollNumber: "",
      email: "",
      semesterId: "",
      optionalSubject4th: "none",
      optionalSubject2nd_1: "none",
      optionalSubject2nd_2: "none",
    },
  });

  const selectedSemester = form.watch("semesterId");
  const isSecondSemester = selectedSemester === "2";
  const isFourthSemester = selectedSemester === "4";

  const secondSemSubjects = subjects.filter(s => 
    ['english', 'mizo', 'mathematics', 'evs', 'science', 'ss', 'other subjects'].includes(s.name.toLowerCase())
  );
  
  const fourthSemSubjects = subjects.filter(s => 
    ['maths', 'science', 'english', 'social studies', 'other subjects'].includes(s.name.toLowerCase())
  );

  useEffect(() => {
    const fetchData = async () => {
      const { data: semData, error: semError } = await supabase.from('semesters').select('*').order('id');
      if (!semError) setSemesters(semData || []);
      
      const { data: subData, error: subError } = await supabase.from('subjects').select('*').order('name');
      if (!subError) setSubjects(subData || []);
    };
    
    if (isOpen) {
      fetchData();
      form.reset(); 
    }
  }, [isOpen, form]);

  const onSubmit = async (values: AddStudentFormValues) => {
    setIsLoading(true);

    try {
      // 1. Create the student
      const newStudent = await createStudent({
        name: values.name,
        roll_number: values.rollNumber,
        email: values.email || null, 
        semester_id: parseInt(values.semesterId)
      });

      // 2. Assign Optional Subjects (if any)
      const subjectInserts: { student_id: number, semester_id: number, subject_id: number }[] = [];

      if (isSecondSemester) {
        const uniqueSubjects = new Set<string>();
        if (values.optionalSubject2nd_1 && values.optionalSubject2nd_1 !== "none") uniqueSubjects.add(values.optionalSubject2nd_1);
        if (values.optionalSubject2nd_2 && values.optionalSubject2nd_2 !== "none") uniqueSubjects.add(values.optionalSubject2nd_2);
        
        uniqueSubjects.forEach(subId => {
          subjectInserts.push({ student_id: newStudent.id, semester_id: 2, subject_id: parseInt(subId) });
        });
      } else if (isFourthSemester) {
        if (values.optionalSubject4th && values.optionalSubject4th !== "none") {
          subjectInserts.push({ student_id: newStudent.id, semester_id: 4, subject_id: parseInt(values.optionalSubject4th) });
        }
      }

      // 3. Save subjects to database
      if (subjectInserts.length > 0) {
        const { error: subjectError } = await supabase.from('student_subjects').insert(subjectInserts);
        if (subjectError) throw subjectError;
      }

      toast({
        title: "Student Added",
        description: `${values.name} has been added successfully.`,
      });
      onStudentAdded();
      onClose();
    } catch (error: any) {
      toast({
        title: "Error adding student",
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
          <DialogTitle>Add New Student</DialogTitle>
          <DialogDescription>
            Enter the details for the new student. Click save when you're done.
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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

              {/* 2nd Semester Subject Options */}
              {isSecondSemester && (
                <div className="p-3 mt-2 border rounded-md bg-gray-50/50 space-y-4">
                  <h4 className="font-medium text-sm text-gray-700">Optional Subjects (Select up to 2)</h4>
                  <FormField
                    control={form.control}
                    name="optionalSubject2nd_1"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Subject 1</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select Subject 1" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {secondSemSubjects.map(sub => (
                              <SelectItem key={sub.id} value={sub.id.toString()}>{sub.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="optionalSubject2nd_2"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Subject 2</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select Subject 2" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {secondSemSubjects.map(sub => (
                              <SelectItem key={sub.id} value={sub.id.toString()}>{sub.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* 4th Semester Subject Options */}
              {isFourthSemester && (
                <FormField
                  control={form.control}
                  name="optionalSubject4th"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Optional Subject</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select optional subject" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {fourthSemSubjects.map(sub => (
                            <SelectItem key={sub.id} value={sub.id.toString()}>
                              {sub.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>Assign an optional subject for this student.</FormDescription>
                    </FormItem>
                  )}
                />
              )}
            </div>
            <DialogFooter className="sticky bottom-0 bg-background pt-4 border-t">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Student"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddStudentDialog;
