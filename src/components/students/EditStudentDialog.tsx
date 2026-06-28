"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { updateStudent, Semester, Subject } from "@/lib/db";
import { supabase } from "@/lib/supabaseClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera } from "lucide-react";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";

const editStudentFormSchema = z.object({
  name: z.string().min(2).max(100),
  rollNumber: z.string().min(1).max(20),
  email: z.string().email().optional().or(z.literal("")),
  phoneNumber: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  semesterId: z.string().min(1),
  optionalSubject4th: z.string().optional().default("none"),
  optionalSubject2nd_1: z.string().optional().default("none"),
  optionalSubject2nd_2: z.string().optional().default("none"),
});

type EditStudentFormValues = z.infer<typeof editStudentFormSchema>;

interface EditStudentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  student: any; 
  onStudentUpdated: () => void;
}

const EditStudentDialog = ({ isOpen, onClose, student, onStudentUpdated }: EditStudentDialogProps) => {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const { toast } = useToast();

  const form = useForm<EditStudentFormValues>({
    resolver: zodResolver(editStudentFormSchema),
    defaultValues: {
      name: "", rollNumber: "", email: "", phoneNumber: "", address: "", semesterId: "",
      optionalSubject4th: "none", optionalSubject2nd_1: "none", optionalSubject2nd_2: "none",
    },
  });

  const selectedSemester = form.watch("semesterId");
  const isSecondSemester = selectedSemester === "2";
  const isFourthSemester = selectedSemester === "4";

  const secondSemSubjects = subjects.filter(s => ['english', 'mizo', 'mathematics', 'evs', 'science', 'ss', 'other subjects'].includes(s.name.toLowerCase()));
  const fourthSemSubjects = subjects.filter(s => ['maths', 'science', 'english', 'social studies', 'other subjects'].includes(s.name.toLowerCase()));

  useEffect(() => {
    const fetchData = async () => {
      const { data: semData } = await supabase.from('semesters').select('*').order('id');
      if (semData) setSemesters(semData);
      const { data: subData } = await supabase.from('subjects').select('*').order('name');
      if (subData) setSubjects(subData);
    };
    
    if (isOpen) {
      fetchData();
      if (student) {
        setPhotoUrl(student.profile_photo_url || null); // Load existing photo
        form.reset({
          name: student.name || "", rollNumber: student.roll_number || "", email: student.email || "",
          phoneNumber: student.phone_number || "", address: student.address || "",
          semesterId: student.semester_id?.toString() || "",
          optionalSubject4th: "none", optionalSubject2nd_1: "none", optionalSubject2nd_2: "none",
        });

        if (student.semester_id === 2 || student.semester_id === 4) {
          supabase.from('student_subjects').select('subject_id').eq('student_id', student.id).eq('semester_id', student.semester_id)
            .then(({ data, error }) => {
               if (!error && data && data.length > 0) {
                 if (student.semester_id === 4) form.setValue("optionalSubject4th", data[0].subject_id.toString());
                 else if (student.semester_id === 2) {
                   form.setValue("optionalSubject2nd_1", data[0]?.subject_id.toString() || "none");
                   form.setValue("optionalSubject2nd_2", data[1]?.subject_id.toString() || "none");
                 }
               }
            });
        }
      }
    }
  }, [isOpen, student, form]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "student_profiles"); 

    try {
      const response = await fetch("https://api.cloudinary.com/v1_1/dadkmxvlj/image/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (data.secure_url) {
        setPhotoUrl(data.secure_url);
        toast({ title: "Photo Uploaded Successfully", description: "The profile image has been updated." });
      } else {
        throw new Error("Failed to upload");
      }
    } catch (error) {
      toast({ title: "Upload Failed", description: "Could not upload image to Cloudinary.", variant: "destructive" });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const onSubmit = async (values: EditStudentFormValues) => {
    if (!student) return;
    setIsLoading(true);

    try {
      await updateStudent(student.id, {
        name: values.name, roll_number: values.rollNumber, email: values.email || null,
        phone_number: values.phoneNumber || null, address: values.address || null,
        semester_id: parseInt(values.semesterId), updated_at: new Date().toISOString(),
        profile_photo_url: photoUrl // Save the URL!
      });

      await supabase.from('student_subjects').delete().eq('student_id', student.id);
      const subjectInserts: { student_id: number, semester_id: number, subject_id: number }[] = [];

      if (isSecondSemester) {
        const uniqueSubjects = new Set<string>();
        if (values.optionalSubject2nd_1 !== "none") uniqueSubjects.add(values.optionalSubject2nd_1);
        if (values.optionalSubject2nd_2 !== "none") uniqueSubjects.add(values.optionalSubject2nd_2);
        uniqueSubjects.forEach(subId => subjectInserts.push({ student_id: student.id, semester_id: 2, subject_id: parseInt(subId) }));
      } else if (isFourthSemester) {
        if (values.optionalSubject4th !== "none") subjectInserts.push({ student_id: student.id, semester_id: 4, subject_id: parseInt(values.optionalSubject4th) });
      }

      if (subjectInserts.length > 0) await supabase.from('student_subjects').insert(subjectInserts);

      toast({ title: "Student Updated", description: `${values.name}'s details have been updated successfully.` });
      onStudentUpdated();
      onClose();
    } catch (error: any) {
      toast({ title: "Error updating student", description: error.message || "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Student</DialogTitle>
          <DialogDescription>Update the details for {student?.name}. Click save when you're done.</DialogDescription>
        </DialogHeader>

        {/* Custom Profile Photo Upload UI */}
        <div className="flex flex-col items-center gap-3 py-4 border-b">
          <Avatar className="h-20 w-20 border-2 border-gray-100 shadow-sm">
            <AvatarImage src={photoUrl || ""} />
            <AvatarFallback className="bg-blue-50 text-blue-600 text-xl font-medium">
              {form.watch("name") ? form.watch("name").substring(0, 2).toUpperCase() : <Camera className="h-6 w-6 text-gray-400" />}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-center gap-1">
            <Label htmlFor="edit-photo-upload" className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-full transition-colors">
              {isUploadingPhoto ? "Uploading..." : photoUrl ? "Change Photo" : "Upload Photo"}
            </Label>
            <Input id="edit-photo-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploadingPhoto} />
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-4 py-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Student Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="rollNumber" render={({ field }) => (
                <FormItem><FormLabel>Roll Number</FormLabel><FormControl><Input placeholder="DIET/2023/001" {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Email (Optional)</FormLabel><FormControl><Input type="email" placeholder="john@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                  <FormItem><FormLabel>Phone (Optional)</FormLabel><FormControl><Input type="tel" placeholder="1234567890" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
              </div>

              <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem><FormLabel>Address (Optional)</FormLabel><FormControl><Textarea placeholder="123 Main St..." className="resize-none h-16" {...field} /></FormControl><FormMessage /></FormItem>
              )}/>

              <FormField control={form.control} name="semesterId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Semester</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select semester" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {semesters.map(semester => (<SelectItem key={semester.id} value={semester.id.toString()}>{semester.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}/>
              
              {isSecondSemester && (
                <div className="p-3 mt-2 border rounded-md bg-gray-50/50 space-y-4">
                  <h4 className="font-medium text-sm text-gray-700">Optional Subjects (Select up to 2)</h4>
                  <FormField control={form.control} name="optionalSubject2nd_1" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs">Subject 1</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select Subject 1" /></SelectTrigger></FormControl><SelectContent><SelectItem value="none">None</SelectItem>{secondSemSubjects.map(sub => (<SelectItem key={sub.id} value={sub.id.toString()}>{sub.name}</SelectItem>))}</SelectContent></Select>
                    </FormItem>
                  )}/>
                  <FormField control={form.control} name="optionalSubject2nd_2" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs">Subject 2</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select Subject 2" /></SelectTrigger></FormControl><SelectContent><SelectItem value="none">None</SelectItem>{secondSemSubjects.map(sub => (<SelectItem key={sub.id} value={sub.id.toString()}>{sub.name}</SelectItem>))}</SelectContent></Select>
                    </FormItem>
                  )}/>
                </div>
              )}

              {isFourthSemester && (
                <FormField control={form.control} name="optionalSubject4th" render={({ field }) => (
                  <FormItem><FormLabel>Optional Subject</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select optional subject" /></SelectTrigger></FormControl><SelectContent><SelectItem value="none">None</SelectItem>{fourthSemSubjects.map(subject => (<SelectItem key={subject.id} value={subject.id.toString()}>{subject.name}</SelectItem>))}</SelectContent></Select>
                  </FormItem>
                )}/>
              )}
            </div>
            <DialogFooter className="sticky bottom-0 bg-background pt-4 border-t">
              <Button type="submit" disabled={isLoading}>{isLoading ? "Saving..." : "Save Changes"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditStudentDialog;
