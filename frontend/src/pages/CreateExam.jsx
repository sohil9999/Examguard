import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

function CreateExam() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        title: "",
        description: "",
        duration: 60
    });

    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage("");
        setLoading(true);

        try {
            const token = localStorage.getItem("access_token");

            const response = await API.post(
                "/exams/create",
                {
                    ...formData,
                    duration: Number(formData.duration)
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            setMessage(response.data.message);

            setFormData({
                title: "",
                description: "",
                duration: 60
            });

        } catch (error) {
            setMessage(
                error.response?.data?.message ||
                "Unable to create examination."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">

                <h1>Create Exam</h1>

                <p className="subtitle">
                    Configure a new examination
                </p>

                <form onSubmit={handleSubmit}>

                    <input
                        type="text"
                        name="title"
                        placeholder="Examination Title"
                        value={formData.title}
                        onChange={handleChange}
                        required
                    />

                    <textarea
                        name="description"
                        placeholder="Exam Description"
                        value={formData.description}
                        onChange={handleChange}
                        rows="4"
                        style={{
                            padding: "14px",
                            border: "1px solid #cbd5e1",
                            borderRadius: "8px",
                            fontSize: "15px",
                            resize: "vertical"
                        }}
                    />

                    <label>
                        Exam Duration (minutes)
                    </label>

                    <input
                        type="number"
                        name="duration"
                        min="1"
                        value={formData.duration}
                        onChange={handleChange}
                        required
                    />

                    <button type="submit" disabled={loading}>
                        {loading ? "Creating Exam..." : "Create Examination"}
                    </button>

                </form>

                {message && (
                    <p className="message">{message}</p>
                )}

                <p className="login-link">
                    <button
                        type="button"
                        onClick={() => navigate("/admin-dashboard")}
                        style={{
                            background: "none",
                            border: "none",
                            color: "#2563eb",
                            cursor: "pointer"
                        }}
                    >
                        Back to Admin Dashboard
                    </button>
                </p>

            </div>
        </div>
    );
}

export default CreateExam;