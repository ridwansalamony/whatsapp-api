import app, { setupWhatsapp } from "./applications/app";
import db from "./applications/database";
import { PORT } from "./utils/env";

async function init() {
  try {
    const result = await db();
    console.log("Database status: ", result);

    await setupWhatsapp(); // ✅ inisialisasi client dulu

    app.listen(PORT, () => {
      console.log(`Server is listening on http://localhost:${PORT}`);
    });
  } catch (error) {
    const err = error as Error;
    console.error("❌ Initialization error:", err.message || err);
    process.exit(1);
  }
}

init();
