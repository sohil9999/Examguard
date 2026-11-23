import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

function AdminLogin() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        email: "",
        password: ""
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
            const response = await API.post("/auth/admin/login", formData);

            localStorage.setItem("access_token", response.data.access_token);
            localStorage.setItem("admin_name", response.data.name);
            localStorage.setItem("role", "admin");

            navigate("/admin-dashboard");

        } catch (error) {
            setMessage(
                error.response?.data?.message ||
                "Admin login failed. Please check your credentials."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">

                <h1>ExamGuard</h1>

                <p className="subtitle">Administrator Login</p>

                <form onSubmit={handleSubmit}>

                    <input
                        type="email"
                        name="email"
                        placeholder="Admin Email Address"
                        value={formData.email}
                        onChange={handleChange}
                        required
                    />

                    <input
                        type="password"
                        name="password"
                        placeholder="Admin Password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                    />

                    <button type="submit" disabled={loading}>
                        {loading ? "Logging in..." : "Admin Login"}
                    </button>

                </form>

                {message && (
                    <p className="message">{message}</p>
                )}

            </div>
        </div>
    );
}

export default AdminLogin;