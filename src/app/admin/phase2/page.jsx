"use client";

import { Card, CardBody } from "@heroui/react";
import RequireAuth from "@components/auth/RequireAuth";
import AppShell from "@components/app/AppShell";
import AdminPhaseSwitch from "@components/app/AdminPhaseSwitch";

const AdminPhase2Page = () => {
  return (
    <RequireAuth adminOnly>
      <AppShell title="Admin faza 2" subtitle="Ovaj korak vise nije deo procesa selekcije.">
        <AdminPhaseSwitch />
        <Card className="tfh-admin-panel-card">
          <CardBody className="grid gap-2">
            <h3 className="text-lg font-semibold">Faza 2 je uklonjena</h3>
            <p>Kandidati koji prodju fazu 1 vise ne dobijaju dodatni zadatak.</p>
            <p>Nakon prolaska faze 1 kandidat dobija obavestenje da ce ga kontaktirati HR tim.</p>
          </CardBody>
        </Card>
      </AppShell>
    </RequireAuth>
  );
};

export default AdminPhase2Page;
