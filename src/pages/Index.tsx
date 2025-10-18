// Update this page (the content is just a fallback if you fail to update the page)

import { MadeWithDyad } from "@/components/made-with-dyad";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Users, Calendar, FileText, BarChart3 } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 flex-grow flex flex-col">
        <div className="text-center mb-12 mt-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">DIET Kolasib Attendance System</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Streamline attendance management for faculty members across all semesters
          </p>
        </div>

        <div className="max-w-4xl mx-auto w-full flex-grow flex flex-col">
          <Card className="flex-grow flex flex-col">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl md:text-3xl mb-2">Faculty Attendance Management</CardTitle>
              <CardDescription className="text-lg">
                Efficiently track and manage student attendance across all semesters
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="flex flex-col items-center text-center p-4 bg-blue-50 rounded-lg">
                  <Users className="h-10 w-10 text-blue-600 mb-2" />
                  <h3 className="font-semibold">4 Semesters</h3>
                  <p className="text-sm text-gray-600">1st to 4th Semester</p>
                </div>
                <div className="flex flex-col items-center text-center p-4 bg-green-50 rounded-lg">
                  <Calendar className="h-10 w-10 text-green-600 mb-2" />
                  <h3 className="font-semibold">6 Periods/Day</h3>
                  <p className="text-sm text-gray-600">Attendance per period</p>
                </div>
                <div className="flex flex-col items-center text-center p-4 bg-purple-50 rounded-lg">
                  <FileText className="h-10 w-10 text-purple-600 mb-2" />
                  <h3 className="font-semibold">15+ Faculty</h3>
                  <p className="text-sm text-gray-600">Synchronized access</p>
                </div>
                <div className="flex flex-col items-center text-center p-4 bg-amber-50 rounded-lg">
                  <BarChart3 className="h-10 w-10 text-amber-600 mb-2" />
                  <h3 className="font-semibold">Reports</h3>
                  <p className="text-sm text-gray-600">Detailed analytics</p>
                </div>
              </div>

              <div className="mt-auto">
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <Link to="/login" className="w-full sm:w-auto">
                    <Button size="lg" className="w-full">
                      Faculty Login
                    </Button>
                  </Link>
                  <Link to="/signup" className="w-full sm:w-auto">
                    <Button size="lg" variant="outline" className="w-full">
                      Create Account
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Easy Attendance</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Quickly mark attendance with select all present/absent options for each period.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Data Import/Export</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Import student data from Excel/CSV and export attendance records as needed.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Real-time Sync</CardTitle>
              </CardHeader>
              <CardContent>
                <p>All data synchronized across devices for seamless access by all faculty members.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Index;