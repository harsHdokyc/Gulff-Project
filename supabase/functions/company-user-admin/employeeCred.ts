import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

/** Preflight fails without Allow-Methods; invoke may send extra Supabase headers. */
const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, prefer, accept-profile, accept, x-supabase-api-version",
  "Access-Control-Max-Age": "86400",
};

type Body =
  | {
      action: "create";
      email: string;
      password: string;
      full_name: string;
      role: "pro" | "employee";
    }
  | { action: "delete"; user_id: string }
  | { action: "reset_password"; user_id: string };

function json(
  body: Record<string, unknown>,
  status = 200
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ success: false, error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ success: false, error: "Server configuration error" }, 200);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ success: false, error: "Not authenticated" }, 200);
  }

  const jwt = authHeader.slice(7);
  const admin = createClient(supabaseUrl, serviceRoleKey);

  const {
    data: { user },
    error: authUserError,
  } = await admin.auth.getUser(jwt);
  if (authUserError || !user) {
    return json({ success: false, error: "Not authenticated" }, 200);
  }

  const { data: caller, error: callerError } = await admin
    .from("users")
    .select("role, company_id")
    .eq("id", user.id)
    .maybeSingle();

  if (callerError || !caller?.company_id || caller.role !== "owner") {
    return json(
      {
        success: false,
        error: "Access denied: Only owners can manage users",
      },
      200
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return json({ success: false, error: "Invalid JSON body" }, 200);
  }

  const companyId = caller.company_id as string;

  if (body.action === "create") {
    const email = String(body.email ?? "").trim();
    const password = String(body.password ?? "");
    const full_name = String(body.full_name ?? "").trim();
    const role = body.role;

    if (!email || !full_name || !password) {
      return json(
        { success: false, error: "Email, full name, and password are required" },
        200
      );
    }
    if (role !== "pro" && role !== "employee") {
      return json({ success: false, error: "Invalid role" }, 200);
    }
    if (password.length < 8 || password.length > 72) {
      return json(
        { success: false, error: "Password must be between 8 and 72 characters" },
        200
      );
    }

    const { data: authData, error: authError } =
      await admin.auth.admin.createUser({
        email,
        password,
        // Owner-provisioned users can sign in immediately (no inbox confirmation).
        email_confirm: true,
        user_metadata: {
          role,
          full_name,
          company_id: companyId,
          created_by_owner: true,
          invited_by: user.id,
        },
      });

    if (authError) {
      const msg = authError.message ?? "Failed to create user";
      if (
        msg.includes("already") ||
        msg.includes("registered") ||
        msg.includes("exists")
      ) {
        return json(
          { success: false, error: "A user with this email already exists" },
          200
        );
      }
      return json({ success: false, error: msg }, 200);
    }

    if (!authData.user) {
      return json({ success: false, error: "User creation failed" }, 200);
    }

    const { error: upsertErr } = await admin.from("users").upsert(
      {
        id: authData.user.id,
        email,
        role,
        full_name,
        company_id: companyId,
        // Skip org onboarding — owner already set up the business.
        onboarding_completed: true,
      },
      { onConflict: "id" }
    );

    if (upsertErr) {
      return json({ success: false, error: upsertErr.message }, 200);
    }

    return json({ success: true }, 200);
  }

  if (body.action === "delete") {
    const targetId = body.user_id;
    if (!targetId) {
      return json({ success: false, error: "user_id is required" }, 200);
    }
    if (targetId === user.id) {
      return json(
        { success: false, error: "Cannot delete your own account" },
        200
      );
    }

    const { data: target, error: targetErr } = await admin
      .from("users")
      .select("id, role")
      .eq("id", targetId)
      .eq("company_id", companyId)
      .maybeSingle();

    if (targetErr || !target) {
      return json(
        { success: false, error: "User not found or access denied" },
        200
      );
    }
    if (target.role === "owner") {
      return json(
        { success: false, error: "Cannot delete business owner accounts" },
        200
      );
    }

    const { error: delProfile } = await admin
      .from("users")
      .delete()
      .eq("id", targetId);
    if (delProfile) {
      return json({ success: false, error: delProfile.message }, 200);
    }

    const { error: delAuth } = await admin.auth.admin.deleteUser(targetId);
    if (delAuth) {
      return json({ success: false, error: delAuth.message }, 200);
    }

    return json({ success: true }, 200);
  }

  if (body.action === "reset_password") {
    const targetId = body.user_id;
    if (!targetId) {
      return json({ success: false, error: "user_id is required" }, 200);
    }

    const { data: targetUser, error: tuErr } = await admin
      .from("users")
      .select("email, full_name")
      .eq("id", targetId)
      .eq("company_id", companyId)
      .maybeSingle();

    if (tuErr || !targetUser) {
      return json(
        { success: false, error: "User not found or access denied" },
        200
      );
    }

    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let newPassword = "";
    for (let i = 0; i < 12; i++) {
      newPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const { error: authError } = await admin.auth.admin.updateUserById(
      targetId,
      { password: newPassword }
    );

    if (authError) {
      return json({ success: false, error: authError.message }, 200);
    }

    return json(
      {
        success: true,
        credentials: {
          email: targetUser.email as string,
          temporaryPassword: newPassword,
        },
      },
      200
    );
  }

  return json({ success: false, error: "Unknown action" }, 200);
});
