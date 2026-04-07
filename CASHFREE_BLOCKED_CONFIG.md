# Cashfree Blocked User Form – Webhook & Redirect URLs

Configure your Cashfree **Blockedusername** form with these URLs:

## Redirect URL (after successful payment)

```
https://YOUR-DOMAIN.com/payment/unblock-callback
```

Cashfree appends `?order_id=xxx` automatically. Replace `YOUR-DOMAIN.com` with your actual domain (e.g. `iqearners.com`).

**Example:**
- Production: `https://iqearners.com/payment/unblock-callback`
- Local: `http://localhost:3000/payment/unblock-callback`

---

## Webhook URL (for server-side payment confirmation)

```
https://YOUR-DOMAIN.com/api/payments/unblock-webhook
```

Use this URL when adding a webhook in the Cashfree Dashboard for your Blocked form.

**Example:**
- Production: `https://iqearners.com/api/payments/unblock-webhook`
- Local: `http://localhost:3000/api/payments/unblock-webhook` (use ngrok for testing)

---

## Cashfree Dashboard Steps

1. Go to [Cashfree Dashboard](https://merchant.cashfree.com) → Payment Forms → **Blockedusername**
2. **Redirect URL**: Set to `https://YOUR-DOMAIN.com/payment/unblock-callback`
3. **Webhooks**: Add webhook URL `https://YOUR-DOMAIN.com/api/payments/unblock-webhook`
4. Ensure `CASHFREE_SECRET_KEY` is set in your env (used for webhook signature verification)

---

## URL Parameters

The Pay button passes:
- `customer_name=USERNAME` – the blocked user's username
- `order_id=XXX` – the user's first entry-fee payment order_id (retrieved from backend), to link the unblock payment to their prior payment

If the form does not support this, add a custom field in the form that maps to `order_meta` so the webhook can extract the username.
