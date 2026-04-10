import http from "k6/http";
import { check, sleep } from "k6";

/**
 * Smoke load test for FCMA.
 *
 * Run with: k6 run tests/load/smoke.js
 * Or against staging: BASE_URL=https://fcma.vercel.app k6 run tests/load/smoke.js
 *
 * Baseline sanity check — 1 VU, 1 minute, hits every major endpoint once.
 * Asserts p95 < 1000ms, zero failed requests.
 */

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

export const options = {
  vus: 1,
  duration: "1m",
  thresholds: {
    http_req_duration: ["p(95)<1000"], // 95% of requests < 1s
    http_req_failed: ["rate<0.01"],    // less than 1% failed
  },
};

export default function () {
  // Public endpoints that should always respond
  const endpoints = [
    "/login",
    "/api/site-settings",
    "/api/manifest",
    "/api/favicon",
    "/checkout",
  ];

  for (const path of endpoints) {
    const res = http.get(`${BASE_URL}${path}`);
    check(res, {
      [`${path} status is 2xx or 3xx`]: (r) => r.status >= 200 && r.status < 400,
    });
    sleep(0.5);
  }
}
