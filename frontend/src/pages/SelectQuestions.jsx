import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../services/api";

function SelectQuestions() {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchQuestions();
  }, [examId]);

  const fetchQuestions = async () => {
    try {
      const token = localStorage.getItem("access_token");

      const response = await API.get(
        `/exams/student/${examId}/questions`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setExam(response.data.exam);
      setQuestions(response.data.questions || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load examination questions."
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleQuestion = (questionId) => {
    setSelectedQuestions((previous) => {
      if (previous.includes(questionId)) {
        return previous.filter((id) => id !== questionId);
      }

      if (previous.length >= 10) {
        alert("You can select only 10 questions.");
        return previous;
      }

      return [...previous, questionId];
    });
  };

  const continueToExam = () => {
    if (selectedQuestions.length !== 10) {
      alert("Please select exactly 10 questions.");
      return;
    }

    navigate(`/student/exam/${examId}/attempt`, {
      state: {
        selectedQuestions,
        exam,
      },
    });
  };

  if (loading) {
    return <h2 style={{ padding: "30px" }}>Loading questions...</h2>;
  }

  if (error) {
    return (
      <div style={{ padding: "30px", color: "red" }}>
        {error}
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>ExamGuard</h2>
        <span>Student Examination</span>
      </div>

      <main style={styles.main}>
        <h1>{exam?.title}</h1>

        <p style={styles.description}>
          Select any 10 questions out of the 15 available questions.
        </p>

        <div style={styles.infoCard}>
          <div>
            <strong>Total Questions</strong>
            <h2>{questions.length}</h2>
          </div>

          <div>
            <strong>Questions to Select</strong>
            <h2>10</h2>
          </div>

          <div>
            <strong>Selected</strong>
            <h2>
              {selectedQuestions.length}/10
            </h2>
          </div>

          <div>
            <strong>Duration</strong>
            <h2>{exam?.duration} min</h2>
          </div>
        </div>

        <div style={styles.progressContainer}>
          <div
            style={{
              ...styles.progressBar,
              width: `${selectedQuestions.length * 10}%`,
            }}
          />
        </div>

        <h2 style={{ marginTop: "30px" }}>
          Available Questions
        </h2>

        <div style={styles.questionGrid}>
          {questions.map((question) => {
            const isSelected = selectedQuestions.includes(
              question.id
            );

            return (
              <div
                key={question.id}
                onClick={() => toggleQuestion(question.id)}
                style={{
                  ...styles.questionCard,
                  border: isSelected
                    ? "2px solid #2563eb"
                    : "1px solid #e2e8f0",
                  background: isSelected ? "#eff6ff" : "white",
                }}
              >
                <div style={styles.questionHeader}>
                  <strong>Question {question.number}</strong>

                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleQuestion(question.id)}
                    onClick={(event) => event.stopPropagation()}
                  />
                </div>

                <div style={styles.questionContent}>
  <p>{question.question}</p>

  {question.starter_code && (
    <pre style={styles.codeBlock}>
      {question.starter_code}
    </pre>
  )}

  <span style={styles.marks}>
    Maximum Marks: {question.marks}
  </span>
</div>
              </div>
            );
          })}
        </div>

        <div style={styles.footer}>
          <p>
            Selected: <strong>{selectedQuestions.length}/10</strong>
          </p>

          <button
            onClick={continueToExam}
            disabled={selectedQuestions.length !== 10}
            style={{
              ...styles.continueButton,
              opacity:
                selectedQuestions.length === 10 ? 1 : 0.5,
              cursor:
                selectedQuestions.length === 10
                  ? "pointer"
                  : "not-allowed",
            }}
          >
            Continue to Examination
          </button>
        </div>
      </main>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "#f1f5f9",
    fontFamily: "Arial, sans-serif",
  },

  header: {
    background: "#1e293b",
    color: "white",
    padding: "20px 5%",
    display: "flex",
    justifyContent: "space-between",
  },

  main: {
    padding: "35px 5%",
  },

  description: {
    color: "#64748b",
  },

  infoCard: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "15px",
    background: "white",
    padding: "20px",
    borderRadius: "10px",
    marginTop: "25px",
  },

  progressContainer: {
    height: "10px",
    background: "#cbd5e1",
    borderRadius: "10px",
    marginTop: "25px",
    overflow: "hidden",
  },

  progressBar: {
    height: "100%",
    background: "#2563eb",
    transition: "width 0.3s",
  },

  questionGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "18px",
    marginTop: "20px",
  },

  questionCard: {
    padding: "20px",
    borderRadius: "10px",
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  },

  questionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
    questionContent: {
    marginTop: "15px",
    lineHeight: "1.7",
    color: "#334155",
    whiteSpace: "pre-wrap",
  },

  codeBlock: {
    background: "#0f172a",
    color: "#e2e8f0",
    padding: "15px",
    borderRadius: "8px",
    overflowX: "auto",
    fontSize: "14px",
    marginTop: "12px",
  },

  marks: {
    color: "#2563eb",
    fontWeight: "bold",
    fontSize: "13px",
  },

  footer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "white",
    padding: "20px",
    borderRadius: "10px",
    marginTop: "30px",
    flexWrap: "wrap",
    gap: "15px",
  },

  continueButton: {
    padding: "13px 25px",
    background: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "7px",
    fontWeight: "bold",
  },
};

export default SelectQuestions;