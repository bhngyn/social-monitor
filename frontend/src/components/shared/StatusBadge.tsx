import { clsx } from "clsx";

const statusColors: Record<string, string> = {
  running: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  partial: "bg-yellow-100 text-yellow-800",
  pending: "bg-gray-100 text-gray-800",
};

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const colors = statusColors[status.toLowerCase()] ?? statusColors.pending;

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        colors
      )}
    >
      {status}
    </span>
  );
}
