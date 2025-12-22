"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  updateStudent,
  Semester,
  Student,
  Subject,
  getStudentOptionalSubject,
  assignStudentOptionalSubject,
  removeStudentOptionalSubject,
} from "@/lib/db";
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

/* ---------------------------- Schema ---------------------------- */

const editStudentFormSchema = z.object({
  name: z.string().min(2).max(100),
  rollNumber: z.string().min(1).max(20),
  email: z.string().email().optional().or(z.literal("")),
  semesterId: z.string().min(1),
  optionalSubjectId: z.string().optional(),
});

type EditStudentFormValues = z.infer<typeof editStudentFormSchema>;

interface EditStudentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  onStudentUpdated: () => void;
}

/* ---------------------------- Component ---------------------------- */

const EditStudentDialog = ({
  isOpen,
  onClose,
  student,
  onStudentUpdated,
}: EditStudentDialogProps) => {
  const { toast } = useToast();

  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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

  /* ---------------------------- Fetch Data ---------------------------- */

  useEffect(() => {
    if (!isOpen || !student) return;

    const loadData = async () => {
      const { data: semesterData } = await supabase
        .from("semesters")
        .select("*")
        .order("id");

      const { data: subjectData } = await supabase
        .from("subjects")
        .select("*")
        .order("name");

      setSemesters(semesterData || []);
      setSubjects(subjectData || []);

      form.reset({
        name: student.name,
        rollNumber: student.roll_number,
        email: student.email || "",
        semesterId: student.semester_id.toString(),
        optionalSubjectId: "none",
      });

      if (student.semester_id === 4) {
        const currentSubject = await getStudentOptionalSubject(student.id, 4);
        form.setValue(
          "optionalSubjectId",
          currentSubject ? currentSubject.toString() : "none"
        );
      }
    };

    loadData();
  }, [isOpen, student, form]);

  /* ---------------------------- Submit ---------------------------- */

  const onSubmit = async (values: EditStudentFormValues) => {
    if (!student) return;

    setIsLoading(true);

    try {
      /* -------- Update student basic data -------- */
      await updateStudent(student.id, {
        name: values.name,
        roll_number: values.rollNumber,
        email: values.email || null,
        semester_id: parseInt(values.semesterId),
        updated_at: new Date().toISOString(),
      });

      /* -------- Optional subject logic -------- */
      const semesterId = parseInt(values.semesterId);
      const selectedOptional = values.optionalSubjectId;
      const existingOptional = await getStudentOptionalSubject(student.id, 4);

      if (semesterId === 4) {
        if (selectedOptional === "none") {
          if (existingOptional) {
            await removeStudentOptionalSubject(student.id, 4);
          }
        } else {
          const newSubjectId = parseInt(selectedOptional);

          if (!existingOptional) {
            await assignStudentOptionalSubject(student.id, newSubjectId, 4);
          } else if (existingOptional !== newSubjectId) {
            await removeStudentOptionalSubject(student.id, 4);
            await assignStudentOptionalSubject(student.id, newSubjectId, 4);
          }
          // same subject → do nothing
        }
      } else {
        // Leaving 4th semester → cleanup
        if (existingOptional) {
          await removeStudentOptionalSubject(student.id, 4);
        }
      }

      toast({
        title: "Student Updated",
        description: "Student details updated successfully.",
      });

      onStudentUpdated();
      onClose();
    } catch (err: any) {
      toast({
        title: "Update failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  /* ---------------------------- UI ---------------------------- */

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Student</DialogTitle>
          <DialogDescription>
            Update details for {student?.name}
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
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                      <Input {...field} />
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
                      <Input type="email" {...field} />
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
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select semester" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {semesters.map((s) => (
                          <SelectItem key={s.id} value={s.id.toString()}>
                            {s.name}
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
                      <FormLabel>Optional Subject</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select optional subject" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {subjects.map((s) => (
                            <SelectItem key={s.id} value={s.id.toString()}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Only applicable for 4th semester students
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
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
