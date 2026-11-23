import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

function ManageStudents() {
    const navigate = useNavigate();

    const [students, setStudents] = useState([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");

    // Fetch all registered students
    const fetchStudents = async () => {
        try {
            const token = localStorage.getItem("access_token");

            const response = await API.get(
                "/auth/admin/students",
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            setStudents(response.data.students || []);

        } catch (error) {
            setMessage(
                error.response?.data?.message ||
                "Unable to retrieve students."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStudents();
    }, []);

    // Delete student
    const handleDelete = async (studentId, studentName) => {
        const confirmed = window.confirm(
            `Are you sure you want to delete ${studentName}'s account?`
        );

        if (!confirmed) {
            return;
        }

        try {
            const token = localStorage.getItem("access_token");

            const response = await API.delete(
                `/auth/admin/students/${studentId}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            setStudents((previousStudents) =>
                previousStudents.filter(
                    (student) => student.id !== studentId
                )
            );

            setMessage(response.data.message);

        } catch (error) {
            setMessage(
                error.response?.data?.message ||
                "Unable to delete student."
            );
        }
    };

    // Search students
    const filteredStudents = students.filter((student) =>
        student.name.toLowerCase().includes(search.toLowerCase()) ||
        student.email.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div style={{
            minHeight: "100vh",
            background: "#f1f5f9",
            padding: "40px"
        }}>

            {/* Header */}
            <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "15px"
            }}>
                <div>
                    <h1>Manage Students</h1>

                    <p style={{ color: "#64748b", marginTop: "8px" }}>
                        View and manage registered student accounts.
                    </p>
                </div>

                <button
                    onClick={() => navigate("/admin-dashboard")}
                    style={backButtonStyle}
                >
                    Back to Dashboard
                </button>
            </div>

            {/* Student Statistics */}
            <div style={{
                background: "white",
                padding: "25px",
                borderRadius: "12px",
                marginTop: "30px",
                maxWidth: "300px"
            }}>
                <h3>Total Registered Students</h3>

                <h1 style={{
                    color: "#2563eb",
                    marginTop: "10px"
                }}>
                    {loading ? "..." : students.length}
                </h1>
            </div>

            {/* Student Management */}
            <div style={{
                background: "white",
                padding: "25px",
                borderRadius: "12px",
                marginTop: "30px"
            }}>

                <h2>Student List</h2>

                {/* Search */}
                <input
                    type="text"
                    placeholder="Search by student name or email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{
                        width: "100%",
                        maxWidth: "450px",
                        padding: "12px",
                        marginTop: "20px",
                        marginBottom: "20px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "8px",
                        fontSize: "14px"
                    }}
                />

                {message && (
                    <p style={{
                        color: "#2563eb",
                        marginBottom: "15px"
                    }}>
                        {message}
                    </p>
                )}

                {loading ? (
                    <p>Loading students...</p>
                ) : filteredStudents.length === 0 ? (
                    <p>No students found.</p>
                ) : (

                    <div style={{ overflowX: "auto" }}>

                        <table style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            textAlign: "left"
                        }}>

                            <thead>
                                <tr style={{
                                    background: "#eff6ff"
                                }}>
                                    <th style={tableHeaderStyle}>#</th>
                                    <th style={tableHeaderStyle}>Student Name</th>
                                    <th style={tableHeaderStyle}>Email Address</th>
                                    <th style={tableHeaderStyle}>Action</th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredStudents.map((student, index) => (

                                    <tr key={student.id}>

                                        <td style={tableCellStyle}>
                                            {index + 1}
                                        </td>

                                        <td style={tableCellStyle}>
                                            {student.name}
                                        </td>

                                        <td style={tableCellStyle}>
                                            {student.email}
                                        </td>

                                        <td style={tableCellStyle}>
                                            <button
                                                onClick={() =>
                                                    handleDelete(
                                                        student.id,
                                                        student.name
                                                    )
                                                }
                                                style={deleteButtonStyle}
                                            >
                                                Delete
                                            </button>
                                        </td>

                                    </tr>

                                ))}
                            </tbody>

                        </table>

                    </div>
                )}

            </div>
        </div>
    );
}

const backButtonStyle = {
    padding: "11px 20px",
    background: "#1e3a8a",
    color: "white",
    border: "none",
    borderRadius: "7px",
    cursor: "pointer"
};

const deleteButtonStyle = {
    padding: "8px 16px",
    background: "#dc2626",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer"
};

const tableHeaderStyle = {
    padding: "15px",
    borderBottom: "1px solid #e2e8f0"
};

const tableCellStyle = {
    padding: "15px",
    borderBottom: "1px solid #e2e8f0"
};

export default ManageStudents;