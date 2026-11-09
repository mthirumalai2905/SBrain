export function redact(value: string) {
  return value
    .replace(/gsk_[A-Za-z0-9]+/g, "[redacted]")
    .replace(/\bgh[psoru]_[A-Za-z0-9]+/g, "[redacted]")
    .replace(/\bgithub_pat_[A-Za-z0-9_]+/g, "[redacted]")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/(api[_-]?key|secret|password|token)\s*[:=]\s*\S+/gi, "$1=[redacted]");
}
