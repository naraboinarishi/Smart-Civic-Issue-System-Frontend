
import { useState } from "react";
import "./Register.css";

const API_URL = "http://localhost:8080/api/auth";

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
      const response = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registration failed.");
      }

      setMessage("Registration successful! You can now log in.");
      setForm({ name: "", email: "", password: "" });

      if (onRegistered) {
        onRegistered(data);
      }
    } catch (error) {
      setMessage(
        error.message === "Failed to fetch"
          ? "Cannot connect to the backend. Check that Spring Boot is running."
          : error.message
      );
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
