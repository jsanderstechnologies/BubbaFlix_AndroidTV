import React, { useState, useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import { getServerUrl } from "../../utils/serverSettings";
import axios from "axios";
import "./index.scss";

const AuthPage = () => {
  const { login, setupRequired, setSetupRequired, setToken } = useContext(AuthContext);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    try {
      if (setupRequired) {
        const baseUrl = getServerUrl();
        const res = await axios.post(`${baseUrl}/api/auth/setup`, { username, password });
        setToken(res.data.token);
        setSetupRequired(false);
      } else {
        await login(username, password);
      }
    } catch (err) {
      setError(err.response?.data?.error || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="authPage">
      <div className="authContainer">
        <div className="authLogoWrapper" style={{ textAlign: "center", marginBottom: "20px" }}>
          <img src="/logo.png" alt="BubbaFlix TV" style={{ height: "60px", objectFit: "contain" }} />
        </div>
        <h1>{setupRequired ? "Welcome to BubbaFlix" : "Sign In"}</h1>
        <p>{setupRequired ? "Create your initial Admin account to get started." : "Enter your credentials to continue."}</p>
        
        {error && <div className="errorMsg">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="inputGroup">
            <label>Username</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="inputGroup">
            <label>Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" disabled={loading} className="btnPrimary">
            {loading ? "Loading..." : setupRequired ? "Create Admin Account" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AuthPage;
