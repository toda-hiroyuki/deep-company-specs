import { createContext, useCallback, useContext, useState } from "react";
import { AlertModal, type AlertButton } from "../components/AlertModal";

type AlertFn = (
  title: string,
  message?: string,
  buttons?: AlertButton[]
) => void;

const AlertContext = createContext<AlertFn>(() => {});

export function useAlert(): AlertFn {
  return useContext(AlertContext);
}

interface AlertState {
  visible: boolean;
  title: string;
  message?: string;
  buttons: AlertButton[];
}

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AlertState>({
    visible: false,
    title: "",
    buttons: [],
  });

  const alert: AlertFn = useCallback((title, message, buttons) => {
    setState({
      visible: true,
      title,
      message,
      buttons: buttons ?? [{ text: "OK" }],
    });
  }, []);

  const dismiss = useCallback(() => {
    setState((prev) => ({ ...prev, visible: false }));
  }, []);

  return (
    <AlertContext.Provider value={alert}>
      {children}
      <AlertModal
        visible={state.visible}
        title={state.title}
        message={state.message}
        buttons={state.buttons}
        onDismiss={dismiss}
      />
    </AlertContext.Provider>
  );
}
