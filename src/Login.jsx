import { useState } from "react";
import "./Login.css";

// Deployed Render backend URL
const API_URL =
  "https://smart-civic-issue-system-backend.onrender.com/api";

function Login({ onLogin, onShowRegister, portal = "citizen" }) {
  const isGovernment = portal === "government";

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: identifier.trim(),
          password,
        }),
      });

      const responseText = await response.text();
      let data = {};

      if (responseText) {
        try {
          data = JSON.parse(responseText);
        } catch {
          data = { message: responseText };
        }
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.error ||
            `Login failed with status ${response.status}`
        );
      }

      if (onLogin) {
        onLogin(data);
      } else {
        setMessage("Login successful.");
      }
    } catch (error) {
      console.error("Login error:", error);

      if (error instanceof TypeError) {
        setMessage(
          "Cannot connect to the server. Please try again in a moment."
        );
      } else {
        setMessage(
          error.message || "Login failed. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit}>
        <h2>
          {isGovernment
            ? "Government Officer Login"
            : "Welcome Back"}
        </h2>

        <p>
          {isGovernment
            ? "Sign in with your authorized government credentials."
            : "Log in to your Smart Civic account."}
        </p>

        {message && (
          <div className="login-message" role="alert">
            {message}
          </div>
        )}

        <label htmlFor="login-identifier">
          {isGovernment ? "Government ID" : "Email"}
        </label>

        <input
          id="login-identifier"
          type={isGovernment ? "text" : "email"}
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder={
            isGovernment
              ? "Enter your Government ID"
              : "Enter your email"
          }
          autoComplete="username"
          required
        />

        <label htmlFor="login-password">Password</label>

        <input
          id="login-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          autoComplete="current-password"
          required
        />

        <button type="submit" disabled={loading}>
          {loading
            ? "Logging in..."
            : isGovernment
              ? "Government Login"
              : "Login"}
        </button>

        {!isGovernment && (
          <p className="login-register-link">
            Don't have an account?{" "}
            <button type="button" onClick={onShowRegister}>
              Register
            </button>
          </p>
        )}
      </form>
    </div>
  );
}

export default Login;