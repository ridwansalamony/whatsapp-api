import mongoose from "mongoose";
import { DATABASE_URL } from "../utils/env";

const connect = async () => {
  try {
    await mongoose.connect(DATABASE_URL, {
      dbName: "latsar-tvri",
    });

    return Promise.resolve("database connected!");
  } catch (error) {
    const err = error as Error;
    return Promise.reject(err);
  }
};

export default connect;
