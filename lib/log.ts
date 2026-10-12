import { redactText } from "./redact";

function secrets(): (string | undefined)[] {
  return [process.env.SOCIAL_POSTER_KEY, process.env.SESSION_SECRET, process.env.SETUP_TOKEN];
}

function base(level: string, msg: string, extra?: Record<string, unknown>) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    msg: redactText(msg, secrets()),
    ...extra,
  });
  if (level === "error" || level === "fatal") console.error(line);
  else console.log(line);
}

export const log = {
  info: (msg: string, extra?: Record<string, unknown>) => base("info", msg, extra),
  warn: (msg: string, extra?: Record<string, unknown>) => base("warn", msg, extra),
  error: (msg: string, extra?: Record<string, unknown>) => base("error", msg, extra),
};
