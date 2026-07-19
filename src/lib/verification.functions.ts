import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHash, randomInt } from "node:crypto";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sendTemplateEmail } from "@/lib/email-templates/send-email";

const PURPOSE = "email_verify";

function hashCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

export const requestProfileVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId, claims } = context as {
      supabase: any; userId: string; claims: { email?: string };
    };
    const email = claims.email;
    if (!email) throw new Error("E-posta bulunamadı");

    // Rate limit: no more than 1 code per 60s
    const { data: recent } = await supabase
      .from("verification_codes")
      .select("id, created_at")
      .eq("user_id", userId)
      .eq("purpose", PURPOSE)
      .order("created_at", { ascending: false })
      .limit(1);
    if (recent && recent[0]) {
      const age = Date.now() - new Date(recent[0].created_at).getTime();
      if (age < 60_000) {
        throw new Error("Lütfen yeni kod istemeden önce biraz bekleyin.");
      }
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const expiresAt = new Date(Date.now() + 15 * 60_000).toISOString();

    const { error } = await supabase.from("verification_codes").insert({
      user_id: userId,
      purpose: PURPOSE,
      code_hash: hashCode(code),
      expires_at: expiresAt,
      attempts: 0,
    });
    if (error) throw new Error(error.message);

    // Fetch name for personalization
    let name: string | undefined;
    try {
      const { data: p } = await supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle();
      name = p?.full_name ?? undefined;
    } catch { /* noop */ }

    const result = await sendTemplateEmail("profile-verification", email, {
      templateData: { code, name },
      idempotencyKey: `profile-verify-${userId}-${Date.now()}`,
    });

    if (!result.sent) {
      return { ok: false, reason: result.reason };
    }
    return { ok: true };
  });

export const confirmProfileVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { code: string }) =>
    z.object({ code: z.string().trim().regex(/^\d{6}$/, "6 haneli kod girin") }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    const hash = hashCode(data.code);

    const { data: rows, error: qErr } = await supabase
      .from("verification_codes")
      .select("id, code_hash, expires_at, consumed_at, attempts")
      .eq("user_id", userId)
      .eq("purpose", PURPOSE)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1);
    if (qErr) throw new Error(qErr.message);
    const row = rows?.[0];
    if (!row) throw new Error("Aktif doğrulama kodu bulunamadı. Yeni kod isteyin.");
    if (new Date(row.expires_at).getTime() < Date.now()) {
      throw new Error("Kodun süresi doldu. Yeni kod isteyin.");
    }
    if ((row.attempts ?? 0) >= 5) {
      throw new Error("Çok fazla hatalı deneme. Yeni kod isteyin.");
    }
    if (row.code_hash !== hash) {
      await supabase.from("verification_codes")
        .update({ attempts: (row.attempts ?? 0) + 1 })
        .eq("id", row.id);
      throw new Error("Kod hatalı.");
    }

    await supabase.from("verification_codes")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", row.id);

    const { error: rpcErr } = await supabase.rpc("set_my_email_verified");
    if (rpcErr) throw new Error(rpcErr.message);

    return { ok: true };
  });
