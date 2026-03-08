import React from "react";
import { STATUS_LABEL } from "../lib/constants";

const colors: Record<number, string> = {
  0: "badge-pending",
  1: "badge-released",
  2: "badge-refunded",
};

export const StatusBadge: React.FC<{ status: number }> = ({ status }) => (
  <span className={`badge ${colors[status] ?? "badge-pending"}`}>
    {STATUS_LABEL[status] ?? "Unknown"}
  </span>
);