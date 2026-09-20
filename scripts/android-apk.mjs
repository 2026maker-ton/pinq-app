import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const lan = process.argv.includes("--lan");
const jdk21 = "C:\\Program Files\\Java\\jdk-21";
const jdk = existsSync(jdk21) ? jdk21 : (process.env.JAVA_HOME || jdk21);
const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || path.join(os.homedir(), "AppData", "Local", "Android", "Sdk");

function lanAddress() {
  const nets = os.networkInterfaces();
  for (const list of Object.values(nets)) {
    for (const info of list || []) {
      if (info.internal || info.family !== "IPv4") continue;
      const [a, b] = info.address.split(".").map(Number);
      const privateNet = a === 10 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31);
      if (privateNet) return info.address;
    }
  }
  throw new Error("사설 LAN IPv4를 찾지 못했습니다. REACT_APP_RECOMMEND_API_URL을 직접 지정하세요.");
}

const recommendUrl = lan
  ? `http://${lanAddress()}:3001/api/recommend`
  : process.env.REACT_APP_RECOMMEND_API_URL || "http://10.0.2.2:3001/api/recommend";
process.env.REACT_APP_RECOMMEND_API_URL = recommendUrl;
process.env.JAVA_HOME = jdk;
process.env.ANDROID_HOME = sdk;
process.env.ANDROID_SDK_ROOT = sdk;
process.env.Path = `${jdk}\\bin;${sdk}\\platform-tools;${process.env.Path || process.env.PATH || ""}`;

function run(command, args, cwd = root) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
      shell: true,
      env: process.env,
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited ${code}`));
    });
  });
}

console.log(`추천 API: ${recommendUrl}`);
console.log(`JAVA_HOME: ${jdk}`);
await run("npx", ["react-scripts", "build"]);
await run("npx", ["cap", "sync", "android"]);
await run(process.platform === "win32" ? "gradlew.bat" : "./gradlew", ["assembleDebug"], path.join(root, "android"));
console.log(path.join(root, "android", "app", "build", "outputs", "apk", "debug", "app-debug.apk"));
