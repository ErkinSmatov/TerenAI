import {
  createContext,
  ReactNode,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";

type Registry = {
  setHeader: (node: ReactNode) => void;
  setClaimed: (claimed: boolean) => void;
};

// Шапка прокручивается вместе с контентом: ScreenHeader регистрирует свой
// узел в ближайшем ScreenMain, а ScreenMainScrollView выводит его первым
// элементом внутри ScrollView. Если ScrollView на экране нет, ScreenMain
// сам рисует шапку сверху (как раньше).
const RegistryContext = createContext<Registry | null>(null);
const HeaderNodeContext = createContext<ReactNode>(null);

export function ScreenHeaderProvider({ children }: { children: ReactNode }) {
  const [header, setHeader] = useState<ReactNode>(null);
  const [claimed, setClaimed] = useState(false);

  const registry = useMemo<Registry>(
    () => ({ setHeader, setClaimed }),
    []
  );

  return (
    <RegistryContext.Provider value={registry}>
      <HeaderNodeContext.Provider value={header}>
        {!claimed && header}
        {children}
      </HeaderNodeContext.Provider>
    </RegistryContext.Provider>
  );
}

export function useScreenHeaderRegistry() {
  return useContext(RegistryContext);
}

export function useScreenHeaderNode() {
  return useContext(HeaderNodeContext);
}

export function useClaimScreenHeader() {
  const registry = useContext(RegistryContext);
  const header = useContext(HeaderNodeContext);
  const setClaimed = registry?.setClaimed;

  useLayoutEffect(() => {
    setClaimed?.(true);
    return () => setClaimed?.(false);
  }, [setClaimed]);

  return registry ? header : null;
}

export function useRegisterScreenHeader(node: ReactNode) {
  const registry = useContext(RegistryContext);
  const setHeader = registry?.setHeader;

  useLayoutEffect(() => {
    setHeader?.(node);
  });

  useLayoutEffect(() => {
    return () => setHeader?.(null);
  }, [setHeader]);

  return registry !== null;
}
