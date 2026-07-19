import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

// Shopier POST callback: platform_order_id, status, installment, payment_id, random_nr, signature
// signature = base64( hmac_sha256( random_nr + platform_order_id, api_secret ) )

export const Route = createFileRoute("/api/public/shopier/callback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const form = await request.formData();
          const platformOrderId = String(form.get("platform_order_id") ?? "");
          const status = String(form.get("status") ?? "");
          const randomNr = String(form.get("random_nr") ?? "");
          const signature = String(form.get("signature") ?? "");
          const shopierPaymentId = String(form.get("payment_id") ?? "");
          const installment = String(form.get("installment") ?? "");

          if (!platformOrderId || !signature || !randomNr) {
            return new Response("missing fields", { status: 400 });
          }

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: settings } = await supabaseAdmin
            .from("shopier_settings" as never).select("api_secret").eq("id", 1).maybeSingle();
          const secret = (settings as { api_secret: string | null } | null)?.api_secret;
          if (!secret) return new Response("shopier not configured", { status: 500 });

          const expected = createHmac("sha256", secret)
            .update(randomNr + platformOrderId, "utf8").digest("base64");
          const a = Buffer.from(signature);
          const b = Buffer.from(expected);
          if (a.length !== b.length || !timingSafeEqual(a, b)) {
            return new Response("invalid signature", { status: 401 });
          }

          if (status === "success") {
            const { error } = await supabaseAdmin.rpc("activate_paid_promotion" as never, {
              _payment_id: platformOrderId,
            } as never);
            if (error) {
              await supabaseAdmin.from("payments" as never)
                .update({ admin_note: `callback err: ${error.message}` } as never)
                .eq("id", platformOrderId);
              return new Response("activation failed", { status: 500 });
            }
            await supabaseAdmin.from("payments" as never)
              .update({ external_id: shopierPaymentId, admin_note: `shopier ok (taksit ${installment})` } as never)
              .eq("id", platformOrderId);
          } else {
            await supabaseAdmin.from("payments" as never)
              .update({ status: "failed", admin_note: `shopier fail: ${status}` } as never)
              .eq("id", platformOrderId);
          }
          return new Response("ok", { status: 200 });
        } catch (e) {
          return new Response(e instanceof Error ? e.message : "error", { status: 500 });
        }
      },
      // Shopier bazı durumlarda GET ile döner (return URL)
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const status = url.searchParams.get("status") ?? "unknown";
        const to = status === "success" ? "/panel/ilanlarim?paid=1" : "/panel/ilanlarim?paid=0";
        return new Response(null, { status: 302, headers: { location: to } });
      },
    },
  },
});
