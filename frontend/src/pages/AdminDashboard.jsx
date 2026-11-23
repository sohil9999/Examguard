import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import API from "../services/api";

function AdminDashboard() {
    const navigate = useNavigate();

    const adminName = localStorage.getItem("admin_name") || "Administrator";

    const [totalExams, setTotalExams] = useState(0);
    const [totalStudents, setTotalStudents] = useState(0);
    const [activeExams, setActiveExams] = useState(0);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [message, setMessage] = useState("");

    // Fetch dashboard statistics
    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const token = localStorage.getItem("access_token");

            const examResponse = await API.get("/exams/all", {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const exams = examResponse.data.exams || [];

            setTotalExams(exams.length);

            setActiveExams(
                exams.filter(
                    (exam) =>
                        exam.status?.toLowerCase() === "published" ||
                        exam.status?.toLowerCase() === "active"
                ).length
            );

            const studentResponse = await API.get(
                "/auth/admin/students/count",
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            setTotalStudents(
                studentResponse.data.total_students
            );

        } catch (error) {
            setMessage(
                error.response?.data?.message ||
                "Unable to load dashboard statistics."
            );
        } finally {
            setLoading(false);
        }
    };

    // Admin Logout
    const handleLogout = () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("admin_name");
        localStorage.removeItem("role");

        navigate("/admin-login");
    };

    // Export all student examination reports
    const handleExportPDF = async () => {
        try {
            setExporting(true);
            setMessage("");

            const token = localStorage.getItem("access_token");

            const response = await API.get(
                "/exams/admin/reports/pdf",
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    },
                    responseType: "blob"
                }
            );

            const pdfBlob = new Blob(
                [response.data],
                { type: "application/pdf" }
            );

            const downloadUrl = window.URL.createObjectURL(pdfBlob);

            const link = document.createElement("a");
            link.href = downloadUrl;
            link.download = "ExamGuard_Student_Reports.pdf";

            document.body.appendChild(link);
            link.click();

            link.remove();
            window.URL.revokeObjectURL(downloadUrl);

        } catch (error) {
            console.error("PDF Export Error:", error);
            setMessage("Unable to export student reports PDF.");
        } finally {
            setExporting(false);
        }
    };

    return (
        <div style={{
            minHeight: "100vh",
            background: "#f1f5f9"
        }}>

            {/* Header */}
            <header style={{
                background: "#1e3a8a",
                color: "white",
                padding: "20px 40px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
            }}>
                <h2>ExamGuard Admin</h2>

                <button
                    onClick={handleLogout}
                    style={{
                        padding: "10px 20px",
                        background: "white",
                        color: "#1e3a8a",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer"
                    }}
                >
                    Logout
                </button>
            </header>

            {/* Dashboard Content */}
            <main style={{ padding: "40px" }}>

                <h1>Welcome, {adminName}!</h1>

                <p style={{
                    marginTop: "10px",
                    color: "#64748b"
                }}>
                    Manage examinations and monitor student activity.
                </p>

                {message && (
                    <p style={{
                        color: "red",
                        marginTop: "15px"
                    }}>
                        {message}
                    </p>
                )}

                {/* Dashboard Statistics */}
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "20px",
                    marginTop: "35px"
                }}>

                    <div style={cardStyle}>
                        <h3>Total Exams</h3>
                        <h1>{loading ? "..." : totalExams}</h1>
                    </div>

                    <div style={cardStyle}>
                        <h3>Total Students</h3>
                        <h1>{loading ? "..." : totalStudents}</h1>
                    </div>

                    <div style={cardStyle}>
                        <h3>Active Exams</h3>
                        <h1>{loading ? "..." : activeExams}</h1>
                    </div>

                </div>

                {/* Examination Management */}
                <div style={{
                    background: "white",
                    padding: "30px",
                    borderRadius: "12px",
                    marginTop: "30px"
                }}>

                    <h2>Examination Management</h2>

                    {/* Create Examination */}
                    <button
                        onClick={() => navigate("/create-exam")}
                        style={{
                            marginTop: "20px",
                            padding: "12px 24px",
                            background: "#2563eb",
                            color: "white",
                            border: "none",
                            borderRadius: "8px",
                            cursor: "pointer",
                            fontSize: "15px",
                            fontWeight: "bold"
                        }}
                    >
                        + Create New Examination
                    </button>

                    {/* Manage Examinations */}
                    <button
                        onClick={() => navigate("/manage-exams")}
                        style={{
                            marginTop: "20px",
                            marginLeft: "10px",
                            padding: "12px 24px",
                            background: "#0f766e",
                            color: "white",
                            border: "none",
                            borderRadius: "8px",
                            cursor: "pointer",
                            fontSize: "15px",
                            fontWeight: "bold"
                        }}
                    >
                        Manage Examinations
                    </button>

                    {/* Manage Students */}
                    <button
                        onClick={() => navigate("/manage-students")}
                        style={{
                            marginTop: "20px",
                            marginLeft: "10px",
                            padding: "12px 24px",
                            background: "#7c3aed",
                            color: "white",
                            border: "none",
                            borderRadius: "8px",
                            cursor: "pointer",
                            fontSize: "15px",
                            fontWeight: "bold"
                        }}
                    >
                        Manage Students
                    </button>

                    {/* Export Student Reports */}
                    <button
                        onClick={handleExportPDF}
                        disabled={exporting}
                        style={{
                            marginTop: "20px",
                            marginLeft: "10px",
                            padding: "12px 24px",
                            background: exporting ? "#94a3b8" : "#dc2626",
                            color: "white",
                            border: "none",
                            borderRadius: "8px",
                            cursor: exporting ? "not-allowed" : "pointer",
                            fontSize: "15px",
                            fontWeight: "bold"
                        }}
                    >
                        {exporting ? "Generating PDF..." : "Export Student Reports (PDF)"}
                    </button>

                    <p style={{
                        marginTop: "20px",
                        color: "#64748b"
                    }}>
                        Create, view and manage your examinations.
                    </p>

                </div>

            </main>
        </div>
    );
}

const cardStyle = {
    background: "white",
    padding: "25px",
    borderRadius: "12px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
};

export default AdminDashboard;