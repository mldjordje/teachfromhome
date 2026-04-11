"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const phaseLinks = [
  { href: "/admin/phase1", label: "Faza 1" },
  { href: "/admin/accepted", label: "Prihvaceni" },
  { href: "/admin/candidates", label: "Svi kandidati" },
];

const AdminPhaseSwitch = () => {
  const pathname = usePathname() || "";

  return (
    <div className="tfh-admin-phase-switch">
      {phaseLinks.map((item) => {
        const isActive = item.href === "/admin/candidates" ? pathname.startsWith("/admin/candidates") : pathname === item.href;
        return (
          <Link key={item.href} href={item.href} className={`tfh-admin-phase-link ${isActive ? "is-active" : ""}`}>
            {item.label}
          </Link>
        );
      })}
    </div>
  );
};

export default AdminPhaseSwitch;
