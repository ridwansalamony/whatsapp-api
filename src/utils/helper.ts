export const sanitizeNumber = (to: string): string => to.replace(/\D/g, "");

export const buildJid = (number: string, type: "personal" | "group") => {
  const domain = type === "group" ? "g.us" : "c.us";
  return `${number}@${domain}`;
};
