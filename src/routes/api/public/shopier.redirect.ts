import { createFileRoute } from "@tanstack/react-router";
import { createHmac, randomInt } from "crypto";

// Shopier klasik ödeme akışı: imzalı form auto-submit.
// GET /api/public/shopier/redirect?paymentId=xxx

export const Route = createFileRoute("/api/public/shopier/redirect")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const paymentId = url.searchParams.get("paymentId");
          if (!paymentId) return htmlError("Eksik parametre: paymentId");

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const { data: settings, error: sErr } = await supabaseAdmin
            .from("shopier_settings" as never)
            .select("*")
            .eq("id", 1)
            .maybeSingle();
          if (sErr) throw new Error(sErr.message);
          const s = settings as {
            is_enabled: boolean; test_mode: boolean;
            api_key: string | null; api_secret: string | null;
            website_index: number | null; callback_url: string | null;
          } | null;
          if (!s || !s.is_enabled) return htmlError("Shopier ödeme şu an aktif değil.");
          if (!s.api_key || !s.api_secret) {
            return htmlError("Shopier API Key / API Secret eksik. Yönetici panelinden tanımlayın.");
          }

          const { data: payment, error: pErr } = await supabaseAdmin
            .from("payments" as never)
            .select("id, user_id, amount_try, reference, status")
            .eq("id", paymentId)
            .maybeSingle();
          if (pErr) throw new Error(pErr.message);
          const p = payment as {
            id: string; user_id: string; amount_try: number; reference: string; status: string;
          } | null;
          if (!p) return htmlError("Ödeme kaydı bulunamadı.");
          if (p.status === "paid") return htmlRedirect("/panel/ilanlarim?paid=1");

          // Buyer bilgileri (profil)
          const { data: profile } = await supabaseAdmin
            .from("profiles" as never)
            .select("full_name, phone")
            .eq("id", p.user_id)
            .maybeSingle();
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(p.user_id);
          const email = authUser?.user?.email ?? "musteri@hizmetalani.com";
          const fullName = (profile as { full_name?: string } | null)?.full_name ?? "Müşteri";
          const [firstName, ...rest] = fullName.split(" ");
          const lastName = rest.join(" ") || "-";
          const phone = ((profile as { phone?: string } | null)?.phone) ?? "05000000000";

          const randomNr = String(randomInt(100000, 999999));
          const totalOrderValue = Number(p.amount_try).toFixed(2);
          const currency = "0"; // TL

          // İmza: HMAC-SHA256( random_nr + platform_order_id + total + currency, api_secret ) -> base64
          const signBase = randomNr + p.id + totalOrderValue + currency;
          const signature = createHmac("sha256", s.api_secret).update(signBase, "utf8").digest("base64");

          const origin = new URL(request.url).origin;
          const callbackUrl = s.callback_url && s.callback_url.length > 5
            ? s.callback_url
            : `${origin}/api/public/shopier/callback`;

          const fields: Record<string, string> = {
            API_key: s.api_key,
            website_index: String(s.website_index ?? 1),
            platform_order_id: p.id,
            product_name: `Doping - ${p.reference}`,
            product_type: "1",
            buyer_name: firstName || "Musteri",
            buyer_surname: lastName,
            buyer_email: email,
            buyer_account_age: "0",
            buyer_id_nr: p.user_id.substring(0, 12),
            buyer_phone: phone,
            billing_address: "Turkiye",
            billing_city: "Istanbul",
            billing_country: "Turkey",
            billing_postcode: "34000",
            shipping_address: "Turkiye",
            shipping_city: "Istanbul",
            shipping_country: "Turkey",
            shipping_postcode: "34000",
            total_order_value: totalOrderValue,
            currency,
            platform: "0",
            is_in_frame: "0",
            current_language: "0",
            modul_version: "1.0.4",
            random_nr: randomNr,
            signature,
            // Test modu bilgi amaçlı; Shopier gerçek/test hesabı hesap seviyesinde belirlenir.
            callback_url: callbackUrl,
          };

          const inputs = Object.entries(fields)
            .map(([k, v]) => `<input type="hidden" name="${k}" value="${escapeHtml(v)}" />`)
            .join("");

          const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>Shopier'e yönlendiriliyor…</title></head>
<body style="font-family:system-ui;padding:2rem;text-align:center;background:#0b0f19;color:#e5e7eb">
<p>Shopier güvenli ödeme sayfasına yönlendiriliyorsunuz…</p>
<form id="f" method="POST" action="https://www.shopier.com/ShowProduct/api_pay4.php">${inputs}</form>
<script>document.getElementById('f').submit();</script>
</body></html>`;
          return new Response(html, {
            status: 200,
            headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
          });
        } catch (e) {
          return htmlError(e instanceof Error ? e.message : "Bilinmeyen hata");
        }
      },
    },
  },
});

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
function htmlError(msg: string) {
  return new Response(
    `<!doctype html><body style="font-family:system-ui;padding:2rem;background:#0b0f19;color:#f87171">
<h2>Ödeme başlatılamadı</h2><p>${escapeHtml(msg)}</p>
<p><a style="color:#60a5fa" href="/panel/ilanlarim">← Panele dön</a></p></body>`,
    { status: 400, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}
function htmlRedirect(to: string) {
  return new Response(null, { status: 302, headers: { location: to } });
}
