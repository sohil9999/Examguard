import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ExamAttempt from "./pages/ExamAttempt";
import Login from "./pages/Login";
import Register from "./pages/Register";
import StudentDashboard from "./pages/StudentDashboard";
import ManageStudents from "./pages/ManageStudents";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import SelectQuestions from "./pages/SelectQuestions";
import CreateExam from "./pages/CreateExam";
import ManageExams from "./pages/ManageExams";
import AddQuestions from "./pages/AddQuestions";
import ViewQuestions from "./pages/ViewQuestions";

function App() {
    return (
        <BrowserRouter>
            <Routes>

                <Route
                    path="/"
                    element={<Navigate to="/login" />}
                />

                {/* Student Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route
                    path="/student-dashboard"
                    element={<StudentDashboard />}
                />

                {/* Admin Routes */}
                <Route path="/admin-login" element={<AdminLogin />} />
                <Route path="/manage-students" element={<ManageStudents />} />
                <Route
                    path="/admin-dashboard"
                    element={<AdminDashboard />}
                />
                <Route
  path="/student/exam/:examId/select"
  element={<SelectQuestions />}
/>
                <Route
  path="/student/exam/:examId/attempt"
  element={<ExamAttempt />}
/>
                <Route
                    path="/create-exam"
                    element={<CreateExam />}
                />

                <Route
                    path="/manage-exams"
                    element={<ManageExams />}
                />

                {/* Question Management Routes */}
                <Route
                    path="/exams/:examId/questions"
                    element={<AddQuestions />}
                />

                <Route
                    path="/exams/:examId/view-questions"
                    element={<ViewQuestions />}
                />

            </Routes>
        </BrowserRouter>
    );
}

export default App;