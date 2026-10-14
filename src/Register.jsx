
import { useState } from "react";
import "./Register.css";

const API_URL = 'https://smart-civic-issue-system-backend.onrender.com/api';

function Register({ onRegistered, onShowLogin }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(event) {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
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
            `Registration failed (${response.status}).`
        );
      }

      setMessage("Registration successful! You can now log in.");
      setForm({
        name: "",
        email: "",
        password: "",
      });

      if (onRegistered) {
        onRegistered(data);
      }
    } catch (error) {
      console.error("Registration error:", error);

      if (error instanceof TypeError) {
        setMessage(
          "Cannot connect to the server. Please check your connection."
        );
      } else {
        setMessage(error.message || "Registration failed.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="register-page">
      <form className="register-card" onSubmit={handleSubmit}>
        <div className="register-icon">🏙️</div>

        <h1>Create Account</h1>
        <p>Join Smart Civic to report and track civic issues.</p>

        <label htmlFor="name">Full Name</label>
        <input
          id="name"
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Enter your full name"
          autoComplete="name"
          required
          maxLength={100}
        />

        <label htmlFor="email">Email Address</label>
        <input
          id="email"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          placeholder="Enter your email"
          autoComplete="email"
          required
          maxLength={100}
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          placeholder="At least 8 characters"
          autoComplete="new-password"
          minLength={8}
          required
        />

        {message && (
          <div className="register-message" role="status">
            {message}
          </div>
        )}

        <button type="submit" disabled={loading}>
          {loading ? "Creating Account..." : "Create Account"}
        </button>

        <div className="register-footer">
          Already have an account?{" "}
          <button
            type="button"
            className="register-link"
            onClick={onShowLogin}
          >
            Sign in
          </button>
        </div>
      </form>
    </div>
  );
}

export default Register;