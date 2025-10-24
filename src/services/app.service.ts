import { getClient } from "../applications/app";
import { TSendMessages } from "../controllers/app.controller";

export default {
  async send(payload: TSendMessages) {
    // simple sanitize: hapus spasi, tanda plus
    const to = payload.to.replace(/\D/g, ""); // hanya digit
    const jid = `${to}@c.us`;

    const client = getClient();

    try {
      const result = await client.sendMessage(jid, payload.message);

      return result;
    } catch (err) {
      console.error("Service send error:", err);
      // lempar error agar controller bisa menampilkannya
      throw err;
    }
  },
};
