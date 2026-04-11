export const MAX_PHASE1_ATTEMPTS = 3;

const ALWAYS_ALLOWED_TEACHER_ROUTES = new Set([
  "/teacher/dashboard",
  "/teacher/notifications",
  "/teacher/profile",
]);

const normalizePath = (path) => {
  if (typeof path !== "string") return "";
  const [clean] = path.split("?");
  return clean.split("#")[0];
};

export const getLatestPhase1Attempt = (phase1Attempts = []) => {
  if (!Array.isArray(phase1Attempts) || phase1Attempts.length === 0) return null;
  return phase1Attempts[phase1Attempts.length - 1] || null;
};

const baseFlow = {
  key: "unknown",
  tone: "info",
  title: "Status prijave",
  description: "Pogledaj dashboard za sledece korake.",
  ctaLabel: "Otvori dashboard",
  nextPath: "/teacher/dashboard",
  allowPhase1: false,
  allowPhase2: false,
  feedback: "",
};

export const buildTeacherApplicationFlow = ({ phase1Attempts = [], phase2Task = null } = {}) => {
  const latestPhase1 = getLatestPhase1Attempt(phase1Attempts);
  const attemptsUsed = Array.isArray(phase1Attempts) ? phase1Attempts.length : 0;
  const attemptsLeft = Math.max(0, MAX_PHASE1_ATTEMPTS - attemptsUsed);

  if (!latestPhase1) {
    return {
      ...baseFlow,
      key: "phase1_not_started",
      title: "Prijava nije zapoceta",
      description: "Posalji Fazu 1 da bi usao u proces selekcije.",
      ctaLabel: "Zapocni Fazu 1",
      nextPath: "/teacher/phase1",
      allowPhase1: true,
    };
  }

  if (latestPhase1.status === "pending") {
    return {
      ...baseFlow,
      key: "phase1_pending_review",
      title: "Faza 1 je poslata",
      description: "Tvoja prijava je na proveri. Nema dodatnih koraka dok review ne bude zavrsen.",
      ctaLabel: "Pogledaj status",
      nextPath: "/teacher/dashboard",
      allowPhase1: true,
    };
  }

  if (latestPhase1.status === "rejected") {
    if (attemptsLeft > 0) {
      return {
        ...baseFlow,
        key: "phase1_retry",
        tone: "warning",
        title: "Potrebna je nova Faza 1 prijava",
        description: `Imas jos ${attemptsLeft} pokusaj(a). Pregledaj feedback i posalji novi audio.`,
        ctaLabel: "Posalji novi pokusaj",
        nextPath: "/teacher/phase1",
        allowPhase1: true,
      };
    }

    return {
      ...baseFlow,
      key: "phase1_closed",
      tone: "danger",
      title: "Maksimalan broj pokusaja je iskoriscen",
      description: "Kontaktiraj podrsku ako mislis da je doslo do greske.",
      ctaLabel: "Otvori obavestenja",
      nextPath: "/teacher/notifications",
    };
  }

  if (latestPhase1.status === "moved_to_phase2") {
    return {
      ...baseFlow,
      key: "phase1_passed",
      tone: "success",
      title: "Prosao/la si Fazu 1",
      description: "Nema vise druge faze. HR tim ce te kontaktirati sa narednim koracima.",
      ctaLabel: "Otvori obavestenja",
      nextPath: "/teacher/notifications",
    };
  }

  if (!phase2Task) {
    return {
      ...baseFlow,
      key: "profile_active",
      title: "Profil je aktivan",
      description: "Nastavi sa sledecim korakom iz svog dashboarda.",
      ctaLabel: "Otvori dashboard",
      nextPath: "/teacher/dashboard",
    };
  }

  if (["assigned", "submitted", "retry", "accepted"].includes(phase2Task.status)) {
    return {
      ...baseFlow,
      key: "hr_contact_pending",
      tone: "success",
      title: "Prosao/la si Fazu 1",
      description: "Druga faza je uklonjena iz procesa. HR tim ce te kontaktirati sa narednim koracima.",
      ctaLabel: "Otvori obavestenja",
      nextPath: "/teacher/notifications",
    };
  }

  if (phase2Task.status === "rejected") {
    return {
      ...baseFlow,
      key: "application_closed",
      tone: "danger",
      title: "Prijava je zatvorena",
      description: phase2Task.last_feedback || "Za dodatna pitanja pogledaj obavestenja.",
      ctaLabel: "Otvori obavestenja",
      nextPath: "/teacher/notifications",
      feedback: phase2Task.last_feedback || "",
    };
  }

  return {
    ...baseFlow,
    key: "phase2_unknown",
    title: "Status zadatka nije prepoznat",
    description: "Otvori dashboard i proveri poslednje informacije.",
    ctaLabel: "Otvori dashboard",
    nextPath: "/teacher/dashboard",
  };
};

export const isTeacherRouteAllowed = (pathname, flow) => {
  const cleanPath = normalizePath(pathname);
  if (!cleanPath.startsWith("/teacher")) return true;
  if (ALWAYS_ALLOWED_TEACHER_ROUTES.has(cleanPath)) return true;
  if (cleanPath === "/teacher/phase1") return Boolean(flow?.allowPhase1);
  if (cleanPath === "/teacher/phase2") return Boolean(flow?.allowPhase2);
  return true;
};

export const resolveTeacherGuardRedirect = (pathname, flow) => {
  const cleanPath = normalizePath(pathname);
  if (!cleanPath.startsWith("/teacher")) return null;
  if (isTeacherRouteAllowed(cleanPath, flow)) return null;
  return flow?.nextPath || "/teacher/dashboard";
};

export const resolveTeacherPostLoginPath = ({ requestedPath, flow }) => {
  const cleanPath = normalizePath(requestedPath);
  if (!cleanPath.startsWith("/teacher")) {
    return flow?.nextPath || "/teacher/dashboard";
  }
  if (isTeacherRouteAllowed(cleanPath, flow)) {
    return cleanPath;
  }
  return flow?.nextPath || "/teacher/dashboard";
};
