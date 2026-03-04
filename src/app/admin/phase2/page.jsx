"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Card, CardBody, CardHeader, Divider, Spinner, Textarea } from "@heroui/react";
import Link from "next/link";
import RequireAuth from "@components/auth/RequireAuth";
import AppShell from "@components/app/AppShell";
import StatusBadge from "@components/app/StatusBadge";
import { apiGet, apiPost } from "@library/apiClient";

const AdminPhase2Page = () => {
  const [rows, setRows] = useState([]);
  const [statusFilter, setStatusFilter] = useState("submitted");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyTaskId, setBusyTaskId] = useState("");
  const [feedbackMap, setFeedbackMap] = useState({});

  const loadRows = async () => {
    setLoading(true);

    try {
      const payload = await apiGet(
        `/api/admin/phase2?status=${encodeURIComponent(statusFilter)}&page=${encodeURIComponent(String(page))}&pageSize=${encodeURIComponent(
          String(pageSize),
        )}`,
      );
      setError("");
      setRows(payload.rows || []);
      setTotal(Number(payload.total || 0));
    } catch (loadError) {
      setError(loadError.message || "Failed to load phase 2 queue.");
      setRows([]);
      setTotal(0);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadRows();
  }, [statusFilter, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const reviewAction = async (row, action) => {
    if (!row.latest_submission_id) {
      setError("No submission available for this task.");
      return;
    }

    setBusyTaskId(row.task_id);
    setError("");

    try {
      await apiPost("/api/admin/phase2/review", {
        action,
        task_id: row.task_id,
        submission_id: row.latest_submission_id,
        feedback: feedbackMap[row.task_id] || null,
      });

      await loadRows();
    } catch (actionError) {
      setError(actionError.message || "Review action failed.");
    }

    setBusyTaskId("");
  };

  return (
    <RequireAuth adminOnly>
      <AppShell title="Admin Phase 2 Queue" subtitle="Review latest Phase 2 submissions and decide accept/retry/reject.">
        <Card className="tfh-admin-panel-card mb-4">
          <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              className="tfh-admin-filter-select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All statuses</option>
              <option value="assigned">Assigned</option>
              <option value="submitted">Submitted</option>
              <option value="retry">Retry</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>
            <select
              className="tfh-admin-filter-select"
              value={String(pageSize)}
              onChange={(e) => {
                setPageSize(Number(e.target.value) || 20);
                setPage(1);
              }}
            >
              <option value="20">20 per page</option>
              <option value="50">50 per page</option>
              <option value="100">100 per page</option>
            </select>
            <Button variant="bordered" onPress={loadRows} className="tfh-action-grid-btn">
              Refresh
            </Button>
            <Button as={Link} href="/admin/candidates" variant="light" className="tfh-action-grid-btn">
              Candidate View
            </Button>
          </CardBody>
        </Card>

        <Card className="tfh-admin-panel-card mb-4">
          <CardBody className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm text-slate-600">
              Page {page} of {totalPages} ({total} total)
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="bordered"
                isDisabled={loading || page <= 1}
                onPress={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="bordered"
                isDisabled={loading || page >= totalPages}
                onPress={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              >
                Next
              </Button>
            </div>
          </CardBody>
        </Card>

        {error && <Alert color="danger" title={error} className="mb-4" />}

        <Card className="tfh-admin-panel-card">
          <CardHeader>
            <h3 className="text-lg font-semibold">Phase 2 queue</h3>
          </CardHeader>
          <Divider />
          <CardBody>
            {loading ? (
              <div className="flex items-center gap-3 py-6">
                <Spinner size="sm" />
                <p>Loading Phase 2 queue...</p>
              </div>
            ) : rows.length ? (
              <div className="tfh-mobile-list">
                {rows.map((row) => (
                  <article key={row.task_id} className="tfh-mobile-item tfh-mobile-item--admin">
                    <div className="tfh-mobile-item-top">
                      <strong>
                        {row.first_name} {row.last_name}
                      </strong>
                      <StatusBadge status={row.task_status} />
                    </div>
                    <p>{row.email}</p>
                    <p>
                      Attempts: {row.current_attempts} / {row.attempts_allowed}
                    </p>
                    <p>Sentence: {row.phase2_sentence}</p>
                    {row.last_feedback && <p>Feedback: {row.last_feedback}</p>}

                    {row.latest_submission_id ? (
                      <>
                        <p>Latest attempt: {row.latest_attempt_no}</p>
                        <p>
                          Latest status: <StatusBadge status={row.latest_submission_status} />
                        </p>
                        <p>{row.latest_submission_feedback || "-"}</p>
                      </>
                    ) : (
                      <p>No submission yet</p>
                    )}

                    {row.latest_video_blob_url && (
                      <Button as="a" href={row.latest_video_blob_url} target="_blank" rel="noreferrer" size="sm" variant="bordered">
                        Open video
                      </Button>
                    )}

                    {row.latest_submission_id && ["submitted", "retry", "assigned"].includes(row.task_status) && (
                      <div className="flex flex-col gap-2">
                        <Textarea
                          size="sm"
                          label="Feedback"
                          labelPlacement="outside"
                          placeholder="Feedback for retry/reject"
                          value={feedbackMap[row.task_id] || ""}
                          onValueChange={(value) =>
                            setFeedbackMap((prev) => ({
                              ...prev,
                              [row.task_id]: value,
                            }))
                          }
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" color="success" onPress={() => reviewAction(row, "accept")} isLoading={busyTaskId === row.task_id}>
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            color="warning"
                            variant="flat"
                            onPress={() => reviewAction(row, "retry")}
                            isLoading={busyTaskId === row.task_id}
                          >
                            Retry
                          </Button>
                          <Button
                            size="sm"
                            color="danger"
                            variant="flat"
                            onPress={() => reviewAction(row, "reject")}
                            isLoading={busyTaskId === row.task_id}
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <p>No records found.</p>
            )}
          </CardBody>
        </Card>
      </AppShell>
    </RequireAuth>
  );
};

export default AdminPhase2Page;
