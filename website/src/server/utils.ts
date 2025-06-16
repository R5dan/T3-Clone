import { useTheme as useNextTheme } from "next-themes";

export function useTheme(defaultTheme : "dark" | "light"): ["dark" | "light", ReturnType<typeof useNextTheme>["setTheme"]] {
  const { theme, setTheme, systemTheme } = useNextTheme();

  if (theme === "system") {
    if (systemTheme) {
      return [systemTheme, setTheme] as const;
    } else {
      return [defaultTheme, setTheme] as const;
    }
  } else {
    if (theme) {
      return [theme, setTheme] as const;
    } else {
      return [defaultTheme, setTheme] as const;
    }
  }
}