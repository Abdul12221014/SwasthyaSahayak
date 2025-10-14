export const debug = (...args: any[]) => {
  if (import.meta.env.VITE_FRONTEND_DEBUG === "1") {
    // eslint-disable-next-line no-console
    console.log("[FE]", ...args);
  }
};
