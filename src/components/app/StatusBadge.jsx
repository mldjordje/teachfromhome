const StatusBadge = ({ status }) => {
  if (!status) return <span className="tfh-badge">unknown</span>;
  return <span className={`tfh-badge ${status}`}>{status}</span>;
};

export default StatusBadge;
