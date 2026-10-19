export function localDateString(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function formatDuration(hours) {
  const minutesTotal = Math.round(hours * 60);
  return `${Math.floor(minutesTotal / 60)} h ${String(minutesTotal % 60).padStart(2, "0")} min`;
}

export function formatClockTime(hour) {
  const minutesTotal = Math.round((((hour % 24) + 24) % 24) * 60) % 1440;
  return `${String(Math.floor(minutesTotal / 60)).padStart(2, "0")}:${String(minutesTotal % 60).padStart(2, "0")}`;
}