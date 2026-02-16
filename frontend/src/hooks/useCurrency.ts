import { useCallback } from "react";
import { useAuthStore } from "@/stores/authStore";

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "\u20AC",
  USD: "$",
  GBP: "\u00A3",
  XOF: "CFA",
  XAF: "FCFA",
};

const CURRENCY_LOCALES: Record<string, string> = {
  EUR: "fr-FR",
  USD: "en-US",
  GBP: "en-GB",
  XOF: "fr-FR",
  XAF: "fr-FR",
};

export function useCurrency() {
  const currency = useAuthStore((s) => s.companyCurrency);

  const symbol = CURRENCY_SYMBOLS[currency] ?? currency;
  const locale = CURRENCY_LOCALES[currency] ?? "fr-FR";

  const formatCurrency = useCallback(
    (value: number | string) => {
      const num = typeof value === "string" ? Number(value) : value;
      return num.toLocaleString(locale, {
        style: "currency",
        currency,
      });
    },
    [currency, locale],
  );

  const formatAmount = useCallback(
    (value: number | string) => {
      const num = typeof value === "string" ? Number(value) : value;
      return `${num.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${symbol}`;
    },
    [locale, symbol],
  );

  return { currency, symbol, locale, formatCurrency, formatAmount };
}
