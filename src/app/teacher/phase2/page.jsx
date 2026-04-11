"use client";

import RequireAuth from "@components/auth/RequireAuth";
import AppShell from "@components/app/AppShell";

const TeacherPhase2Page = () => {
  return (
    <RequireAuth>
      <AppShell title="Faza 2" subtitle="Ovaj korak vise nije deo procesa selekcije.">
        <div className="tfh-grid">
          <div className="tfh-card">
            <h3>Faza 2 je uklonjena</h3>
            <p>Ako si prosao/la fazu 1, nema dodatnog snimanja ni zadataka.</p>
            <p>HR tim ce te kontaktirati sa narednim koracima.</p>
          </div>
        </div>
      </AppShell>
    </RequireAuth>
  );
};

export default TeacherPhase2Page;
