"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Lock, UserCheck } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

export default function StudentPortal() {
  // Step 1: Authentication State
  const [rollNumber, setRollNumber] = useState("");
  const [pin, setPin] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  
  // Step 2: Form State
  const [student, setStudent] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  
  const { toast } = useToast();

  // --- LOGIN LOGIC ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);

    try {
      // Find the student by Roll Number and check the PIN
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .ilike('roll_number', rollNumber.trim())
        .single();

      if (error || !data) {
        throw new Error("Student not found. Please check your Roll Number.");
      }

      if (data.is_profile_locked) {
        throw new Error("This profile has been locked by the administrator.");
      }

      if (data.access_pin !== pin.trim()) {
        throw new Error("Incorrect PIN.");
      }

      // Success!
      setStudent(data);
      setIsAuthenticated(true);
      toast({ title: "Welcome!", description: `Hello, ${data.name}. You can now update your details.` });
      
    } catch (error: any) {
      toast({ title: "Access Denied", description: error.message, variant: "destructive" });
    } finally {
      setIsAuthenticating(false);
    }
  };

  // --- CLOUDINARY LOGIC ---
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "student_profiles"); // Your Cloudinary Preset

    try {
      const response = await fetch("https://api.cloudinary.com/v1_1/dadkmxvlj/image/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      
      if (data.secure_url) {
        // Instantly save to state
        setStudent({ ...student, profile_photo_url: data.secure_url });
        toast({ title: "Photo Uploaded", description: "Your profile photo has been updated." });
      } else {
        throw new Error("Upload failed");
      }
    } catch (error) {
      toast({ title: "Error", description: "Could not upload image.", variant: "destructive" });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // --- UPDATE LOGIC ---
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('students')
        .update({
          email: student.email,
          phone_number: student.phone_number,
          address: student.address,
          qualification: student.qualification,
          date_of_birth: student.date_of_birth,
          parent_name: student.parent_name,
          aadhaar_number: student.aadhaar_number,
          profile_photo_url: student.profile_photo_url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', student.id);

      if (error) throw error;

      toast({ title: "Success!", description: "Your profile has been updated successfully." });
      
      // Optional: Log them out after saving so the next student can use the device
      setIsAuthenticated(false);
      setRollNumber("");
      setPin("");
      setStudent(null);
      
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to save details. Please try again.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-xl">
        
        {/* LOGO / HEADER SECTION */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Student Portal</h1>
          <p className="text-gray-500 mt-2">Update your personal information and profile photo.</p>
        </div>

        {/* STEP 1: AUTHENTICATION (SHOWN IF NOT LOGGED IN) */}
        {!isAuthenticated ? (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5"/> Portal Login</CardTitle>
              <CardDescription>Enter your Roll Number and PIN provided by the administration.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="roll">Roll Number</Label>
                  <Input 
                    id="roll" 
                    placeholder="e.g. DIET/2023/001" 
                    value={rollNumber} 
                    onChange={(e) => setRollNumber(e.target.value)} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pin">PIN</Label>
                  <Input 
                    id="pin" 
                    type="password" 
                    placeholder="Enter PIN (Default is 1234)" 
                    value={pin} 
                    onChange={(e) => setPin(e.target.value)} 
                    required 
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isAuthenticating}>
                  {isAuthenticating ? "Verifying..." : "Access My Profile"}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (

        /* STEP 2: PROFILE UPDATE FORM (SHOWN IF LOGGED IN) */
          <Card className="shadow-lg border-t-4 border-t-blue-600">
            <CardHeader className="bg-white pb-0">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl">{student.name}</CardTitle>
                  <CardDescription className="font-medium text-blue-600 mt-1">Roll No: {student.roll_number}</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setIsAuthenticated(false)}>Logout</Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSave} className="space-y-6">
                
                {/* PHOTO UPLOAD */}
                <div className="flex flex-col items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <Avatar className="h-24 w-24 border-4 border-white shadow-md">
                    <AvatarImage src={student.profile_photo_url || ""} />
                    <AvatarFallback className="bg-blue-100 text-blue-700 text-2xl font-bold">
                      {student.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-center gap-1">
                    <Label htmlFor="photo-upload" className="cursor-pointer text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-full transition-colors shadow-sm">
                      {isUploadingPhoto ? "Uploading..." : "Upload Profile Photo"}
                    </Label>
                    <Input id="photo-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploadingPhoto} />
                    <span className="text-xs text-gray-500 mt-1">Format: JPG or PNG. Max 5MB.</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" value={student.phone_number || ""} onChange={(e) => setStudent({...student, phone_number: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" type="email" value={student.email || ""} onChange={(e) => setStudent({...student, email: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dob">Date of Birth</Label>
                    <Input id="dob" type="date" value={student.date_of_birth || ""} onChange={(e) => setStudent({...student, date_of_birth: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="qualification">Qualification</Label>
                    <Input id="qualification" placeholder="e.g. BA, B.Sc" value={student.qualification || ""} onChange={(e) => setStudent({...student, qualification: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="parent">Father/Mother Name</Label>
                    <Input id="parent" value={student.parent_name || ""} onChange={(e) => setStudent({...student, parent_name: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="aadhaar">Aadhaar Number</Label>
                    <Input id="aadhaar" value={student.aadhaar_number || ""} onChange={(e) => setStudent({...student, aadhaar_number: e.target.value})} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Permanent Address</Label>
                  <Textarea id="address" className="resize-none h-20" value={student.address || ""} onChange={(e) => setStudent({...student, address: e.target.value})} />
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <Button type="submit" className="w-full text-lg h-12" disabled={isSaving || isUploadingPhoto}>
                    <UserCheck className="mr-2 h-5 w-5" />
                    {isSaving ? "Saving details..." : "Save My Details"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
