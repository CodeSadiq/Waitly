import { useState, useContext } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./Auth.css";
import { AuthContext } from "../context/AuthContext";
import { validatePassword, getPasswordStrength } from "../utils/validators";

export default function ResetPassword() {
    const { resetPassword } = useContext(AuthContext);
    const navigate = useNavigate();
    const { token } = useParams();

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        // Validation
        const validation = validatePassword(password);
        if (!validation.isValid) {
            setError(validation.errors[0]);
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setLoading(true);

        try {
            const result = await resetPassword(token, password, confirmPassword);

            if (result.success) {
                setSuccess("Password reset successful! Redirecting to login...");
                setTimeout(() => {
                    navigate("/login");
                }, 2000);
            } else {
                setError(result.error || "Failed to reset password");
            }
        } catch (err) {
            setError(err.message || "Failed to reset password");
        } finally {
            setLoading(false);
        }
    };

    const passwordStrength = getPasswordStrength(password);

    return (
        <div className="auth-page">
            <div className="auth-card">
                <h2>Reset Password</h2>
                <p style={{ fontSize: 14, color: "#666", marginBottom: 20 }}>
                    Enter your new password below.
                </p>

                <form onSubmit={handleSubmit}>
                    <div style={{ position: "relative" }}>
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="New Password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />

                        <span
                            onClick={() => setShowPassword(!showPassword)}
                            style={{
                                position: "absolute",
                                right: 10,
                                top: "50%",
                                transform: "translateY(-50%)",
                                cursor: "pointer"
                            }}
                        >
                            👁
                        </span>
                    </div>

                    {/* PASSWORD STRENGTH */}
                    {password && passwordStrength && (
                        <div style={{ marginTop: 5, marginBottom: 10 }}>
                            <div style={{
                                height: 4,
                                backgroundColor: "#e5e7eb",
                                borderRadius: 2,
                                overflow: "hidden"
                            }}>
                                <div style={{
                                    height: "100%",
                                    width: `${(passwordStrength.score / 6) * 100}%`,
                                    backgroundColor: passwordStrength.color,
                                    transition: "all 0.3s"
                                }} />
                            </div>
                            <p style={{ fontSize: 12, color: passwordStrength.color, marginTop: 5 }}>
                                Password strength: {passwordStrength.text}
                            </p>
                        </div>
                    )}

                    <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Confirm New Password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                    />

                    {error && <p className="error-text">{error}</p>}
                    {success && <p style={{ color: "#10b981", fontSize: 14 }}>{success}</p>}

                    <button
                        className="auth-btn"
                        disabled={loading || success}
                        type="submit"
                    >
                        {loading ? "Resetting..." : "Reset Password"}
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
