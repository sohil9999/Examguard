import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function StudentDashboard() {
  const navigate = useNavigate();

  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      const token = localStorage.getItem("access_token");

      const response = await api.get("/exams/student/available", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setExams(response.data.exams || []);
    } catch (error) {
      console.error("Error fetching examinations:", error);
      setError(
        error.response?.data?.message ||
          "Unable to load examinations. Please log in again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h2>ExamGuard</h2>
        <button onClick={handleLogout} style={styles.logoutButton}>
          Logout
        </button>
      </header>

      <main style={styles.main}>
        <h1>Student Dashboard</h1>
        <p>Welcome! Your available examinations are listed below.</p>

        {loading ? (
          <p>Loading examinations...</p>
        ) : error ? (
          <p style={styles.error}>{error}</p>
        ) : exams.length === 0 ? (
          <div style={styles.empty}>
            <h3>No examinations available</h3>
            <p>Published examinations will appear here.</p>
          </div>
        ) : (
          <div style={styles.examGrid}>
            {exams.map((exam) => (
              <div key={exam.id} style={styles.examCard}>
                <h3>{exam.title}</h3>

                <p>{exam.description || "No description provided."}</p>

                <div style={styles.details}>
                  <span>Questions: {exam.total_questions}</span>
                  <span>Answer any: {exam.required_questions}</span>
                  <span>Duration: {exam.duration} minutes</span>
                </div>

                <button
                  style={styles.startButton}
                  onClick={() =>
  navigate(`/student/exam/${exam.id}/select`)
}
                >
                  Start Examination
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "#f4f6fb",
    fontFamily: "Arial, sans-serif",
  },
  header: {
    background: "#1e293b",
    color: "white",
    padding: "18px 5%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logoutButton: {
    padding: "10px 20px",
    background: "#ef4444",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
  main: {
    padding: "35px 5%",
  },
  examGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "20px",
    marginTop: "25px",
  },
  examCard: {
    background: "white",
    padding: "25px",
    borderRadius: "12px",
    boxShadow: "0 3px 12px rgba(0,0,0,0.08)",
  },
  details: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    margin: "20px 0",
    color: "#475569",
  },
  startButton: {
    width: "100%",
    padding: "12px",
    background: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
  empty: {
    background: "white",
    padding: "30px",
    borderRadius: "10px",
    marginTop: "25px",
    textAlign: "center",
  },
  error: {
    color: "red",
    marginTop: "20px",
  },
};

export default StudentDashboard;