import axiosInstance from "../api/axios";
import { useState } from "react";

const Register = () => {
  const [formData, setFormData] = useState({ username: "", email: "", password: "" });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axiosInstance.post("auth/register/", formData);
      alert("Registration successful!");
    } catch (err) {
      alert("Registration failed.");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="text" onChange={(e) => setFormData({...formData, username: e.target.value})} placeholder="Username" required />
      <input type="email" onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="Email" required />
      <input type="password" onChange={(e) => setFormData({...formData, password: e.target.value})} placeholder="Password" required />
      <button type="submit">Register</button>
    </form>
  );
};

export default Register;
