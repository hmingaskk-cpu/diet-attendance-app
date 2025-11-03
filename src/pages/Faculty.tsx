"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Edit, Trash2, Eye } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import { User } from "@/lib/db";
import AddFacultyDialog from "@/components/faculty/AddFacultyDialog";
import EditFacultyDialog from "@/components/faculty/EditFacultyDialog";
import ViewFacultyDialog from "@/components/faculty/ViewFacultyDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"; // Import Dialog components

const Faculty = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [facultyMembers, setFacultyMembers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState("");
  const [isAddFacultyDialogOpen, setIsAddFacultyDialogOpen] = useState(false);
  const [isEditFacultyDialogOpen, setIsEditFacultyDialogOpen] = useState(false);
  const [isViewFacultyDialogOpen, setIsViewFacultyDialogOpen] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState<User | null>(null);
  const { toast } = useToast();

  const fetchFacultyData = async () => {
    try {
      setIsLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userDetails, error: userDetailsError } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();
        
        if (userDetailsError) throw userDetailsError;
        
        if (userDetails) {
          setCurrentUserRole(userDetails.role);
          console.log("Current user role:", userDetails.role);
        }
      }
      
      // Get all faculty members
      const { data: facultyData, error: facultyError } = await supabase
        .from('users')
        .select('*')
        .order('name');
      
      if (facultyError) throw facultyError;
      setFacultyMembers(facultyData || []);
    } catch (error: any) {
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFacultyData();
  }, [toast]);

  const handleAddFaculty = () => {
    if (currentUserRole !== "admin") {
      toast({
        title: "Access Denied",
        description: "Only administrators can add faculty members.",
        variant: "destructive"
      });
      return;
    }
    setIsAddFacultyDialogOpen(true);
  };

  const handleEditFaculty = (member: User) => {
    console.log("handleEditFaculty called with member:", member);
    if (currentUserRole !== "admin") {
      toast({
        title: "Access Denied",
        description: "Only administrators can edit faculty members.",
        variant: "destructive"
      });
      return;
    }
    setSelectedFaculty(member);
    setIsEditFacultyDialogOpen(true);
    console.log("isEditFacultyDialogOpen set to true for member:", member.name);
  };

  const handleViewFaculty = (member: User) => {
    console.log("handleViewFaculty called with member:", member);
    setSelectedFaculty(member);
    setIsViewFacultyDialogOpen(true);
    console.log("isViewFacultyDialogOpen set to true for member:", member.name);
  };

  const handleDeleteFaculty = async (id: string) => {
    if (currentUserRole !== "admin") {
      toast({
        title: "Access Denied",
        description: "Only administrators can delete faculty members.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      fetchFacultyData(); // Refresh faculty list
      
      toast({
        title: "Faculty Member Deleted",
        description: "The faculty member has been successfully removed."
      });
    } catch (error: any) {
      toast({
        title: "Error deleting faculty member",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const filteredFaculty = facultyMembers.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          member.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === "all" || member.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="p-4 md:p-6 pb-20 md:pb-6">
          <LoadingSkeleton count={1} height="h-10" width="w-1/2" className="mb-6" />
          <LoadingSkeleton count={1} height="h-40" className="mb-6" />
          <LoadingSkeleton count={5} height="h-12" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 md:p-6 pb-20 md:pb-6">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">Faculty Management</h1>
          <p className="text-gray-600">Manage faculty accounts and permissions</p>
        </div>

        <Card className="shadow-sm rounded-lg">
          <CardHeader>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <CardTitle>Faculty Members</CardTitle>
                <CardDescription>
                  View and manage faculty accounts
                </CardDescription>
              </div>
              <div className="flex space-x-2">
                <Button onClick={handleAddFaculty} disabled={currentUserRole !== "admin"}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Faculty
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search faculty by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="faculty">Faculty</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFaculty.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.name}</TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell>
                        <Badge variant={member.role === "admin" ? "default" : "secondary"}>
                          {member.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={member.status === "active" ? "default" : "destructive"}>
                          {member.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" size="sm" onClick={() => handleViewFaculty(member)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleEditFaculty(member)}
                            disabled={currentUserRole !== "admin"}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                disabled={currentUserRole !== "admin"}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete the faculty member 
                                  and remove their data from our servers.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteFaculty(member.id)}>Continue</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-lg">
          <CardHeader>
            <CardTitle>Role-Based Access Control</CardTitle>
            <CardDescription>
              Manage permissions for different user roles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">Admin Permissions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">Student Management</h4>
                    <p className="text-sm text-gray-500">Import, export, add, edit, delete students</p>
                  </div>
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">Faculty Management</h4>
                    <p className="text-sm text-gray-500">Add, edit, delete faculty accounts</p>
                  </div>
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">System Reports</h4>
                    <p className="text-sm text-gray-500">Generate and view all system reports</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-2">Faculty Permissions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">Attendance Taking</h4>
                    <p className="text-sm text-gray-500">Take attendance for assigned classes</p>
                  </div>
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">View Reports</h4>
                    <p className="text-sm text-gray-500">View attendance reports for their classes</p>
                  </div>
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">Student Records</h4>
                    <p className="text-sm text-gray-500">View student information for their classes</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TEST DIALOG - ALWAYS OPEN */}
      <Dialog open={true}>
        <DialogContent className="sm:max-w-[425px]">
          {console.log("TEST DIALOG: DialogContent is rendering!")}
          <DialogHeader>
            <DialogTitle>Test Dialog</DialogTitle>
            <DialogDescription>
              This dialog should always be visible.
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 bg-green-100">
            <p>If you see this, the Dialog component is working!</p>
          </div>
        </DialogContent>
      </Dialog>

      <AddFacultyDialog 
        isOpen={isAddFacultyDialogOpen} 
        onClose={() => setIsAddFacultyDialogOpen(false)} 
        onFacultyAdded={fetchFacultyData} 
      />
      <EditFacultyDialog
        isOpen={isEditFacultyDialogOpen}
        onClose={() => setIsEditFacultyDialogOpen(false)}
        facultyMember={selectedFaculty}
        onFacultyUpdated={fetchFacultyData}
      />
      <ViewFacultyDialog
        isOpen={isViewFacultyDialogOpen}
        onClose={() => setIsViewFacultyDialogOpen(false)}
        facultyMember={selectedFaculty}
      />
    </div >
  );
};

export default Faculty;