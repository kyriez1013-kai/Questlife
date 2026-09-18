// Supabase's browser persistence adapter; no native fallback to AsyncStorage.
export const sessionStorage = {
  async getItem(key: string) {
    return typeof window === "undefined"
      ? null
      : window.localStorage.getItem(key);
  },
  async setItem(key: string, value: string) {
    if (typeof window === "undefined")
      throw new Error("session_storage_unavailable");
    window.localStorage.setItem(key, value);
  },
  async removeItem(key: string) {
    if (typeof window !== "undefined") window.localStorage.removeItem(key);
  },
};
