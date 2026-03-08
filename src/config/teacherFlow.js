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

  if (latestPhase1.status === "moved_to_phase2" && !phase2Task) {
    return {
      ...baseFlow,
      key: "phase2_waiting_assignment",
      tone: "success",
      title: "Prosao/la si Fazu 1",
      description: "Cekas dodelu konkretnog zadatka za Fazu 2.",
      ctaLabel: "Otvori dashboard",
      nextPath: "/teacher/dashboard",
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

  if (phase2Task.status === "assigned") {
    return {
      ...baseFlow,
      key: "phase2_assigned",
      tone: "success",
      title: "Dodeljen ti je zadatak za Fazu 2",
      description: "Pogledaj recenicu i posalji video.",
      ctaLabel: "Posalji Fazu 2",
      nextPath: "/teacher/phase2",
      allowPhase2: true,
    };
  }

  if (phase2Task.status === "submitted") {
    return {
      ...baseFlow,
      key: "phase2_submitted",
      title: "Faza 2 je poslata",
      description: "Prijava je na admin proveri. Sacekaj povratnu informaciju.",
      ctaLabel: "Pogledaj status",
      nextPath: "/teacher/dashboard",
      allowPhase2: true,
    };
  }

  if (phase2Task.status === "retry") {
    return {
      ...baseFlow,
      key: "phase2_retry",
      tone: "warning",
      title: "Potreban je retry za Fazu 2",
      description: "Procitaj feedback i posalji novi pokusaj.",
      ctaLabel: "Posalji novi pokusaj",
      nextPath: "/teacher/phase2",
      allowPhase2: true,
      feedback: phase2Task.last_feedback || "",
    };
  }

  if (phase2Task.status === "accepted") {
    return {
      ...baseFlow,
      key: "phase2_accepted",
      tone: "success",
      title: "Cestitamo, prijava je prihvacena",
      description: "Tim ce te uskoro kontaktirati sa sledecim informacijama.",
      ctaLabel: "Otvori obavestenja",
      nextPath: "/teacher/notifications",
      allowPhase2: true,
    };
  }

  if (phase2Task.status === "rejected") {
    return {
      ...baseFlow,
      key: "phase2_rejected",
      tone: "danger",
      title: "Faza 2 nije prihvacena",
      description: phase2Task.last_feedback || "Prijava je zatvorena. Za dodatna pitanja pogledaj obavestenja.",
      ctaLabel: "Otvori obavestenja",
      nextPath: "/teacher/notifications",
      allowPhase2: true,
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

