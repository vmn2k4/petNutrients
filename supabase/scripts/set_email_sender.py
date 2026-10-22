#!/usr/bin/env python3
"""Points the cloud Supabase project at your own email service (SMTP), then applies the confirmation and password-reset email templates.

Why: Supabase's built-in sender is capped at about 2 emails an hour and cannot use custom templates.

Reads from .env.local (never printed, never sent anywhere except Supabase):
  SUPABASE_ACCESS_TOKEN   your Supabase access token (already there)
  SMTP_PASS               the SMTP password. For Resend this is your API key (starts with re_)
  SENDER_EMAIL            an address on a domain you verified with the email service, e.g. hello@yourdomain.com
Optional: SMTP_HOST (default smtp.resend.com), SMTP_PORT (465), SMTP_USER (resend), SENDER_NAME, EMAILS_PER_HOUR (30)

Usage:  python3 supabase/scripts/set_email_sender.py [--dry-run]
"""
import json, os, pathlib, sys, urllib.error, urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[2]
REF = "ovezqaoshnduoyvboagw"
dry = "--dry-run" in sys.argv


def load_env():
    env = dict(os.environ)
    p = ROOT / ".env.local"
    if p.exists():
        for line in p.read_text().splitlines():
            if "=" in line and not line.lstrip().startswith("#"):
                k, v = line.split("=", 1); env.setdefault(k.strip(), v.strip().strip('"').strip("'"))
    return env


def patch(token, body):
    req = urllib.request.Request(f"https://api.supabase.com/v1/projects/{REF}/config/auth", data=json.dumps(body).encode(), method="PATCH",
                                 headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    try:
        return json.load(urllib.request.urlopen(req, timeout=30))
    except urllib.error.HTTPError as e:
        sys.exit(f"Supabase said no ({e.code}): {e.read().decode()[:300]}")


def main():
    env = load_env()
    missing = [k for k in ("SUPABASE_ACCESS_TOKEN", "SMTP_PASS", "SENDER_EMAIL") if not env.get(k)]
    if missing and not dry:
        sys.exit("Missing in .env.local: " + ", ".join(missing) + "\nSee the header of this file for what each one is.")
    host = env.get("SMTP_HOST", "smtp.resend.com"); port = env.get("SMTP_PORT", "465"); user = env.get("SMTP_USER", "resend")
    sender = env.get("SENDER_EMAIL", "hello@example.com"); name = env.get("SENDER_NAME", "Pet Nutrition Matcher")
    per_hour = int(env.get("EMAILS_PER_HOUR", "30"))
    t = lambda n: (ROOT / f"supabase/templates/{n}.html").read_text()
    smtp = {"smtp_host": host, "smtp_port": port, "smtp_user": user, "smtp_pass": env.get("SMTP_PASS", "<missing>"),
            "smtp_admin_email": sender, "smtp_sender_name": name, "rate_limit_email_sent": per_hour}
    templates = {
        "mailer_subjects_confirmation": "Confirm your email for Pet Nutrition Matcher", "mailer_templates_confirmation_content": t("confirmation"),
        "mailer_subjects_recovery": "Reset your Pet Nutrition Matcher password", "mailer_templates_recovery_content": t("recovery"),
        "password_min_length": 8,
    }
    if dry:
        shown = {**smtp, "smtp_pass": "<hidden>"}
        print("Would set SMTP:", json.dumps(shown, indent=2)); print("Would then apply templates:", ", ".join(templates)); return
    token = env["SUPABASE_ACCESS_TOKEN"]
    patch(token, smtp); print("1/2 email sender saved:", f"{name} <{sender}> via {host}:{port}, up to {per_hour} emails an hour")
    r = patch(token, templates)
    ok = all("ConfirmationURL" in (r.get(f"mailer_templates_{n}_content") or "") for n in ("confirmation", "recovery"))
    print("2/2 confirmation and reset templates applied:", "yes" if ok else "check in the dashboard")
    print("Done. Next: sign up in the app with your own email and check the confirmation email arrives.")


if __name__ == "__main__":
    main()
