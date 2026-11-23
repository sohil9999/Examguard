import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

function ManageExams() {
    const navigate = useNavigate();

    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");
    const [publishingId, setPublishingId] = useState(null);

    useEffect(() => {
        fetchExams();
    }, []);

    // Fetch examinations
    const fetchExams = async () => {
        try {
            const token = localStorage.getItem("access_token");

            const response = await API.get("/exams/all", {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            setExams(response.data.exams || []);

        } catch (error) {
            setMessage(
                error.response?.data?.message ||
                "Unable to retrieve examinations."
            );
        } finally {
            setLoading(false);
        }
    };

    // Publish examination
    const handlePublish = async (exam) => {

        const confirmed = window.confirm(
            `Are you sure you want to publish "${exam.title}"?`
        );

        if (!confirmed) {
            return;
        }

        setPublishingId(exam.id);
        setMessage("");

        try {
            const token = localStorage.getItem("access_token");

            const response = await API.post(
                `/exams/${exam.id}/publish`,
                {},
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            setMessage(response.data.message);

            await fetchExams();

        } catch (error) {
            setMessage(
                error.response?.data?.message ||
                "Unable to publish examination."
            );
        } finally {
            setPublishingId(null);
        }
    };

    return (
        <div style={{
            minHeight: "100vh",
            background: "#f1f5f9",
            padding: "40px"
        }}>

            <h1>Manage Examinations</h1>

            <p style={{ color: "#64748b", marginTop: "10px" }}>
                View, manage and publish examinations in ExamGuard.
            </p>

            <button
                onClick={() => navigate("/admin-dashboard")}
                style={backButtonStyle}
            >
                Back to Dashboard
            </button>

            {message && (
                <div style={{
                    marginTop: "20px",
                    padding: "14px",
                    background: "#eff6ff",
                    color: "#1e40af",
                    borderRadius: "8px"
                }}>
                    {message}
                </div>
            )}

            <div style={{
                background: "white",
                padding: "25px",
                borderRadius: "12px",
                marginTop: "30px",
                overflowX: "auto"
            }}>

                <h2>All Examinations</h2>

                {loading ? (
                    <p style={{ marginTop: "20px" }}>
                        Loading examinations...
                    </p>
                ) : exams.length === 0 ? (
                    <p style={{
                        marginTop: "20px",
                        color: "#64748b"
                    }}>
                        No examinations found.
                    </p>
                ) : (

                    <table style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        marginTop: "20px",
                        textAlign: "left"
                    }}>

                        <thead>
                            <tr style={{ background: "#eff6ff" }}>
                                <th style={cellStyle}>Exam Title</th>
                                <th style={cellStyle}>Duration</th>
                                <th style={cellStyle}>Questions</th>
                                <th style={cellStyle}>Status</th>
                                <th style={cellStyle}>Created At</th>
                                <th style={cellStyle}>Actions</th>
                            </tr>
                        </thead>

                        <tbody>

                            {exams.map((exam) => (

                                <tr key={exam.id}>

                                    <td style={cellStyle}>
                                        {exam.title}
                                    </td>

                                    <td style={cellStyle}>
                                        {exam.duration} minutes
                                    </td>

                                    <td style={cellStyle}>
                                        {exam.total_questions}
                                    </td>

                                    <td style={cellStyle}>
                                        <span style={{
                                            padding: "6px 12px",
                                            borderRadius: "20px",
                                            fontSize: "13px",
                                            fontWeight: "bold",
                                            background:
                                                exam.status === "published"
                                                    ? "#dcfce7"
                                                    : "#fef3c7",
                                            color:
                                                exam.status === "published"
                                                    ? "#15803d"
                                                    : "#92400e"
                                        }}>
                                            {exam.status.toUpperCase()}
                                        </span>
                                    </td>

                                    <td style={cellStyle}>
                                        {exam.created_at
                                            ? new Date(
                                                exam.created_at
                                            ).toLocaleDateString()
                                            : "N/A"}
                                    </td>

                                    <td style={cellStyle}>

                                        {/* Add Questions */}
                                        {exam.status === "draft" && (
                                            <button
                                                onClick={() =>
                                                    navigate(
                                                        `/exams/${exam.id}/questions`
                                                    )
                                                }
                                                style={{
                                                    ...actionButtonStyle,
                                                    background: "#2563eb"
                                                }}
                                            >
                                                Add Questions
                                            </button>
                                        )}

                                        {/* View Questions */}
                                        <button
                                            onClick={() =>
                                                navigate(
                                                    `/exams/${exam.id}/view-questions`
                                                )
                                            }
                                            style={{
                                                ...actionButtonStyle,
                                                background: "#0f766e"
                                            }}
                                        >
                                            View Questions
                                        </button>

                                        {/* Publish Examination */}
                                        {exam.status === "draft" && (
                                            <button
                                                onClick={() =>
                                                    handlePublish(exam)
                                                }
                                                disabled={
                                                    publishingId === exam.id
                                                }
                                                style={{
                                                    ...actionButtonStyle,
                                                    background: "#16a34a",
                                                    opacity:
                                                        publishingId === exam.id
                                                            ? 0.6
                                                            : 1
                                                }}
                                            >
                                                {publishingId === exam.id
                                                    ? "Publishing..."
                                                    : "Publish Exam"}
                                            </button>
                                        )}

                                    </td>

                                </tr>

                            ))}

                        </tbody>

                    </table>

                )}

            </div>
        </div>
    );
}

const cellStyle = {
    padding: "14px",
    borderBottom: "1px solid #e2e8f0"
};

const backButtonStyle = {
    marginTop: "20px",
    padding: "10px 20px",
    background: "#1e3a8a",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer"
};

const actionButtonStyle = {
    display: "block",
    marginBottom: "8px",
    padding: "9px 15px",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    whiteSpace: "nowrap"
};

export default ManageExams;