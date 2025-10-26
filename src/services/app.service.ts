import { getClient } from "../applications/app";
import { sanitizeNumber, buildJid } from "../utils/helper";

export type TSendMessages = {
  to: string;
  message: string;
};

const sendMessage = async (payload: TSendMessages, type: "personal" | "group") => {
  const to = sanitizeNumber(payload.to);
  const jid = buildJid(to, type);
  const client = getClient();

  return await client.sendMessage(jid, payload.message);
};

export default {
  async sendPersonal(payload: TSendMessages) {
    return sendMessage(payload, "personal");
  },

  async sendGroup(payload: TSendMessages) {
    return sendMessage(payload, "group");
  },

  async getGroups() {
    const client = getClient();
    const chats = await client.getChats();

    return chats.filter((chat: any) => chat.isGroup).map((g: any) => ({ id: g.id._serialized, name: g.name }));
  },
};
