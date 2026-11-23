import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../services/api";

function AddQuestions() {
    const navigate = useNavigate();
    const { examId } = useParams();

    const [questionType, setQuestionType] = useState("coding");

    const [formData, setFormData] = useState({
        question: "",
        options: ["", "", "", ""],
        correctAnswer: "0",
        starterCode: "",
        marks: 1
    });

    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleOptionChange = (index, value) => {
        const updatedOptions = [...formData.options];
        updatedOptions[index] = value;

        setFormData({
            ...formData,
            options: updatedOptions
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        setMessage("");
        setLoading(true);

        try {
            const token = localStorage.getItem("access_token");

            const payload = {
                question: formData.question.trim(),
                question_type: questionType,
                marks: Number(formData.marks)
            };

            if (questionType === "mcq") {
                payload.options = formData.options;
                payload.correct_answer = Number(formData.correctAnswer);
            }

            if (questionType === "coding") {
                payload.starter_code = formData.starterCode;
            }

            const response = await API.post(
                `/exams/${examId}/questions`,
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            setMessage(response.data.message);

            setFormData({
                question: "",
                options: ["", "", "", ""],
                correctAnswer: "0",
                starterCode: "",
                marks: 1
            });

        } catch (error) {
            setMessage(
                error.response?.data?.message ||
                "Unable to save question."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">

            <div className="auth-card" style={{ maxWidth: "750px" }}>

                <h1>Add Questions</h1>

                <p className="subtitle">
                    Add questions to your Python examination.
                </p>

                <form onSubmit={handleSubmit}>

                    {/* Question Type */}
                    <label>Question Type</label>

                    <select
                        value={questionType}
                        onChange={(e) => setQuestionType(e.target.value)}
                        style={inputStyle}
                    >
                        <option value="coding">
                            Python Coding Question
                        </option>

                        <option value="mcq">
                            Multiple Choice Question
                        </option>

                        <option value="descriptive">
                            Descriptive Question
                        </option>
                    </select>

                    {/* Question */}
                    <label>Enter Question</label>

                    <textarea
                        name="question"
                        placeholder="Enter your question here..."
                        value={formData.question}
                        onChange={handleChange}
                        rows="5"
                        required
                        style={inputStyle}
                    />

                    {/* MCQ Options */}
                    {questionType === "mcq" && (
                        <>
                            <h3>Answer Options</h3>

                            {formData.options.map((option, index) => (
                                <input
                                    key={index}
                                    type="text"
                                    placeholder={`Option ${index + 1}`}
                                    value={option}
                                    onChange={(e) =>
                                        handleOptionChange(
                                            index,
                                            e.target.value
                                        )
                                    }
                                    required
                                    style={inputStyle}
                                />
                            ))}

                            <label>Correct Answer</label>

                            <select
                                name="correctAnswer"
                                value={formData.correctAnswer}
                                onChange={handleChange}
                                style={inputStyle}
                            >
                                <option value="0">Option 1</option>
                                <option value="1">Option 2</option>
                                <option value="2">Option 3</option>
                                <option value="3">Option 4</option>
                            </select>
                        </>
                    )}

                    {/* Python Coding */}
                    {questionType === "coding" && (
                        <>
                            <h3>Python Starter Code</h3>

                            <p style={{
                                color: "#64748b",
                                marginBottom: "10px",
                                fontSize: "14px"
                            }}>
                                Optional: Provide starter code that students
                                can modify while answering.
                            </p>

                            <textarea
                                name="starterCode"
                                placeholder={"# Write your Python starter code here\n\ndef solution():\n    pass"}
                                value={formData.starterCode}
                                onChange={handleChange}
                                rows="10"
                                spellCheck="false"
                                style={{
                                    ...inputStyle,
                                    fontFamily: "monospace",
                                    background: "#0f172a",
                                    color: "#e2e8f0",
                                    lineHeight: "1.6"
                                }}
                            />
                        </>
                    )}

                    {/* Marks */}
                    <label>Marks</label>

                    <input
                        type="number"
                        name="marks"
                        min="1"
                        value={formData.marks}
                        onChange={handleChange}
                        required
                        style={inputStyle}
                    />

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: "100%",
                            padding: "14px",
                            background: "#2563eb",
                            color: "white",
                            border: "none",
                            borderRadius: "8px",
                            fontSize: "16px",
                            fontWeight: "bold",
                            cursor: "pointer"
                        }}
                    >
                        {loading ? "Saving Question..." : "Add Question"}
                    </button>

                </form>

                {message && (
                    <p className="message" style={{ marginTop: "15px" }}>
                        {message}
                    </p>
                )}

                <button
                    type="button"
                    onClick={() => navigate("/manage-exams")}
                    style={{
                        marginTop: "15px",
                        background: "#64748b",
                        width: "100%",
                        padding: "12px",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer"
                    }}
                >
                    Back to Manage Exams
                </button>

            </div>

        </div>
    );
}

const inputStyle = {
    width: "100%",
    padding: "14px",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    fontSize: "15px",
    marginBottom: "16px",
    boxSizing: "border-box"
};

export default AddQuestions;