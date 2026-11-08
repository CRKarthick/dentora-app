"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getClinicOptions, saveClinicOptions } from "../lib/settingsRepository";
import { defaultClinicOptions, type ClinicOptions } from "../lib/clinicOptions";

type ClinicOptionsContextValue = {
  options: ClinicOptions;
  isLoaded: boolean;
  addVisitType: (value: string) => void;
  removeVisitType: (value: string) => void;
  addPaymentMethod: (value: string) => void;
  removePaymentMethod: (value: string) => void;
  resetVisitTypes: () => void;
  resetPaymentMethods: () => void;
};

const ClinicOptionsContext = createContext<ClinicOptionsContextValue | null>(null);

function withUnique(list: string[], value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed || list.some((item) => item.toLowerCase() === trimmed.toLowerCase())) {
    return list;
  }
  return [...list, trimmed];
}

export function ClinicOptionsProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ClinicOptions>(defaultClinicOptions);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    getClinicOptions().then((stored) => {
      setOptions(stored);
      setIsLoaded(true);
    });
  }, []);

  const update = useCallback((next: ClinicOptions) => {
    setOptions(next);
    void saveClinicOptions(next);
  }, []);

  const addVisitType = useCallback(
    (value: string) => {
      update({ ...options, visitTypes: withUnique(options.visitTypes, value) });
    },
    [options, update],
  );

  const removeVisitType = useCallback(
    (value: string) => {
      update({
        ...options,
        visitTypes: options.visitTypes.filter((item) => item !== value),
      });
    },
    [options, update],
  );

  const addPaymentMethod = useCallback(
    (value: string) => {
      update({ ...options, paymentMethods: withUnique(options.paymentMethods, value) });
    },
    [options, update],
  );

  const removePaymentMethod = useCallback(
    (value: string) => {
      update({
        ...options,
        paymentMethods: options.paymentMethods.filter((item) => item !== value),
      });
    },
    [options, update],
  );

  const resetVisitTypes = useCallback(() => {
    update({ ...options, visitTypes: defaultClinicOptions.visitTypes });
  }, [options, update]);

  const resetPaymentMethods = useCallback(() => {
    update({ ...options, paymentMethods: defaultClinicOptions.paymentMethods });
  }, [options, update]);

  const value = useMemo<ClinicOptionsContextValue>(
    () => ({
      options,
      isLoaded,
      addVisitType,
      removeVisitType,
      addPaymentMethod,
      removePaymentMethod,
      resetVisitTypes,
      resetPaymentMethods,
    }),
    [
      options,
      isLoaded,
      addVisitType,
      removeVisitType,
      addPaymentMethod,
      removePaymentMethod,
      resetVisitTypes,
      resetPaymentMethods,
    ],
  );

  return (
    <ClinicOptionsContext.Provider value={value}>{children}</ClinicOptionsContext.Provider>
  );
}

export function useClinicOptions(): ClinicOptionsContextValue {
  const context = useContext(ClinicOptionsContext);
  if (!context) {
    throw new Error("useClinicOptions must be used within a ClinicOptionsProvider");
  }
  return context;
}

export default ClinicOptionsProvider;
