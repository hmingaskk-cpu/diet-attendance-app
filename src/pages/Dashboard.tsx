"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, FileText, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import LoadingSkeleton from "@/components/LoadingSkeleton"; 

const Dashboard = () => {
  const [facultyName, setFacultyName] = useState("");
  const [role, setRole] = useState("");
  const [semesters, setSemesters] = useState<any[]>([]);
  const [studentCounts, setStudentCounts] = useState<Record<number, number>>({});
  const [todayAttendanceCount, setTodayAttendanceCount] = useState(0);
  const [monthlyAttendanceEntriesCount, setMonthlyAttendanceEntriesCount] = useState(0); 
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true); 

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true); 
        
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          
          const { data: userDetails, error: userError } = await supabase
            .from('users')
            .select('name, role')
            .eq('id', user.id)
            .single();
          
          if (userError) throw userError;
          
          setFacultyName(userDetails?.name || "Faculty");
          setRole(userDetails?.role || "Faculty");
          
          const { data: semestersData, error: semestersError } = await supabase
            .from('semesters')
            .select('*')
            .order('id');
          
          if (semestersError) throw semestersError;
          setSemesters(semestersData || []);
          
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
          
          const today = new Date().toISOString().split('T')[0];
          const { data: distinctPeriodsData, error: distinctPeriodsError } = await supabase
            .from('attendance_records')
            .select('period', { distinct: true })
            .eq('date', today);
          
          if (distinctPeriodsError) throw distinctPeriodsError;
          setTodayAttendanceCount(distinctPeriodsData?.length || 0);
          
          const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            .toISOString().split('T')[0];
          
          const { count: monthlyCount, error: monthlyError } = await supabase
            .from('attendance_records')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', firstDayOfMonth); 
          
          if (monthlyError) throw monthlyError;
          setMonthlyAttendanceEntriesCount(monthlyCount || 0); 
        }
      } catch (error: any) {
        toast({
          title: "Error loading dashboard",
          description: error.message,
          variant: "destructive"
        });
      } finally {
        setIsLoading(false); 
      }
    };
    
    fetchDashboardData();
  }, [toast]);

  const totalStudents = Object.values(studentCounts).reduce((sum, count) => sum + count, 0);

  const activeSemesterKeywords = ["1st semester", "2nd semester", "3rd semester", "4th semester"];
  
  const activeSemesters = semesters.filter(sem => 
    activeSemesterKeywords.some(keyword => sem.name.toLowerCase().includes(keyword))
  );
  
  const passedOutSemesters = semesters.filter(sem => 
    !activeSemesterKeywords.some(keyword => sem.name.toLowerCase().includes(keyword))
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="p-4 md:p-6 pb-20 md:pb-6"> 
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 md:p-6 pb-20 md:pb-6"> 
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Attendance Dashboard</h1>
            <p className="text-gray-600">Welcome back, {facultyName}</p>
          </div>
          <Badge variant="secondary">{role}</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="space-y-6">
            <Card className="shadow-sm rounded-lg">
              <CardHeader>
                <CardTitle>Classes</CardTitle>
                <CardDescription>Select a class to take attendance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activeSemesters.length > 0 ? (
                    activeSemesters.map((semester) => (
                      <Link to={`/attendance/${semester.id}`} key={semester.id}>
                        <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors mt-4 first:mt-0">
                          <div>
                            <h3 className="font-medium">{semester.name}</h3>
                            <p className="text-sm text-gray-500">{studentCounts[semester.id] || 0} students</p>
                          </div>
                          <Button variant="outline">
                            Take Attendance
                          </Button>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">No active classes found.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {passedOutSemesters.length > 0 && (
              <Card className="shadow-sm rounded-lg">
                <CardHeader>
                  <CardTitle>Passed out Students</CardTitle>
                  <CardDescription>View records of passed out batches</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {passedOutSemesters.map((semester) => (
                      <Link to={`/students?class=${semester.id}`} key={semester.id}>
                        <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors mt-4 first:mt-0">
                          <div>
                            <h3 className="font-medium">{semester.name}</h3>
                            <p className="text-sm text-gray-500">{studentCounts[semester.id] || 0} students</p>
                          </div>
                          <Button variant="outline">
                            View Students
                          </Button>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div>
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
        </div>

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
              <CardTitle className="text-sm font-medium">Attendance Entries This Month</CardTitle> 
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{monthlyAttendanceEntriesCount}</div> 
              <p className="text-xs text-muted-foreground">Total entries</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
