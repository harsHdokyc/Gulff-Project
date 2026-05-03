# 📬 Automated Notifications System (Twilio + Resend + Supabase)

## 🚀 Overview

This document outlines a **lean, production-ready notification system** using:

* **Supabase** (DB + Edge Functions + Webhooks)
* **Resend** (Email delivery)
* **Twilio** (WhatsApp delivery)

The system is **event-driven (real-time)** with **cron-based fallback** for retries and scheduled messages.

---

## 🧠 Architecture Philosophy

> Build **simple first**, scale later.

### ❌ Avoid (for now)

* Complex queue systems
* Over-engineered retry pipelines
* Heavy monitoring dashboards

### ✅ Focus on

* Real-time delivery
* Reliability
* Clean logging
* User preferences

---

## 🏗️ System Architecture

```
1. Insert notification (Supabase DB)
2. Webhook triggers Edge Function
3. Edge Function:
   - checks user preferences
   - evaluates urgency
   - sends email (Resend)
   - sends WhatsApp (Twilio)
   - logs result
4. Cron handles retries (fallback)
```

---

## 🧩 Database Schema

### 1. Notification Preferences

```sql
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    
    email_enabled BOOLEAN DEFAULT TRUE,
    whatsapp_enabled BOOLEAN DEFAULT TRUE,
    
    urgency_threshold VARCHAR(20) DEFAULT 'warning', -- info | warning | danger
    
    quiet_hours_start TIME DEFAULT '22:00:00',
    quiet_hours_end TIME DEFAULT '08:00:00',
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(user_id, company_id)
);
```

---

### 2. Notification Logs

```sql
CREATE TABLE notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    notification_id UUID,
    user_id UUID,
    company_id UUID,
    
    channel VARCHAR(20), -- email | whatsapp
    status VARCHAR(20),  -- sent | failed
    
    recipient TEXT,
    message TEXT,
    
    error TEXT,
    sent_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## ⚡ Trigger Mechanism (IMPORTANT)

### ✅ Use Supabase Webhooks (Recommended)

Trigger Edge Function when a new notification is created:

```
Table: notifications
Event: INSERT
→ Call Edge Function
```

---

## 🧠 Edge Function Logic

### Responsibilities:

* Fetch user preferences
* Check urgency threshold
* Check quiet hours
* Send notifications
* Log results

---

## 📧 Email Integration (Resend)

### Example Request

```ts
await fetch('/functions/v1/send-email', {
  method: 'POST',
  body: JSON.stringify({
    to: user.email,
    subject: '🚨 Alert',
    html: '<p>Important message</p>'
  })
})
```

---

## 📱 WhatsApp Integration (Twilio)

### Example Request

```ts
await fetch('/functions/v1/send-whatsapp', {
  method: 'POST',
  body: JSON.stringify({
    to: user.phone,
    message: '🚨 Important alert'
  })
})
```

---

## 🔁 Retry Mechanism (Cron Job)

### Use `pg_cron` in Supabase

```sql
SELECT cron.schedule(
  'retry-failed-notifications',
  '*/10 * * * *',
  $$
  UPDATE notification_logs
  SET status = 'pending'
  WHERE status = 'failed'
  AND created_at > NOW() - INTERVAL '1 hour';
  $$
);
```

👉 Cron should ONLY:

* Retry failed messages
* Handle scheduled notifications (quiet hours)

---

## 🌙 Quiet Hours Handling

### Logic:

If current time is within quiet hours:

* Do NOT send immediately
* Store for later
* Cron sends after quiet hours

---

## ⚖️ Urgency Filtering

### Levels:

| Level   | Value |
| ------- | ----- |
| info    | 1     |
| warning | 2     |
| danger  | 3     |

### Rule:

```
Send only if:
notification_level >= user_threshold
```

---

## ❗ Important Design Rules

### 1. NEVER trigger notifications from frontend

Bad:

```
onSuccess → send notification ❌
```

Good:

```
DB insert → webhook → Edge Function ✅
```

---

### 2. Keep system event-driven

* No polling
* No unnecessary cron usage

---

### 3. Log EVERYTHING

You need logs for:

* debugging
* retries
* analytics (later)

---

## 🔐 Environment Variables

```
RESEND_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_NUMBER=

SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## 📦 MVP Scope (What to Build First)

### ✅ Phase 1 (2–3 days)

* Preferences table
* Logs table
* Email + WhatsApp Edge Functions
* Webhook trigger
* Basic urgency filtering

---

### ⏳ Phase 2 (Later)

* Cron retry
* Quiet hours scheduling
* Rate limiting

---

### 🚀 Phase 3 (Scale)

* Queue system
* Monitoring dashboard
* Analytics
* Multi-channel (Slack, etc.)

---

## 💰 Cost Estimate

| Service  | Cost         |
| -------- | ------------ |
| Twilio   | ~$0.05/msg   |
| Resend   | Free → cheap |
| Supabase | Included     |

---

## 🧠 Final Advice

> Don’t build for scale before you have traffic.

Start with:

* Simple
* Event-driven
* Reliable

Then evolve based on real usage.

---

## ✅ Summary

* Use **Supabase Webhooks** for instant triggers
* Use **Edge Functions** for sending notifications
* Use **Resend + Twilio** for delivery
* Use **cron ONLY for retries**
* Keep system **lean and fast**

---

If you want next:
👉 I can generate **actual Edge Function code (ready to deploy)**
👉 Or help you plug this into your current project cleanly
