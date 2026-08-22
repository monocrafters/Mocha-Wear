"use client";

import { useEffect, useState } from "react";
import { lookupOrders, openOrderCount, ORDERS_EVENT, readOrdersCache } from "@/lib/orders";

export function useOpenOrderCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    function fromCache() {
      setCount(openOrderCount(readOrdersCache()));
    }
    fromCache();
    lookupOrders()
      .then((items) => setCount(openOrderCount(items)))
      .catch(() => fromCache());
    window.addEventListener(ORDERS_EVENT, fromCache);
    return () => window.removeEventListener(ORDERS_EVENT, fromCache);
  }, []);

  return count;
}
