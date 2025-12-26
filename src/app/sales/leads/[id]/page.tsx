"use client";

import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type LeadRow = {
  id: string;
  name: string;
  stage: "new" | "consulting" | "proposal" | "signed" | "lost";
  target_country: string | null;
  grade: string | null;
  age: number | null;
  school_type: string | null;
  owner_id: string;
  created_at: string;
};

type ConversationRow = {
  id: string;
  lead_id: string;
  summary: string;
  raw_text: string;
  created_at: string;
};

type FollowupRow = {
  id: string;
  lead_id: string;
  next_action: string;
  due_at: string | null;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
};

type AiAssistRow = {
  id: string;
  lead_id: string;
  extracted_needs: string;
  suggested_plan: string;
  communication_tips: string;
  acknowledged: boolean;
  created_at: string;
};

type ContractRow = {
  id: string;
  lead_id: string;
  proposal_summary: string;
  status: "draft" | "pending" | "approved";
  created_at: string;
};

const stageLabel: Record<LeadRow["stage"], string> = {
  new: "新线索",
  consulting: "咨询中",
  proposal: "方案中",
  signed: "已签约",
  lost: "已流失",
};

export default function LeadDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = String(params.id || "");

  const [loading, setLoading] = useState(true);
  const [lead, setLead] = useState<LeadRow | null>(null);
  const [convs, setConvs] = useState<ConversationRow[]>([]);
  const [followups, setFollowups] = useState<FollowupRow[]>([]);
  const [ai, setAi] = useState<AiAssistRow | null>(null);
  const [contract, setContract] = useState<ContractRow | null>(null);

  const [convForm, setConvForm] = useState({ summary: "", raw_text: "" });
  const [fuForm, setFuForm] = useState({ next_action: "", due_at: "" });
  const [aiForm, setAiForm] = useState({ extracted_needs: "", suggested_plan: "", communication_tips: "", acknowledged: false });
  const [contractForm, setContractForm] = useState({ proposal_summary: "" });

  const canAddConv = useMemo(() => convForm.summary.trim().length > 0, [convForm.summary]);
  const canAddFu = useMemo(() => fuForm.next_action.trim().length > 0, [fuForm.next_action]);

  async function loadAll() {
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      router.replace("/login");
      return;
    }

    const { data: leadData, error: leadErr } = await supabase.from("leads").select("*").eq("id", id).single();
    if (leadErr) {
      alert(leadErr.message);
      router.replace("/sales");
      return;
    }
    setLead(leadData as LeadRow);

    const { data: convData } = await supabase
      .from("conversations")
      .select("id,lead_id,summary,raw_text,created_at")
      .eq("lead_id", id)
      .order("created_at", { ascending: false });
    setConvs((convData ?? []) as ConversationRow[]);

    const { data: fuData } = await supabase
      .from("followups")
      .select("id,lead_id,next_action,due_at,completed,completed_at,created_at")
      .eq("lead_id", id)
      .order("created_at", { ascending: false });
    setFollowups((fuData ?? []) as FollowupRow[]);

    const { data: aiData } = await supabase
      .from("ai_assists")
      .select("id,lead_id,extracted_needs,suggested_plan,communication_tips,acknowledged,created_at")
      .eq("lead_id", id)
      .order("created_at", { ascending: false })
      .limit(1);
    setAi((aiData?.[0] ?? null) as any);

    const { data: contractData } = await supabase
      .from("contracts")
      .select("id,lead_id,proposal_summary,status,created_at")
      .eq("lead_id", id)
      .order("created_at", { ascending: false })
      .limit(1);
    setContract((contractData?.[0] ?? null) as any);

    setLoading(false);
  }

  useEffect(() => { loadAll(); }, [id]);

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  async function addConversation() {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return router.replace("/login");

    const { error } = await supabase.from("conversations").insert({
      lead_id: id,
      summary: convForm.summary.trim(),
      raw_text: convForm.raw_text.trim(),
      created_by: uid,
    });

    if (error) return alert(error.message);
    setConvForm({ summary: "", raw_text: "" });
    await loadAll();
  }

  async function addFollowup() {
    const due = fuForm.due_at ? new Date(fuForm.due_at).toISOString() : null;

    const { error } = await supabase.from("followups").insert({
      lead_id: id,
      next_action: fuForm.next_action.trim(),
      due_at: due,
    });

    if (error) return alert(error.message);
    setFuForm({ next_action: "", due_at: "" });
    await loadAll();
  }

  async function toggleFollowupDone(row: FollowupRow) {
    const nextCompleted = !row.completed;
    const { error } = await supabase
      .from("followups")
      .update({ completed: nextCompleted, completed_at: nextCompleted ? new Date().toISOString() : null })
      .eq("id", row.id);

    if (error) return alert(error.message);
    await loadAll();
  }

  async function saveAiAssist() {
    const { error } = await supabase.from("ai_assists").insert({
      lead_id: id,
      extracted_needs: aiForm.extracted_needs.trim(),
      suggested_plan: aiForm.suggested_plan.trim(),
      communication_tips: aiForm.communication_tips.trim(),
      acknowledged: !!aiForm.acknowledged,
    });

    if (error) return alert(error.message);
    alert("已保存（第一期：AI 建议存档）");
    await loadAll();
  }

  async function createContractDraft() {
    const { error } = await supabase.from("contracts").insert({
      lead_id: id,
      proposal_summary: contractForm.proposal_summary.trim(),
      status: "draft",
    });
    if (error) return alert(error.message);
    alert("已创建合同草稿");
    await loadAll();
  }

  async function submitContractPending() {
    if (!contract) return alert("请先创建合同草稿");
    const { error } = await supabase.from("contracts").update({ status: "pending" }).eq("id", contract.id);
    if (error) return alert(error.message);
    alert("已提交审批（pending）");
    await loadAll();
  }

  if (loading) return <div style={{ maxWidth: 980, margin: "24px auto", padding: 16, color: "#6b7280" }}>加载中…</div>;
  if (!lead) return null;

  return (
    <div style={{ maxWidth: 980, margin: "24px auto", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <Link href="/sales" style={{ color: "#111827", textDecoration: "none", fontWeight: 900 }}>← 返回列表</Link>
          <h1 style={{ marginTop: 10, fontSize: 22, fontWeight: 900 }}>{lead.name}</h1>
          <div style={{ marginTop: 6, color: "#6b7280", fontSize: 13 }}>
            {stageLabel[lead.stage]} · {lead.target_country ? `意向：${lead.target_country}` : "意向：未填写"}
          </div>
        </div>
        <button onClick={logout} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #d1d5db", background: "white" }}>退出登录</button>
      </div>

      <div style={{ marginTop: 16, padding: 14, border: "1px solid #e5e7eb", borderRadius: 16, background: "white" }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>咨询记录</div>
        <div style={{ display: "grid", gap: 10 }}>
          <input placeholder="本次沟通要点（必填）" value={convForm.summary} onChange={(e) => setConvForm({ ...convForm, summary: e.target.value })}
            style={{ padding: 10, border: "1px solid #d1d5db", borderRadius: 10 }} />
          <textarea placeholder="对话摘要 / 粘贴聊天记录（可选）" value={convForm.raw_text} onChange={(e) => setConvForm({ ...convForm, raw_text: e.target.value })}
            rows={4} style={{ padding: 10, border: "1px solid #d1d5db", borderRadius: 10, resize: "vertical" }} />
          <button disabled={!canAddConv} onClick={addConversation} style={{ padding: 10, borderRadius: 10, border: "1px solid #111827", background: canAddConv ? "#111827" : "#9ca3af", color: "white", fontWeight: 900 }}>
            添加记录
          </button>
        </div>

        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          {convs.length === 0 ? <div style={{ color: "#6b7280" }}>暂无咨询记录。</div> : convs.map((c) => (
            <div key={c.id} style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 12 }}>
              <div style={{ fontWeight: 900 }}>{c.summary}</div>
              {c.raw_text ? <div style={{ marginTop: 8, whiteSpace: "pre-wrap", color: "#374151", fontSize: 13 }}>{c.raw_text}</div> : null}
              <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>{new Date(c.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 16, padding: 14, border: "1px solid #e5e7eb", borderRadius: 16, background: "white" }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>跟进提醒</div>
        <div style={{ display: "grid", gap: 10 }}>
          <input placeholder="下一步动作" value={fuForm.next_action} onChange={(e) => setFuForm({ ...fuForm, next_action: e.target.value })}
            style={{ padding: 10, border: "1px solid #d1d5db", borderRadius: 10 }} />
          <input type="datetime-local" value={fuForm.due_at} onChange={(e) => setFuForm({ ...fuForm, due_at: e.target.value })}
            style={{ padding: 10, border: "1px solid #d1d5db", borderRadius: 10 }} />
          <button disabled={!canAddFu} onClick={addFollowup} style={{ padding: 10, borderRadius: 10, border: "1px solid #111827", background: canAddFu ? "#111827" : "#9ca3af", color: "white", fontWeight: 900 }}>
            添加跟进
          </button>
        </div>

        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          {followups.length === 0 ? <div style={{ color: "#6b7280" }}>暂无跟进提醒。</div> : followups.map((f) => (
            <div key={f.id} style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 12, display: "flex", justifyContent: "space-between", gap: 10 }}>
              <div>
                <div style={{ fontWeight: 900 }}>{f.completed ? "✅ " : "⏳ "}{f.next_action}</div>
                <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
                  截止：{f.due_at ? new Date(f.due_at).toLocaleString() : "未设置"}
                </div>
              </div>
              <button onClick={() => toggleFollowupDone(f)} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #d1d5db", background: "white", height: 36 }}>
                {f.completed ? "标记未完成" : "标记完成"}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 16, padding: 14, border: "1px solid #e5e7eb", borderRadius: 16, background: "white" }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>🤖 AI 咨询辅助（第一期：存档 + 确认）</div>
        <div style={{ display: "grid", gap: 10 }}>
          <textarea placeholder="需求抓取" value={aiForm.extracted_needs} onChange={(e) => setAiForm({ ...aiForm, extracted_needs: e.target.value })}
            rows={3} style={{ padding: 10, border: "1px solid #d1d5db", borderRadius: 10 }} />
          <textarea placeholder="服务方案建议" value={aiForm.suggested_plan} onChange={(e) => setAiForm({ ...aiForm, suggested_plan: e.target.value })}
            rows={4} style={{ padding: 10, border: "1px solid #d1d5db", borderRadius: 10 }} />
          <textarea placeholder="沟通思路" value={aiForm.communication_tips} onChange={(e) => setAiForm({ ...aiForm, communication_tips: e.target.value })}
            rows={4} style={{ padding: 10, border: "1px solid #d1d5db", borderRadius: 10 }} />

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <input type="checkbox" checked={aiForm.acknowledged} onChange={(e) => setAiForm({ ...aiForm, acknowledged: e.target.checked })} />
            我已理解 AI 建议
          </label>

          <button onClick={saveAiAssist} style={{ padding: 10, borderRadius: 10, border: "1px solid #111827", background: "#111827", color: "white", fontWeight: 900 }}>
            保存 AI 建议存档
          </button>
        </div>
      </div>

      <div style={{ marginTop: 16, padding: 14, border: "1px solid #e5e7eb", borderRadius: 16, background: "white" }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>签约流程（第一期：草稿 + 提交审批）</div>
        <textarea placeholder="签约建议说明" value={contractForm.proposal_summary} onChange={(e) => setContractForm({ proposal_summary: e.target.value })}
          rows={4} style={{ padding: 10, border: "1px solid #d1d5db", borderRadius: 10, width: "100%" }} />
        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={createContractDraft} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #111827", background: "#111827", color: "white", fontWeight: 900 }}>
            创建合同草稿
          </button>
          <button onClick={submitContractPending} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #d1d5db", background: "white", fontWeight: 900 }}>
            提交审批（pending）
          </button>
        </div>
      </div>
    </div>
  );
}
