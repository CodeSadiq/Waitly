import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import "./Auth.css";
import { AuthContext } from "../context/AuthContext";
import { validateEmail } from "../utils/validators";

export default function ForgotPassword() {
    const { forgotPassword } = useContext(AuthContext);
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        // Validation
        const validation = validateEmail(email);
        if (!validation.isValid) {
            setError(validation.error);
            return;
        }

        setLoading(true);

        try {
            const result = await forgotPassword(email);

            if (result.success) {
                setSuccess("Password reset link sent to your email. Please check your inbox.");
                setEmail("");

                // Show reset URL in console for development
                if (result.data?.resetUrl) {
                    console.log("Reset URL:", result.data.resetUrl);
                }
            } else {
                setError(result.error || "Failed to send reset email");
            }
        } catch (err) {
            setError(err.message || "Failed to send reset email");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <h2>Forgot Password</h2>
                <p style={{ fontSize: 14, color: "#666", marginBottom: 20 }}>
                    Enter your email address and we'll send you a link to reset your password.
                </p>

                <form onSubmit={handleSubmit}>
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                    />

                    {error && <p className="error-text">{error}</p>}
                    {success && <p style={{ color: "#10b981", fontSize: 14 }}>{success}</p>}

                    <button
                        className="auth-btn"
                        disabled={loading}
                        type="submit"
                    >
                        {loading ? "Sending..." : "Send Reset Link"}
                    </button>

                    <button
                        className="auth-btn outline"
                        onClick={() => navigate("/login")}
                        type="button"
                    >
                        Back to Login
                    </button>
                </form>
            </div>
        </div>
    );
}
