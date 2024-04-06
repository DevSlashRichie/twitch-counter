import { createClient } from "https://esm.sh/@supabase/supabase-js";
import { Buffer } from "node:buffer";
import Stripe from "npm:stripe@14.24.0";
const stripe = new Stripe(Deno.env.get("STRIPE_KEY") || "");

const ENDPOINT_SECRET = Deno.env.get("STRIPE_ENDPOINT_SECRET") || "";

const SUPABASE_URL = Deno.env.get("SP_URL") || "";
const SUPABASE_KEY = Deno.env.get("SP_KEY") || "";

Deno.serve(async (req: Request) => {
  const signature = req.headers.get("Stripe-Signature") || "";

  const bodyAsBuffer = await req.arrayBuffer();

  try {
    const event = await stripe.webhooks.constructEventAsync(
      Buffer.from(bodyAsBuffer),
      signature,
      ENDPOINT_SECRET,
    );

    if (event.type === "payment_intent.succeeded") {
      const amount = (Number(event.data.object.amount) || 0) / 100;

      const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

      const timeToUpdateAtDb = amount * 3;
      await supabase.from("stripe-to-update").insert({ timeToUpdateAtDb });

      console.log(`💰 Payment of ${amount} MXN succeeded!`);
    }
  } catch (err) {
    console.log(`⚠️  Webhook signature verification failed.`, String(err));
    return new Response(null, {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({}), {
    headers: { "Content-Type": "application/json" },
  });
});
