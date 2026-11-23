import {
  useLocation,
  useParams,
  useNavigate,
} from "react-router-dom";

import {
  useEffect,
  useState,
  useRef,
} from "react";

import API from "../services/api";

function ExamAttempt() {
  const { examId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const selectedQuestions = location.state?.selectedQuestions || [];
  const exam = location.state?.exam;

  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});

  const [attemptId, setAttemptId] = useState(null);
  const [endTime, setEndTime] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("Not saved");

  const [timeLeft, setTimeLeft] = useState(0);

  // Anti-cheating monitoring
  const [violationCount, setViolationCount] = useState(0);
  const [warningMessage, setWarningMessage] = useState("");
  const [fullscreenActive, setFullscreenActive] = useState(false);

  const fullscreenActivatedRef = useRef(false);
  const lastViolationTimeRef = useRef(0);

  const [pyodide, setPyodide] = useState(null);
  const [pythonLoading, setPythonLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState("Output will appear here.");

  const saveTimers = useRef({});
  const answersRef = useRef({});
  const attemptIdRef = useRef(null);
  const submittingRef = useRef(false);

  const token = localStorage.getItem("access_token");

  // INITIALIZE EXAMINATION
  useEffect(() => {
    if (selectedQuestions.length !== 10) {
      navigate("/student-dashboard");
      return;
    }

    initializeExam();

    return () => {
      Object.values(saveTimers.current).forEach(clearTimeout);
    };
  }, []);

  const initializeExam = async () => {
    try {
      const startResponse = await API.post(
        `/exams/student/${examId}/start`,
        {
          selected_questions: selectedQuestions,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const id = startResponse.data.attempt_id;

      setAttemptId(id);
      attemptIdRef.current = id;

      // Retrieve saved answers and attempt details
      const attemptResponse = await API.get(
        `/exams/student/attempt/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const attempt = attemptResponse.data;
      setViolationCount(attempt.violation_count || 0);

      if (attempt.status !== "in_progress") {
        alert("This examination has already been submitted.");
        navigate("/student-dashboard");
        return;
      }

      const restoredAnswers = attempt.answers || {};

      setAnswers(restoredAnswers);
      answersRef.current = restoredAnswers;

      setEndTime(new Date(attempt.end_at).getTime());

      // Load selected questions
      const questionResponse = await API.get(
        `/exams/student/${examId}/questions`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const selected = questionResponse.data.questions.filter((q) =>
        selectedQuestions.includes(q.id)
      );

      setQuestions(selected);

    } catch (error) {
      console.error(error);

      alert(
        error.response?.data?.message ||
        "Unable to initialize examination."
      );
    } finally {
      setLoading(false);
    }
  };

  // LOAD PYTHON RUNTIME
  useEffect(() => {
    const loadPython = async () => {
      try {
        if (!window.loadPyodide) {
          const script = document.createElement("script");

          script.src =
            "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js";

          script.onload = async () => {
            try {
              const runtime = await window.loadPyodide();
              setPyodide(runtime);
              setPythonLoading(false);
            } catch {
              setPythonLoading(false);
              setOutput("Unable to initialize Python.");
            }
          };

          script.onerror = () => {
            setPythonLoading(false);
            setOutput("Unable to download Python runtime.");
          };

          document.body.appendChild(script);
        } else {
          const runtime = await window.loadPyodide();
          setPyodide(runtime);
          setPythonLoading(false);
        }
      } catch {
        setPythonLoading(false);
      }
    };

    loadPython();
  }, []);

  // SAVE ANSWER TO MONGODB
  const saveAnswer = async (questionId, code) => {
    if (!attemptIdRef.current) return;

    try {
      setSaving(true);
      setSaveStatus("Saving...");

      await API.post(
        `/exams/student/attempt/${attemptIdRef.current}/answer`,
        {
          question_id: questionId,
          answer: code,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setSaveStatus("Saved successfully");
    } catch (error) {
      console.error("Save error:", error);
      setSaveStatus(
        error.response?.data?.message || "Save failed"
      );
    } finally {
      setSaving(false);
    }
  };

  // UPDATE ANSWER AND AUTOSAVE AFTER 800 MS
  const updateAnswer = (questionId, code) => {
    const updatedAnswers = {
      ...answersRef.current,
      [questionId]: code,
    };

    answersRef.current = updatedAnswers;
    setAnswers(updatedAnswers);

    setSaveStatus("Unsaved changes");

    if (saveTimers.current[questionId]) {
      clearTimeout(saveTimers.current[questionId]);
    }

    saveTimers.current[questionId] = setTimeout(() => {
      saveAnswer(questionId, code);
    }, 800);
  };

  // SAVE ALL ANSWERS BEFORE SUBMISSION
  const submitExam = async (automatic = false) => {
    if (!attemptIdRef.current || submittingRef.current) return;

    const confirmed = automatic
      ? true
      : window.confirm(
          "Are you sure you want to submit your examination?"
        );

    if (!confirmed) return;

    submittingRef.current = true;

    try {
      Object.values(saveTimers.current).forEach(clearTimeout);

      // Save every selected question's answer
      for (const question of questions) {
        const code = answersRef.current[question.id] || "";

        await API.post(
          `/exams/student/attempt/${attemptIdRef.current}/answer`,
          {
            question_id: question.id,
            answer: code,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      }

      await API.post(
        `/exams/student/attempt/${attemptIdRef.current}/submit`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      alert("Examination submitted successfully!");
      navigate("/student-dashboard");
    } catch (error) {
      console.error(error);

      alert(
        error.response?.data?.message ||
        "Unable to submit examination."
      );

      submittingRef.current = false;
    }
  };

  // RECORD ANTI-CHEATING VIOLATIONS
  const recordViolation = async (violationType) => {
    if (!attemptIdRef.current || submittingRef.current) {
      return;
    }

    // Prevent duplicate events caused by one focus change.
    const now = Date.now();

    if (now - lastViolationTimeRef.current < 1500) {
      return;
    }

    lastViolationTimeRef.current = now;

    try {
      const response = await API.post(
        `/exams/student/attempt/${attemptIdRef.current}/violation`,
        {
          violation_type: violationType,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const count = response.data.violation_count;
      setViolationCount(count);

      if (response.data.auto_submit_required) {
        setWarningMessage(
          "Maximum violations reached. Your examination is being submitted."
        );

        await submitExam(true);
      } else {
        setWarningMessage(
          `Warning ${count}/4: Suspicious activity detected. Further violations may automatically submit your exam.`
        );
      }
    } catch (error) {
      console.error("Failed to record violation:", error);
    }
  };

  // MONITOR TAB SWITCHING, WINDOW FOCUS AND FULLSCREEN EXIT
  useEffect(() => {
    if (!attemptId || loading) {
      return;
    }

    const handleVisibilityChange = () => {
  console.log("Visibility changed:", document.visibilityState);

  if (document.hidden) {
    console.log("TAB SWITCH DETECTED");
    recordViolation("tab_switch");
  }
};

    const handleWindowBlur = () => {
  console.log("WINDOW BLUR DETECTED");
  recordViolation("window_blur");
};

    const handleFullscreenChange = () => {
      const isFullscreen = Boolean(document.fullscreenElement);
      setFullscreenActive(isFullscreen);

      if (fullscreenActivatedRef.current && !isFullscreen) {
        recordViolation("fullscreen_exit");
      }
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    window.addEventListener("blur", handleWindowBlur);

    document.addEventListener(
      "fullscreenchange",
      handleFullscreenChange
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );

      window.removeEventListener("blur", handleWindowBlur);

      document.removeEventListener(
        "fullscreenchange",
        handleFullscreenChange
      );
    };
  }, [attemptId, loading]);

  // SERVER-DEADLINE-BASED TIMER
  useEffect(() => {
    if (!endTime || loading) return;

    const updateTimer = () => {
      const remaining = Math.max(
        0,
        Math.floor((endTime - Date.now()) / 1000)
      );

      setTimeLeft(remaining);

      if (remaining === 0 && !submittingRef.current) {
        submitExam(true);
      }
    };

    updateTimer();

    const timer = setInterval(updateTimer, 1000);

    return () => clearInterval(timer);
  }, [endTime, loading]);

  const formatTime = () => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      seconds
    ).padStart(2, "0")}`;
  };

  // RUN PYTHON CODE
  const runCode = async () => {
    if (!pyodide) {
      setOutput("Python is still loading.");
      return;
    }

    const currentQuestion = questions[currentIndex];
    const code = answersRef.current[currentQuestion.id] || "";

    if (!code.trim()) {
      setOutput("Please write some Python code first.");
      return;
    }

    setRunning(true);
    setOutput("Running your Python code...");

    try {
      pyodide.globals.set("user_code", code);

      const result = await pyodide.runPythonAsync(`
import sys
import io
import traceback

output_buffer = io.StringIO()
error_buffer = io.StringIO()

try:
    sys.stdout = output_buffer
    sys.stderr = error_buffer

    exec(compile(user_code, "<student_code>", "exec"))

    result_text = output_buffer.getvalue()

    if error_buffer.getvalue():
        result_text += error_buffer.getvalue()

    if not result_text.strip():
        result_text = "Code executed successfully. No output produced."

except Exception:
    result_text = traceback.format_exc()

finally:
    sys.stdout = sys.__stdout__
    sys.stderr = sys.__stderr__

result_text
      `);

      setOutput(result);
    } catch (error) {
      setOutput("Execution error: " + error.message);
    } finally {
      setRunning(false);
    }
  };

  if (loading) {
    return <h2 style={{ padding: "30px" }}>
      Initializing examination...
    </h2>;
  }

  if (questions.length === 0) {
    return <h2 style={{ padding: "30px" }}>
      No questions found.
    </h2>;
  }

  const currentQuestion = questions[currentIndex];

  return (
    <div style={styles.container}>
        {/* Anti-cheating warning */}
{warningMessage && (
  <div
    style={{
      background: "#fff3cd",
      color: "#856404",
      padding: "12px",
      margin: "10px 0",
      borderRadius: "6px",
      border: "1px solid #ffeeba",
      fontWeight: "bold"
    }}
  >
    {warningMessage}
  </div>
)}

{/* Violation counter */}
<div style={{ margin: "10px 0", fontWeight: "bold" }}>
  Anti-cheating warnings: {violationCount}/4
</div>

{/* Fullscreen control */}
<button
  onClick={async () => {
    try {
      await document.documentElement.requestFullscreen();
      fullscreenActivatedRef.current = true;
      setFullscreenActive(true);
   } catch (error) {
  console.error(
    "Violation API failed:",
    error.response?.data || error.message
  );
}
  }}
  disabled={fullscreenActive}
  style={{
    padding: "10px 16px",
    marginBottom: "12px",
    background: fullscreenActive ? "#198754" : "#0d6efd",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: fullscreenActive ? "default" : "pointer"
  }}
>
  {fullscreenActive ? "Fullscreen Active" : "Enter Fullscreen"}
</button>
      <header style={styles.header}>
        <h2>ExamGuard</h2>

        <div style={styles.headerRight}>
          <span style={styles.saveStatus}>
            {saving ? "Saving..." : saveStatus}
          </span>

          <div style={styles.timer}>
            Time Remaining: {formatTime()}
          </div>
        </div>
      </header>

      <main style={styles.main}>

        <div style={styles.examInfo}>
          <h1>{exam?.title || "Python Examination"}</h1>
          <p>Question {currentIndex + 1} of 10</p>
        </div>

        <section style={styles.questionCard}>
          <h2>Question {currentQuestion.number}</h2>

          <p style={styles.questionText}>
            {currentQuestion.question}
          </p>

          <p style={styles.marks}>
            Maximum Marks: {currentQuestion.marks}
          </p>
        </section>

        <section style={styles.editorCard}>

          <div style={styles.editorHeader}>
            <h3>Python Code Editor</h3>

            <span style={styles.pythonStatus}>
              {pythonLoading
                ? "Loading Python..."
                : pyodide
                ? "Python Ready"
                : "Python Unavailable"}
            </span>
          </div>

          <textarea
            value={answers[currentQuestion.id] || ""}
            onChange={(event) =>
              updateAnswer(
                currentQuestion.id,
                event.target.value
              )
            }
            placeholder="Write your Python code here..."
            style={styles.editor}
            spellCheck="false"
          />

          <button
            onClick={runCode}
            disabled={running || pythonLoading || !pyodide}
            style={styles.runButton}
          >
            {running ? "Running..." : "▶ Run Code"}
          </button>

          <div style={styles.outputContainer}>
            <h3>Output Console</h3>

            <pre style={styles.output}>
              {output}
            </pre>
          </div>

        </section>

        <div style={styles.navigation}>

          <button
            onClick={() => setCurrentIndex((i) => i - 1)}
            disabled={currentIndex === 0}
            style={styles.navButton}
          >
            Previous
          </button>

          <span>
            {currentIndex + 1} / {questions.length}
          </span>

          <button
            onClick={() => setCurrentIndex((i) => i + 1)}
            disabled={currentIndex === questions.length - 1}
            style={styles.navButton}
          >
            Next Question
          </button>

        </div>

        <button
          onClick={() => submitExam(false)}
          style={styles.submitButton}
        >
          Submit Examination
        </button>

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
    padding: "18px 5%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "15px",
  },

  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
  },

  saveStatus: {
    color: "#86efac",
    fontSize: "13px",
  },

  timer: {
    background: "#dc2626",
    padding: "12px 20px",
    borderRadius: "8px",
    fontWeight: "bold",
  },

  main: {
    padding: "30px 5%",
    maxWidth: "1200px",
    margin: "auto",
  },

  examInfo: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  questionCard: {
    background: "white",
    padding: "25px",
    borderRadius: "10px",
    marginTop: "20px",
  },

  questionText: {
    fontSize: "18px",
    marginTop: "20px",
  },

  marks: {
    color: "#2563eb",
    fontWeight: "bold",
  },

  editorCard: {
    background: "white",
    padding: "25px",
    borderRadius: "10px",
    marginTop: "20px",
  },

  editorHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  pythonStatus: {
    color: "#16a34a",
    fontWeight: "bold",
  },

  editor: {
    width: "100%",
    minHeight: "350px",
    boxSizing: "border-box",
    background: "#0f172a",
    color: "#e2e8f0",
    padding: "20px",
    borderRadius: "8px",
    fontSize: "15px",
    fontFamily: "Consolas, monospace",
    resize: "vertical",
  },

  runButton: {
    background: "#16a34a",
    color: "white",
    padding: "12px 25px",
    border: "none",
    borderRadius: "7px",
    cursor: "pointer",
    marginTop: "15px",
    fontWeight: "bold",
  },

  outputContainer: {
    marginTop: "25px",
  },

  output: {
    background: "#020617",
    color: "#4ade80",
    padding: "20px",
    minHeight: "120px",
    borderRadius: "8px",
    whiteSpace: "pre-wrap",
    overflowX: "auto",
    fontFamily: "Consolas, monospace",
  },

  navigation: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "25px",
  },

  navButton: {
    background: "#2563eb",
    color: "white",
    padding: "12px 25px",
    border: "none",
    borderRadius: "7px",
    cursor: "pointer",
  },

  submitButton: {
    width: "100%",
    marginTop: "30px",
    padding: "16px",
    background: "#dc2626",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
  },
};

export default ExamAttempt;