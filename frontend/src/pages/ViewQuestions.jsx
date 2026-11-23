import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../services/api";

function ViewQuestions() {
    const navigate = useNavigate();
    const { examId } = useParams();

    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");

    useEffect(() => {
        fetchQuestions();
    }, [examId]);

    const fetchQuestions = async () => {
        try {
            const token = localStorage.getItem("access_token");

            const response = await API.get(
                `/exams/${examId}/questions`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            setQuestions(response.data.questions);

        } catch (error) {
            setMessage(
                error.response?.data?.message ||
                "Unable to retrieve questions."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: "100vh",
            background: "#f1f5f9",
            padding: "40px"
        }}>

            <h1>Examination Questions</h1>

            <p style={{ color: "#64748b", marginTop: "10px" }}>
                Review all questions added to this examination.
            </p>

            <button
                onClick={() => navigate("/manage-exams")}
                style={buttonStyle}
            >
                Back to Manage Exams
            </button>

            <div style={{
                background: "white",
                padding: "25px",
                borderRadius: "12px",
                marginTop: "30px"
            }}>

                <h2>Total Questions: {questions.length}</h2>

                {message && (
                    <p style={{
                        color: "#2563eb",
                        marginTop: "15px"
                    }}>
                        {message}
                    </p>
                )}

                {loading ? (
                    <p>Loading questions...</p>
                ) : questions.length === 0 ? (
                    <p>No questions have been added yet.</p>
                ) : (

                    questions.map((question, index) => (

                        <div
                            key={question.id}
                            style={{
                                padding: "20px",
                                border: "1px solid #e2e8f0",
                                borderRadius: "10px",
                                marginTop: "20px"
                            }}
                        >

                            <h3>
                                Q{index + 1}. {question.question}
                            </h3>

                            <p style={{ marginTop: "10px" }}>
                                Type: {question.question_type.toUpperCase()}
                            </p>

                            <p>
                                Marks: {question.marks}
                            </p>

                            {question.question_type === "mcq" && (

                                <div style={{ marginTop: "15px" }}>

                                    {question.options.map((option, i) => (

                                        <p
                                            key={i}
                                            style={{
                                                padding: "8px",
                                                color:
                                                    i === question.correct_answer
                                                        ? "#15803d"
                                                        : "#475569",
                                                fontWeight:
                                                    i === question.correct_answer
                                                        ? "bold"
                                                        : "normal"
                                            }}
                                        >
                                            Option {i + 1}: {option}

                                            {i === question.correct_answer &&
                                                " ✓ Correct Answer"}

                                        </p>

                                    ))}

                                </div>
                            )}

                        </div>

                    ))

                )}

            </div>
        </div>
    );
}

const buttonStyle = {
    marginTop: "20px",
    padding: "10px 20px",
    background: "#1e3a8a",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer"
};

export default ViewQuestions;