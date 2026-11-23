import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../services/api";

function Register() {

    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: "",
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

            const response = await API.post(
                "/auth/register",
                formData
            );

            setMessage(response.data.message);

            setTimeout(() => {
                navigate("/login");
            }, 1500);

        } catch (error) {

            setMessage(
                error.response?.data?.message ||
                "Registration failed. Please try again."
            );

        } finally {
            setLoading(false);
        }
    };

    return (

        <div className="auth-container">

            <div className="auth-card">

                <h1>ExamGuard</h1>

                <p className="subtitle">
                    Create your student account
                </p>

                <form onSubmit={handleSubmit}>

                    <input
                        type="text"
                        name="name"
                        placeholder="Full Name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                    />

                    <input
                        type="email"
                        name="email"
                        placeholder="Email Address"
                        value={formData.email}
                        onChange={handleChange}
                        required
                    />

                    <input
                        type="password"
                        name="password"
                        placeholder="Password (minimum 8 characters)"
                        value={formData.password}
                        onChange={handleChange}
                        minLength="8"
                        required
                    />

                    <button type="submit" disabled={loading}>
                        {loading ? "Creating Account..." : "Register"}
                    </button>

                </form>

                {message && (
                    <p className="message">{message}</p>
                )}

                <p className="login-link">
                    Already have an account?
                    {" "}
                    <Link to="/login">Login</Link>
                </p>

            </div>

        </div>

    );
}

export default Register;