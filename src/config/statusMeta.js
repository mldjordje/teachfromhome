const STATUS_LABELS = {
  // generic/app flow
  unknown: "Nepoznato",
  phase1: "Faza 1",
  phase2: "HR kontakt",

  // phase 1
  pending: "Na cekanju",
  moved_to_phase2: "Prosao/la fazu 1",
  rejected: "Odbijeno",

  // phase 2
  assigned: "Dodeljeno",
  submitted: "Poslato",
  retry: "Potreban retry",
  accepted: "HR kontakt",

  // rejection reasons / misc
  bad_accent: "Akcenat",
  bad_pronunciation: "Izgovor",
  low_energy: "Energija",
  info: "Info",
  system: "Sistem",
  referral: "Preporuka",
};

export const getStatusLabel = (status) => {
  const key = String(status || "").trim();
  if (!key) return STATUS_LABELS.unknown;
  if (STATUS_LABELS[key]) return STATUS_LABELS[key];
  return key.replaceAll("_", " ");
};
