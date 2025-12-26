"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";

type LeadRow = {
  id: string;
  name: string;
  stage: "new" | "consulting" | "proposal" | "signed" | "lost";
  target_country: string | null;
  grade: string | null;
  age: number | null;
  school_type: string | null;
  created_at: string;
};

const stageLabel: Record<LeadRow["stage"], string> = {
  new: "新线索",
  consulting: "咨询中",
  proposal: "方案中",
  signed: "已签约",
  lost: "已流失",
};

export default function SalesHome() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [me, setMe] = useState<{ email?: string | null } | null>(null);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    grade: "",
    age: "",
    school_type: "",
    target_country: "",
    stage: "new" as LeadRow["stage"],
  });
  const canCreate = useMemo(() => form.name.trim().length > 0, [form.name]);

  async function load() {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      router.replace("/login");
      return;
    }
    setMe({ email: userData.user.email });

    const { data, error } = await supabase
      .from("leads")
      .select("id,name,stage,target_country,grade,age,school_type,created_at")
      .order("created_at", { ascending: false });

    if (!error && data) setLeads(data as LeadRow[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  async function createLead() {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return router.replace("/login");

    const payload = {
      name: form.name.trim(),
      grade: form.grade || null,
      age: form.age ? Number(form.age) : null,
      school_type: form.school_type || null,
      target_country: form.target_country || null,
      stage: form.stage,
      owner_id: uid,
    };

    const { error } = await supabase.from("leads").insert(payload);
    if (error) return alert(error.message);

    setOpen(false);
    setForm({ name: "", grade: "", age: "", school_type: "", target_country: "", stage: "new" });
    await load();
  }

  return (
    <div style={{ maxWidth: 980, margin: "24px auto", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900 }}>销售顾问工作台</h1>
          <div style={{ marginTop: 6, color: "#6b7280", fontSize: 13 }}>{me?.email ? `当前账号：${me.email}` : ""}</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => setOpen(true)} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #111827", background: "#111827", color: "white", fontWeight: 900 }}>
            新建客户
          </button>
          <button onClick={logout} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #d1d5db", background: "white" }}>
            退出登录
          </button>
        </div>
      </div>

      <div style={{ marginTop: 16, padding: 14, border: "1px solid #e5e7eb", borderRadius: 16, background: "white" }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>客户列表</div>
        {loading ? (
          <div style={{ color: "#6b7280" }}>加载中…</div>
        ) : leads.length === 0 ? (
          <div style={{ color: "#6b7280" }}>暂无客户，先点右上角“新建客户”。</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {leads.map((l) => (
              <Link key={l.id} href={`/sales/leads/${l.id}`} style={{ textDecoration: "none", color: "inherit", border: "1px solid #e5e7eb", borderRadius: 14, padding: 12, display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 900 }}>{l.name}</div>
                  <div style={{ marginTop: 4, fontSize: 13, color: "#6b7280" }}>
                    {l.target_country ? `意向：${l.target_country}` : "意向：未填写"} · {stageLabel[l.stage]}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>{new Date(l.created_at).toLocaleString()}</div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {open ? (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "grid", placeItems: "center", padding: 16 }}>
          <div style={{ width: "min(560px, 96vw)", background: "white", borderRadius: 16, border: "1px solid #e5e7eb", padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 900 }}>新建客户</div>
              <button onClick={() => setOpen(false)} style={{ border: "1px solid #e5e7eb", background: "white", borderRadius: 10, padding: "6px 10px" }}>
                关闭
              </button>
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              <input placeholder="客户姓名（必填）" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ padding: 10, border: "1px solid #d1d5db", borderRadius: 10 }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <input placeholder="年级（如 G10 / 大一）" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} style={{ padding: 10, border: "1px solid #d1d5db", borderRadius: 10 }} />
                <input placeholder="年龄" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} style={{ padding: 10, border: "1px solid #d1d5db", borderRadius: 10 }} />
              </div>
              <input placeholder="高中类型（普高/国际/A-Level/IB/AP）" value={form.school_type} onChange={(e) => setForm({ ...form, school_type: e.target.value })} style={{ padding: 10, border: "1px solid #d1d5db", borderRadius: 10 }} />
              <input placeholder="意向国家（如 美国/英国/加拿大）" value={form.target_country} onChange={(e) => setForm({ ...form, target_country: e.target.value })} style={{ padding: 10, border: "1px solid #d1d5db", borderRadius: 10 }} />
              <select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value as any })} style={{ padding: 10, border: "1px solid #d1d5db", borderRadius: 10 }}>
                <option value="new">新线索</option>
                <option value="consulting">咨询中</option>
                <option value="proposal">方案中</option>
                <option value="signed">已签约</option>
                <option value="lost">已流失</option>
              </select>

              <button disabled={!canCreate} onClick={createLead} style={{ padding: 10, borderRadius: 10, border: "1px solid #111827", background: canCreate ? "#111827" : "#9ca3af", color: "white", fontWeight: 900 }}>
                创建
              </button>

              <div style={{ fontSize: 12, color: "#6b7280" }}>
                说明：第一期先手动录入客户。企业微信会话对接放到第二期。
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
