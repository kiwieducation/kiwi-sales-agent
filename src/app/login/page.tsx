"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string>("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/sales");
    });
  }, [router]);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return setMsg(error.message);
    router.replace("/sales");
  }

  return (
    <div
      style={{
        maxWidth: 420,
        margin: "80px auto",
        padding: 24,
        border: "1px solid #e5e7eb",
        borderRadius: 16,
        background: "white",
      }}
    >
      <h1 style={{ fontSize: 22, fontWeight: 800 }}>柯维销售顾问工作台</h1>
      <p style={{ marginTop: 8, color: "#6b7280", fontSize: 14 }}>
        使用公司账号登录（Supabase Auth）
      </p>

      <form onSubmit={onLogin} style={{ marginTop: 20, display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, color: "#374151" }}>Email</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            style={{ padding: 10, border: "1px solid #d1d5db", borderRadius: 10 }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, color: "#374151" }}>Password</span>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="••••••••"
            style={{ padding: 10, border: "1px solid #d1d5db", borderRadius: 10 }}
          />
        </label>

        <button
          type="submit"
          style={{
            padding: 10,
            borderRadius: 10,
            border: "1px solid #111827",
            background: "#111827",
            color: "white",
            fontWeight: 800,
          }}
        >
          登录
        </button>

        {msg ? <div style={{ color: "#b91c1c", fontSize: 13 }}>{msg}</div> : null}
      </form>

      <div style={{ marginTop: 14, fontSize: 12, color: "#6b7280" }}>
        第一期原则：AI 只做建议与教学，不代替顾问沟通。
      </div>
    </div>
  );
}
