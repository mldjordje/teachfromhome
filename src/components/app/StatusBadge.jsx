import { getStatusLabel } from "@config/statusMeta";

const StatusBadge = ({ status }) => {
  const parsed = status ? String(status) : "unknown";
  return <span className={`tfh-badge ${parsed}`}>{getStatusLabel(parsed)}</span>;
};

export default StatusBadge;
