// Price maths shared by the pricing page and the register form.
import { useSyncExternalStore } from "react";
import { ANNUAL_SAVING, type Period, type Plan } from "./content";

export const round2 = (n: number) => Math.round(n * 100) / 100;

// Prices are set in USD. Rates below are fallbacks; live rates replace them once fetched.
// Prices are set in USD. Visitors see them in their local currency, picked from the browser's
// time zone (then language region) at load, using approximate rates, then switches to live rates. Add ?cur=EUR to try another.
const RATES: Record<string, number> = {
  USD: 1, EUR: 0.92, GBP: 0.79, INR: 84, AUD: 1.52, CAD: 1.37, JPY: 150, SGD: 1.34, AED: 3.67,
  CHF: 0.88, SEK: 10.5, NOK: 10.7, DKK: 6.9, NZD: 1.65, ZAR: 18.2, BRL: 5.5, MXN: 18.5, PLN: 4,
  SAR: 3.75, MYR: 4.4, PHP: 57, IDR: 16000, THB: 35, KRW: 1350, TRY: 34,
};
const EUR_REGIONS = "AT BE CY DE EE ES FI FR GR HR IE IT LT LU LV MT NL PT SI SK".split(" ");
const REGION_CURRENCY: Record<string, string> = {
  US: "USD", GB: "GBP", IN: "INR", AU: "AUD", CA: "CAD", JP: "JPY", SG: "SGD", AE: "AED", CH: "CHF",
  SE: "SEK", NO: "NOK", DK: "DKK", NZ: "NZD", ZA: "ZAR", BR: "BRL", MX: "MXN", PL: "PLN", SA: "SAR",
  MY: "MYR", PH: "PHP", ID: "IDR", TH: "THB", KR: "KRW", TR: "TRY",
  ...Object.fromEntries(EUR_REGIONS.map((r) => [r, "EUR"])),
};
// The time zone says where the visitor is; the browser language often doesn't (en-US is common worldwide).
const ZONE_REGION: Record<string, string> = {
  "Asia/Kolkata": "IN", "Asia/Calcutta": "IN", "Europe/London": "GB", "Asia/Tokyo": "JP", "Asia/Singapore": "SG",
  "Asia/Dubai": "AE", "Europe/Zurich": "CH", "Europe/Stockholm": "SE", "Europe/Oslo": "NO", "Europe/Copenhagen": "DK",
  "Pacific/Auckland": "NZ", "Africa/Johannesburg": "ZA", "America/Sao_Paulo": "BR", "America/Mexico_City": "MX",
  "Europe/Warsaw": "PL", "Asia/Riyadh": "SA", "Asia/Kuala_Lumpur": "MY", "Asia/Manila": "PH", "Asia/Jakarta": "ID",
  "Asia/Bangkok": "TH", "Asia/Seoul": "KR", "Europe/Istanbul": "TR", "America/Toronto": "CA", "America/Vancouver": "CA",
  "America/Edmonton": "CA", "America/Winnipeg": "CA", "America/Halifax": "CA", "Europe/Paris": "FR", "Europe/Berlin": "DE",
  "Europe/Madrid": "ES", "Europe/Rome": "IT", "Europe/Amsterdam": "NL", "Europe/Brussels": "BE", "Europe/Vienna": "AT",
  "Europe/Dublin": "IE", "Europe/Lisbon": "PT", "Europe/Athens": "GR", "Europe/Helsinki": "FI", "Europe/Tallinn": "EE",
  "Europe/Riga": "LV", "Europe/Vilnius": "LT", "Europe/Luxembourg": "LU", "Europe/Malta": "MT", "Europe/Bratislava": "SK",
  "Europe/Ljubljana": "SI", "Europe/Zagreb": "HR",
};

function detectCurrency(): string {
  try {
    const forced = new URLSearchParams(window.location.search).get("cur")?.toUpperCase();
    if (forced && RATES[forced]) return forced;
    const zoneName = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const zone = ZONE_REGION[zoneName] ?? (zoneName?.startsWith("Australia/") ? "AU" : undefined);
    if (zone) return REGION_CURRENCY[zone];
    for (const lang of navigator.languages ?? [navigator.language]) {
      const region = new Intl.Locale(lang).maximize().region;
      if (region && REGION_CURRENCY[region]) return REGION_CURRENCY[region];
    }
  } catch {
    /* fall back to dollars */
  }
  return "USD";
}

export const CURRENCY = detectCurrency();

// Live rates (open.er-api.com, no key, refreshed daily upstream), cached in the browser for 6 hours.
const RATES_URL = "https://open.er-api.com/v6/latest/USD";
const CACHE_KEY = "morph-rates-v1";
const CACHE_MS = 6 * 60 * 60 * 1000;
const listeners = new Set<() => void>();
let ratesVersion = 0;

function applyRate(rate: unknown) {
  if (typeof rate !== "number" || !isFinite(rate) || rate <= 0 || RATES[CURRENCY] === rate) return;
  RATES[CURRENCY] = rate;
  ratesVersion++;
  listeners.forEach((l) => l());
}

async function loadLiveRate() {
  if (CURRENCY === "USD") return;
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? "null");
    if (cached?.cur === CURRENCY && Date.now() - cached.at < CACHE_MS) return applyRate(cached.rate);
  } catch {
    /* no cache */
  }
  try {
    const res = await fetch(RATES_URL);
    const rate = (await res.json())?.rates?.[CURRENCY];
    applyRate(rate);
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ cur: CURRENCY, rate, at: Date.now() }));
    } catch {
      /* storage blocked */
    }
  } catch {
    /* offline or blocked: keep the fallback rate */
  }
}
void loadLiveRate();

/** Call in any component that shows prices so it re-renders when the live rate arrives. */
export const useRates = () =>
  useSyncExternalStore(
    (cb) => (listeners.add(cb), () => void listeners.delete(cb)),
    () => ratesVersion,
  );
const WHOLE = new Set(["JPY", "KRW", "IDR", "INR"]);

/** Formats a USD amount in the visitor's currency: "$27", "£21.60", "₹10,286" */
export const usd = (n: number) => {
  const v = n * RATES[CURRENCY];
  const whole = WHOLE.has(CURRENCY) || Number.isInteger(round2(v));
  return new Intl.NumberFormat(CURRENCY === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency: CURRENCY,
    currencyDisplay: CURRENCY === "USD" ? "symbol" : "narrowSymbol",
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(v);
};

export type Quote = {
  /** null = priced on request, 0 = free */
  perMonth: number | null;
  /** amount charged each billing cycle (one month, or one year up front) */
  charge: number | null;
  /** what a year costs on this billing period */
  perYear: number | null;
  /** how much a year of annual billing saves compared with paying monthly */
  yearlySaving: number;
  cycle: "month" | "year";
};

export function quote(plan: Plan, period: Period): Quote {
  const cycle = period === "yearly" ? "year" : "month";
  const m = plan.monthly;
  if (m === null) return { perMonth: null, charge: null, perYear: null, yearlySaving: 0, cycle };
  if (m === 0) return { perMonth: 0, charge: 0, perYear: 0, yearlySaving: 0, cycle };

  const annualPerMonth = round2((m * (100 - ANNUAL_SAVING)) / 100);
  const annualTotal = round2(annualPerMonth * 12);
  const yearlySaving = round2(m * 12 - annualTotal);

  return period === "yearly"
    ? { perMonth: annualPerMonth, charge: annualTotal, perYear: annualTotal, yearlySaving, cycle }
    : { perMonth: m, charge: m, perYear: round2(m * 12), yearlySaving, cycle };
}
