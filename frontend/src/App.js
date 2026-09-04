import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Classes from './pages/Classes';
import ClassDetail from './pages/ClassDetail';
import SessionManager from './pages/SessionManager';
import Students from './pages/Students';
import StudentDetails from './pages/StudentDetails';
import Teachers from './pages/Teachers';
import TeacherDetails from './pages/TeacherDetails';
import Attendance from './pages/Attendance';
import MyAttendance from './pages/MyAttendance';
import Finance from './pages/Finance';
import Layout from './components/Layout';
import Substitutions from './pages/Substitutions';
import Settings from './pages/Settings';
import MyFees from './pages/MyFees';
import Complaints from './pages/Complaints';
import StudentPromotion from './pages/StudentPromotion';
import AcademicYears from './pages/AcademicYears';
import Diary from './pages/Diary';
import Assignments from './pages/Assignments';
import Exams from './pages/Exams';
import ClassTests from './pages/ClassTests';
import HolidaysManager from './pages/HolidaysManager';
import StudentAIChat from './pages/StudentAIChat';
import TeacherAIAssistant from './pages/TeacherAIAssistant';
import AISettings from './pages/AISettings';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const PrivateRoute = ({ children, allowedRoles }) => {
  const { user, loading } = React.useContext(AuthContext);
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (allowedRoles && !allowedRoles.includes(user.role?.toLowerCase())) {
     return <Navigate to="/" />;
  }
  return children;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <div className="min-h-screen bg-slate-950 text-slate-100">
            <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="classes" element={<PrivateRoute allowedRoles={['admin', 'teacher']}><Classes /></PrivateRoute>} />
              <Route path="classes/:id" element={<PrivateRoute allowedRoles={['admin', 'teacher']}><ClassDetail /></PrivateRoute>} />
              <Route path="academic-years" element={<PrivateRoute allowedRoles={['admin']}><AcademicYears /></PrivateRoute>} />
              <Route path="sessions" element={<PrivateRoute allowedRoles={['admin']}><SessionManager /></PrivateRoute>} />
              <Route path="students" element={<PrivateRoute allowedRoles={['admin', 'teacher']}><Students /></PrivateRoute>} />
              <Route path="students/promotion" element={<PrivateRoute allowedRoles={['admin']}><StudentPromotion /></PrivateRoute>} />
              <Route path="students/:id" element={<PrivateRoute allowedRoles={['admin', 'teacher']}><StudentDetails /></PrivateRoute>} />
              <Route path="teachers" element={<PrivateRoute allowedRoles={['admin']}><Teachers /></PrivateRoute>} />
              <Route path="teachers/:id" element={<PrivateRoute allowedRoles={['admin']}><TeacherDetails /></PrivateRoute>} />
              <Route path="attendance" element={<PrivateRoute allowedRoles={['admin', 'teacher']}><Attendance /></PrivateRoute>} />
              <Route path="my-attendance" element={<MyAttendance />} />
              <Route path="my-fees" element={<PrivateRoute allowedRoles={['student', 'parent']}><MyFees /></PrivateRoute>} />
              <Route path="diary" element={<PrivateRoute allowedRoles={['admin', 'teacher', 'student', 'parent']}><Diary /></PrivateRoute>} />
              <Route path="assignments" element={<PrivateRoute allowedRoles={['admin', 'teacher', 'student', 'parent']}><Assignments /></PrivateRoute>} />
              <Route path="exams" element={<PrivateRoute allowedRoles={['admin', 'teacher', 'student', 'parent']}><Exams /></PrivateRoute>} />
              <Route path="class-tests" element={<PrivateRoute allowedRoles={['admin', 'teacher', 'student', 'parent']}><ClassTests /></PrivateRoute>} />
              <Route path="complaints" element={<PrivateRoute allowedRoles={['admin', 'teacher', 'student', 'parent']}><Complaints /></PrivateRoute>} />
              <Route path="student-ai" element={<PrivateRoute allowedRoles={['admin', 'student', 'parent', 'teacher']}><StudentAIChat /></PrivateRoute>} />
              <Route path="teacher-ai" element={<PrivateRoute allowedRoles={['admin', 'teacher']}><TeacherAIAssistant /></PrivateRoute>} />
              <Route path="ai-settings" element={<PrivateRoute allowedRoles={['admin']}><AISettings /></PrivateRoute>} />
              <Route path="finance" element={<PrivateRoute allowedRoles={['admin']}><Finance /></PrivateRoute>} />
              <Route path="holidays" element={<PrivateRoute allowedRoles={['admin']}><HolidaysManager /></PrivateRoute>} />
              <Route path="substitutions" element={<PrivateRoute allowedRoles={['admin']}><Substitutions /></PrivateRoute>} />
              <Route path="settings" element={<PrivateRoute allowedRoles={['admin']}><Settings /></PrivateRoute>} />
            </Route>
          </Routes>
          <ToastContainer theme="dark" position="bottom-right" />
        </div>
      </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;