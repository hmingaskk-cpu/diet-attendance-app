"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, FileText, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import LoadingSkeleton from "@/components/LoadingSkeleton"; // Import LoadingSkeleton
import MobileBottomNavigation from "@/components/MobileBottomNavigation"; // Import MobileBottomNavigation

const Dashboard = () => {
  const [facultyName, setFacultyName] = useState("");
  const [role, setRole] = useState("");
  const [semesters, setSemesters] = useState<any[]>([]);
  const [studentCounts, setStudentCounts] = useState<Record<number, number>>({});
  const [todayAttendanceCount, setTodayAttendanceCount] = useState(0);
  const [reportCount, setReportCount] = useState(0);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true); // Add isLoading state

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true); // Set loading to true at the start
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Get user details
          const { data: userDetails, error: userError } = await supabase
            .from('users')
            .select('name, role')
            .eq('id', user.id)
            .single();
          
          if (userError) throw userError;
          
          setFacultyName(userDetails?.name || "Faculty");
          setRole(userDetails?.role || "Faculty");
          
          // Get semesters
          const { data: semestersData, error: semestersError } = await supabase
            .from('semesters')
            .select('*')
            .order('id');
          
          if (semestersError) throw semestersError;
          setSemesters(semestersData || []);
          
          // Get student counts for each semester
          const counts: Record<number, number> = {};
          for (const semester of semestersData || []) {
            const { count, error } = await supabase
              .from('students')
              .select('*', { count: 'exact', head: true })
              .eq('semester_id', semester.id);
            
            if (error) throw error;
            counts[semester.id] = count || 0;
          }
          setStudentCounts(counts);
          
          // Get today's attendance count
          const today = new Date().toISOString().split('T')[0];
          const { count: attendanceCount, error: attendanceError } = await supabase
            .from('attendance_records')
            .select('*', { count: 'exact', head: true })
            .eq('date', today)
            .eq('faculty_id', user.id);
          
          if (attendanceError) throw attendanceError;
          setTodayAttendanceCount(attendanceCount || 0);
          
          // Get this month's report count
          const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            .toISOString().split('T')[0];
          
          const { count: reportCount, error: reportError } = await supabase
            .from('attendance_records')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', firstDayOfMonth)
            .eq('faculty_id', user.id);
          
          if (reportError) throw reportError;
          setReportCount(reportCount || 0);
        }
      } catch (error: any) {
        toast({
          title: "Error loading dashboard",
          description: error.message,
          variant: "destructive"
        });
      } finally {
        setIsLoading(false); // Set loading to false at the end
      }
    };
    
    fetchDashboardData();
  }, [toast]);

  // Calculate total students
  const totalStudents = Object.values(studentCounts).reduce((sum, count) => sum + count, 0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="p-4 md:p-6 pb-20 md:pb-6"> {/* Added pb-20 for mobile bottom nav */}
          <LoadingSkeleton count={1} height="h-10" width="w-1/2" className="mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <LoadingSkeleton count={1} height="h-32" />
            <LoadingSkeleton count={1} height="h-32" />
            <LoadingSkeleton count={1} height="h-32" />
            <LoadingSkeleton count={1} height="h-32" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <LoadingSkeleton count={3} height="h-24" />
            <div className="space-y-6">
              <LoadingSkeleton count={1} height="h-40" />
              <LoadingSkeleton count={1} height="h-40" />
            </div>
          </div>
        </div>
        <MobileBottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="p-4 md:p-6 pb-20 md:pb-6"> {/* Added pb-20 for mobile bottom nav */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Attendance Dashboard</h1>
            <p className="text-gray-600">Welcome back, {facultyName}</p>
          </div>
          <Badge variant="secondary">{role}</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Classes Card - Moved to top-left */}
          <Card className="shadow-sm rounded-lg">
            <CardHeader>
              <CardTitle>Classes</CardTitle>
              <CardDescription>Select a class to take attendance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {semesters.map((semester) => (
                  <Link to={`/attendance/${semester.id}`} key={semester.id}>
                    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                      <div>
                        <h3 className="font-medium">{semester.name}</h3>
                        <p className="text-sm text-gray-500">{studentCounts[semester.id] || 0} students</p>
                      </div>
                      <Button variant="outline">
                        Take Attendance
                      </Button>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions Card - Moved to top-right */}
          <Card className="shadow-sm rounded-lg">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link to="/reports">
                <Button variant="outline" className="w-full justify-start">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Generate Reports
                </Button>
              </Link>
              <Link to="/students">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="mr-2 h-4 w-4" />
                  Manage Students
                </Button>
              </Link>
              <Link to="/faculty">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="mr-2 h-4 w-4" />
                  Faculty Management
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Summary/Report Cards - Moved to bottom */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-sm rounded-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{semesters.length}</div>
              <p className="text-xs text-muted-foreground">Semesters</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm rounded-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalStudents}</div>
              <p className="text-xs text-muted-foreground">Across all semesters</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm rounded-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Attendance</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayAttendanceCount}</div>
              <p className="text-xs text-muted-foreground">Periods completed</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm rounded-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reports Generated</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportCount}</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>
        </div>
      </div>
      <MobileBottomNavigation />
    </div>
  );
};

export default Dashboard;