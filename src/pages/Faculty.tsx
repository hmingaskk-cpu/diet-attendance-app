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
import Navigation from "@/components/Navigation";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import { User } from "@/lib/db";

const Faculty = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [facultyMembers, setFacultyMembers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Get current user role
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: userDetails } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();
          
          if (userDetails) {
            setCurrentUserRole(userDetails.role);
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
    
    fetchData();
  }, [toast]);

  const handleAddFaculty = () => {
    // Only admins can add faculty
    if (currentUserRole !== "admin") {
      toast({
        title: "Access Denied",
        description: "Only administrators can add faculty members.",
        variant: "destructive"
      });
      return;
    }
    
    toast({
      title: "Add Faculty",
      description: "This feature will be implemented in a future update."
    });
  };

  const handleEditFaculty = (id: string) => {
    // Only admins can edit faculty
    if (currentUserRole !== "admin") {
      toast({
        title: "Access Denied",
        description: "Only administrators can edit faculty members.",
        variant: "destructive"
      });
      return;
    }
    
    toast({
      title: "Edit Faculty",
      description: "This feature will be implemented in a future update."
    });
  };

  const handleDeleteFaculty = async (id: string) => {
    // Only admins can delete faculty
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
      
      // Remove faculty from local state
      setFacultyMembers(facultyMembers.filter(member => member.id !== id));
      
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
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading faculty data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="p-4 md:p-6">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">Faculty Management</h1>
          <p className="text-gray-600">Manage faculty accounts and permissions</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Faculty Members</CardTitle>
                <CardDescription>
                  View and manage faculty accounts
                </CardDescription>
              </div>
              <div className="flex space-x-2 mt-2 md:mt-0">
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

            <div className="overflow-x-auto"> {/* Added for horizontal scrolling on mobile */}
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
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleEditFaculty(member.id)}
                            disabled={currentUserRole !== "admin"}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDeleteFaculty(member.id)}
                            disabled={currentUserRole !== "admin"}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
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
    </div>
  );
};

export default Faculty;