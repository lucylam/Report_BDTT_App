import { cookies } from "next/headers";
import { THEME_COOKIE_NAME, isTheme, type Theme } from "@/lib/theme";

export const getInitialTheme = async (): Promise<Theme> => {
  const cookieStore = await cookies();
  const cookieTheme = cookieStore.get(THEME_COOKIE_NAME)?.value;
  return isTheme(cookieTheme) ? cookieTheme : "light";
};
