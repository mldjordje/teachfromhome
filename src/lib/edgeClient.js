const functionToApiPath = {
  teacher_submit_phase1: "/api/teacher/phase1/submit",
  teacher_create_phase2_submission: "/api/teacher/phase2/submit",
  teacher_apply_referral_code: "/api/referrals/apply",
  admin_move_to_phase2: "/api/admin/phase1/move",
  admin_reject_phase1: "/api/admin/phase1/reject",
  admin_review_phase2: "/api/admin/phase2/review",
  create_analytics_event: "/api/analytics/event",
  admin_cleanup_storage: "/api/admin/storage/cleanup",
  admin_mark_referral_eligible: "/api/referrals/mark-eligible",
  admin_approve_referral_reward: "/api/referrals/approve",
};

export const apiRequest = async ({ path, method = "GET", body, timeoutMs = 30000 }) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(path, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      cache: "no-store",
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch (_error) {
      payload = null;
    }

    if (!response.ok) {
      throw new Error(payload?.error || `Request failed: ${path}`);
    }

    return payload;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`Request timed out: ${path}`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

export const callEdgeFunction = async ({ functionName, body }) => {
  const path = functionToApiPath[functionName];
  if (!path) {
    throw new Error(`Unsupported function mapping: ${functionName}`);
  }

  return apiRequest({
    path,
    method: "POST",
    body: body || {},
  });
};
