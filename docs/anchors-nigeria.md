# Nigerian Stellar Anchors Research

Date checked: 2026-11-08  
Methodology: Direct `curl` calls against Horizon mainnet, GitHub, domain `/.well-known/stellar.toml`, and advertised SEP endpoints. No addresses or endpoint structures were trusted from memory. Every finding reflects direct network observations. When a check failed or an endpoint did not respond, it is recorded as "could not verify".

---

## 1. NGNC (Link / ngnc.online)

**Date checked:** 2026-11-08

### Discovery & Horizon Verification
- Horizon Asset query: `curl -s https://horizon.stellar.org/assets?asset_code=NGNC`
  - Active issuer observed: `GASBV6W7GGED66MXEVC7YZHTWWYMSVYEY35USF2HJZBLABLYIFQGXZY6`
  - Account count: 6,468 authorized accounts
  - Circulating balance: ~83,083,732.61 NGNC
- Issuer Account query: `curl -s https://horizon.stellar.org/accounts/GASBV6W7GGED66MXEVC7YZHTWWYMSVYEY35USF2HJZBLABLYIFQGXZY6`
  - `home_domain`: `"ngnc.online"`

### Stellar TOML (`https://ngnc.online/.well-known/stellar.toml`)
- `curl -s -D - https://ngnc.online/.well-known/stellar.toml`
  - HTTP Status: `200 OK`
  - CORS header: `Access-Control-Allow-Origin: *`
- Advertised SEP endpoints in TOML:
  - `WEB_AUTH_ENDPOINT`: `"https://anchor.ngnc.online/auth"`
  - `TRANSFER_SERVER_SEP0024`: `"https://anchor.ngnc.online/sep24"`
  - `TRANSFER_SERVER`: Not present
  - `KYC_SERVER`: Not present
  - `ANCHOR_QUOTE_SERVER`: Not present

### Advertised Endpoint Checks
- SEP-24 `/info`: `curl -s -H "Origin: https://example.com" https://anchor.ngnc.online/sep24/info`
  - HTTP Status: `200 OK`
  - CORS header: `access-control-allow-origin: https://example.com`
  - Enabled assets:
    - `NGNC`:
      - Deposit: `enabled: true`, `min_amount: 20000`, `max_amount: 20000000`, `fee_fixed: 0`, `fee_percent: 0`
      - Withdraw: `enabled: true`, `min_amount: 10000`, `max_amount: 5000000`, `fee_fixed: 0`, `fee_percent: 0`
      - Features: `account_creation: true`, `claimable_balances: true`
- KYC Requirements:
  - Deposit and withdraw `fields` object in `/info` is empty (`{}`); interactive web flow on hosted SEP-24 URL handles user verification and Nigerian bank transfer details.
- SEP-10 Auth: `curl -s "https://anchor.ngnc.online/auth?account=GASBV6W7GGED66MXEVC7YZHTWWYMSVYEY35USF2HJZBLABLYIFQGXZY6"`
  - HTTP Status: `200 OK`
  - Returns valid challenge transaction XDR.

**Verdict:** Active mainnet SEP-24 and SEP-10 anchor for NGNC with CORS enabled.

---

## 2. Cowrie Exchange (cowrie.exchange)

**Date checked:** 2026-11-08

### Discovery & Attribution
- Discovered candidate reference in GitHub repository `ezedike-evan/corridor-in-a-box`, file `corridors/ng-cowrie.corridor.yaml`:
  - `curl -s https://raw.githubusercontent.com/ezedike-evan/corridor-in-a-box/master/corridors/ng-cowrie.corridor.yaml`
  - Returned corridor definition citing domain `cowrie.exchange` and asset `NGNT`. Credit: Evan Ezedike (`ezedike-evan/corridor-in-a-box`).
- Horizon verification:
  - Asset query: `curl -s https://horizon.stellar.org/assets?asset_code=NGNT`
  - Active issuer observed: `GAWODAROMJ33V5YDFY3NPYTHVYQG7MJXVJ2ND3AOGIHYRWINES6ACCPD` (8,606 authorized accounts, ~44.8M circulating).
  - Issuer query: `curl -s https://horizon.stellar.org/accounts/GAWODAROMJ33V5YDFY3NPYTHVYQG7MJXVJ2ND3AOGIHYRWINES6ACCPD`
  - `home_domain`: `"cowrie.exchange"`

### Stellar TOML (`https://cowrie.exchange/.well-known/stellar.toml`)
- `curl -s -D - https://cowrie.exchange/.well-known/stellar.toml`
  - HTTP Status: `200 OK`
  - CORS header: `Access-Control-Allow-Origin: *`
- Advertised SEP endpoints in TOML:
  - `WEB_AUTH_ENDPOINT`: `'https://api.cowrie.exchange/web_auth'`
  - `TRANSFER_SERVER`: `'https://api.cowrie.exchange/transfer'` (SEP-6)
  - `KYC_SERVER`: `'https://api.cowrie.exchange/kyc'` (SEP-12)
  - `DIRECT_PAYMENT_SERVER`: `'https://api.cowrie.exchange/sep31/direct'` (SEP-31)
  - `TRANSFER_SERVER_SEP0024`: Not present
  - `ANCHOR_QUOTE_SERVER`: Not present

### Advertised Endpoint Checks
- SEP-6 `/info`: `curl -s https://api.cowrie.exchange/transfer/info`
  - HTTP Status: `200 OK`
  - CORS header: `Access-Control-Allow-Origin: *`
  - Enabled assets:
    - `NGNT`:
      - Deposit: `enabled: true`, `fee_fixed: 0`, `fee_percent: 0`, requires `customer_id` (SEP-12)
      - Withdraw: `enabled: true`, `types: { "bank_account": { "fields": { "dest": { "description": "NUBAN (10 digits)" }, "dest_extra": { "description": "Bank Choice" } } } }`, requires `customer_id` (SEP-12)
- KYC Requirements:
  - SEP-12 customer identification required before transfer initiation. `curl -s https://api.cowrie.exchange/kyc/customer` returns `401 Unauthorized` with `{"status":401,"error":"Missing authorization"}` and CORS `Access-Control-Allow-Origin: *`.
- SEP-10 Auth: `curl -s "https://api.cowrie.exchange/web_auth?account=GAWODAROMJ33V5YDFY3NPYTHVYQG7MJXVJ2ND3AOGIHYRWINES6ACCPD"`
  - HTTP Status: `200 OK`
  - Returns valid challenge transaction XDR.

**Verdict:** Active mainnet SEP-6, SEP-10, and SEP-12 anchor for NGNT; does not support SEP-24 hosted flows.

---

## 3. Link (linkio.africa)

**Date checked:** 2026-11-08

- Listed on `https://anchors.stellar.org` with website `https://www.linkio.africa/`, fiat asset NGN, and claimed standards SEP-6 and SEP-24.
- `curl.exe -I -m 10 https://linkio.africa/.well-known/stellar.toml`
  - Observation: Connection timed out after 10,000 ms.
- `curl.exe -I -m 10 https://www.linkio.africa/.well-known/stellar.toml`
  - Observation: SSL handshake failed (`SEC_E_INTERNAL_ERROR`).
- Note: The actual active service infrastructure operates under `ngnc.online` (verified above).

**Verdict:** Could not verify (domain unresponsive and SSL handshake error on legacy domain).

---

## 4. Busha (busha.co / busha.io)

**Date checked:** 2026-11-08

- Listed on `https://anchors.stellar.org` under country Nigeria with website `https://www.busha.co/`.
- `curl.exe -s -L -D - https://busha.co/.well-known/stellar.toml`
  - Observation: HTTP 301 Moved Permanently redirecting to `https://busha.io/`, returning Webflow marketing HTML.
  - No `stellar.toml` served.
  - Advertised endpoints: None observed.

**Verdict:** Could not verify (operates as a crypto exchange platform without published SEP anchor endpoints).

---

## 5. Yellow Card (yellowcard.io)

**Date checked:** 2026-11-08

- Listed on `https://anchors.stellar.org` covering multiple African countries including Nigeria.
- `curl.exe -s -D - https://yellowcard.io/.well-known/stellar.toml`
  - Observation: HTTP 404 Not Found (`Not found`).
  - No `stellar.toml` served.
  - Advertised endpoints: None observed.

**Verdict:** Could not verify (no stellar.toml found).

---

## 6. Paychant (paychant.com)

**Date checked:** 2026-11-08

- Listed on `https://anchors.stellar.org` under country Nigeria with website `https://paychant.com/`.
- `curl.exe -s -D - https://paychant.com/.well-known/stellar.toml`
  - Observation: HTTP 404 Not Found (Nuxt SSR HTML 404 page).
  - No `stellar.toml` served.
  - Advertised endpoints: None observed.

**Verdict:** Could not verify (no stellar.toml found).

---

## 7. Chipper Cash (chippercash.com)

**Date checked:** 2026-11-08

- Listed on `https://anchors.stellar.org` with website `https://www.chippercash.com/`.
- `curl.exe -s -D - https://www.chippercash.com/.well-known/stellar.toml`
  - Observation: HTTP 404 Not Found (`<p>Invalid .well-known request</p>`).
  - No `stellar.toml` served.
  - Advertised endpoints: None observed.

**Verdict:** Could not verify (no stellar.toml found).

---

## 8. BlindPay (blindpay.com)

**Date checked:** 2026-11-08

- Listed on `https://anchors.stellar.org` under country Nigeria.
- `curl.exe -s -D - https://blindpay.com/.well-known/stellar.toml`
  - Observation: HTTP 403 Forbidden (Cloudflare protection challenge/error).
  - No `stellar.toml` could be retrieved.

**Verdict:** Could not verify (HTTP 403 Forbidden).

