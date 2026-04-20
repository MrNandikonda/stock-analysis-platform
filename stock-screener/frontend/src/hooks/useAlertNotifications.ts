import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

export const useAlertNotifications = () => {
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      void Notification.requestPermission();
    }
  }, []);

  const alertQuery = useQuery({
    queryKey: ["alerts", "check"],
    queryFn: api.evaluateAlerts,
    refetchInterval: 60_000,
    staleTime: 20_000,
    retry: false,
  });

  useEffect(() => {
    const data = alertQuery.data;
    if (!data || !data.triggered.length) {
      return;
    }
    if (!("Notification" in window) || Notification.permission !== "granted") {
      return;
    }
    data.triggered.forEach((entry) => {
      const symbol = String(entry.symbol ?? "");
      const condition = String(entry.condition ?? "");
      const target = String(entry.target_value ?? "");
      new Notification(`Alert triggered for ${symbol}`, {
        body: `${condition} (${target})`,
      });
    });
  }, [alertQuery.data]);
};
