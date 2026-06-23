import { env } from "../config/env.js";
import { createApp } from "./createApp.js";

const app = createApp();

app.listen(env.port, () => {
  console.log(`Server running on http://localhost:${env.port}`);
});

export default app;
