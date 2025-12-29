"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/auth-helpers-nextjs";

export default function DevLogin() {
  const [role, setRole] = useState<'student' | 'company' | 'internal'>("student");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

  async function handleDevLogin() {
    setLoading(true);
    setError("");
    try {
      console.log("🔐 Dev login for role:", role);
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id, email, role")
        .eq("role", role)
        .limit(1)
        .single();
      if (userError || !user) {
        console.error("❌ No user found for role:", role, userError);
        setError(`No ${role} user found in database. Please run the test data SQL first.`);
        setLoading(false);
        return;
      }
      console.log("✅ Found user:", user);
      localStorage.setItem("dev_user", JSON.stringify({
        id: user.id,
        email: user.email,
        role: user.role,
      }));
      console.log("✅ Dev user stored in localStorage");
      const dashboardMap = {
        student: "/students/dashboard",
        company: "/companies/dashboard",
        internal: "/internal/dashboard",
      };
      router.push(dashboardMap[role]);
    } catch (err: any) {
      console.error("💥 Dev login error:", err);
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div style={{
      maxWidth: "400px",
      margin: "100px auto",
      padding: "2rem",
      border: "1px solid #ccc",
      borderRadius: "8px",
      backgroundColor: "#fff",
    }}>
      <h1 style={{ marginBottom: "1rem" }}>DEV LOGIN</h1>
      <p style={{ color: "#666", marginBottom: "2rem", fontSize: "0.875rem" }}>
        ⚠️ Development mode only - Remove before production!
      </p>
      {error && (
        <div
          style={{
            padding: "1rem",
            marginBottom: "1rem",
            background: "#f8d7da",
            border: "1px solid #dc3545",
            borderRadius: "4px",
            color: "#721c24",
            fontSize: "0.875rem",
          }}
        >
          {error}
        </div>
      )}
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>
          Select Role:
        </label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as any)}
          disabled={loading}
          style={{
            width: "100%",
            padding: "0.75rem",
            fontSize: "1rem",
            borderRadius: "4px",
            border: "1px solid #ccc",
          }}
        >
          <option value="student">Student (student@test.com)</option>
          <option value="company">Company (company@test.com)</option>
          <option value="internal">Internal (internal@test.com)</option>
        </select>
      </div>
      <button
        onClick={handleDevLogin}
        disabled={loading}
        style={{
          width: "100%",
          padding: "0.75rem",
          fontSize: "1rem",
          backgroundColor: loading ? "#ccc" : "#0066cc",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Logging in..." : `Login as ${role}`}
      </button>
      <div
        style={{
          marginTop: "2rem",
          padding: "1rem",
          background: "#f8f9fa",
          borderRadius: "4px",
          fontSize: "0.875rem",
        }}
      >
        <strong>How this works:</strong>
        <ul style={{ marginTop: "0.5rem", paddingLeft: "1.5rem" }}>
          <li>Fetches real user from database</li>
          <li>Stores actual user ID in localStorage</li>
          <li>All queries work correctly</li>
        </ul>
      </div>
    </div>
  );
}
