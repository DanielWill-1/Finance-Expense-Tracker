import axiosInstance from "../api/axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axiosInstance.post("auth/login/", credentials);
      localStorage.setItem("access", res.data.access);
      localStorage.setItem("refresh", res.data.refresh);
      alert("Login successful!");
      navigate("/dashboard");
    } catch (err) {
      alert("Login failed.");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="text" onChange={(e) => setCredentials({ ...credentials, username: e.target.value })} placeholder="Username" required />
      <input type="password" onChange={(e) => setCredentials({ ...credentials, password: e.target.value })} placeholder="Password" required />
      <button type="submit">Login</button>
    </form>
  );
};

export default Login;
