#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { main as installMain } from "./ai-development-system.mjs";
import { changeProject, readProjects, defaultRoots } from "../lib/projects.mjs";

const packageInfo = JSON.parse(
  await fs.readFile(new URL("../package.json", import.meta.url), "utf8"),
);
const help = `擎天 Qingtian ${packageInfo.version} · AI 驱动开发体系

  qingtian dashboard [--root <目录>] [--port <端口>] [--no-open]
      自动发现接入项目，打开跨项目大盘；--root 可重复指定。
  qingtian projects add <项目目录>
  qingtian projects remove <项目目录>
  qingtian projects list
      登记额外项目，或移除登记；自动扫描发现的项目仍会展示。
  qingtian install --target <项目目录> [--dry-run] [--agents=skip]
  qingtian check --target <项目目录>
  qingtian upgrade --target <项目目录> [--dry-run]
      接入、检查和升级；保留既有项目规则，拒绝覆盖受管文件改动。
  qingtian --version

Node.js 22.12+。默认扫描 ~/Projects 和当前目录；指定 --root 时覆盖默认根目录。
Ctrl+C 停止大盘。不会执行项目任务或修改项目的文档。`;

function openBrowser(url) {
  const [command, args] =
    process.platform === "darwin"
      ? ["open", [url]]
      : process.platform === "win32"
        ? ["rundll32", ["url.dll,FileProtocolHandler", url]]
        : ["xdg-open", [url]];
  const child = spawn(command, args, { stdio: "ignore", detached: true });
  child.on("error", () =>
    console.error("浏览器未能自动打开，请打开上方完整地址。"),
  );
  child.on("exit", (code) => {
    if (code) console.error("浏览器未能自动打开，请打开上方完整地址。");
  });
  child.unref();
}

async function main(argv) {
  const [action, ...args] = argv;
  if (!action || action === "--help" || action === "-h" || action === "help")
    return console.log(help);
  if (action === "--version" || action === "-v")
    return console.log(packageInfo.version);
  if (["install", "check", "upgrade"].includes(action)) {
    await installMain(argv);
    if (action !== "check" && !args.includes("--dry-run")) {
      try {
        await changeProject("add", args[args.indexOf("--target") + 1]);
      } catch (error) {
        console.error(`接入已完成，但项目登记失败：${error.message}`);
      }
    }
    return;
  }
  if (action === "projects") {
    const [operation, target, ...extra] = args;
    if (operation === "list" && !target)
      return console.log(
        (await readProjects()).join("\n") ||
          "没有登记项目；dashboard 仍会自动扫描。",
      );
    if (!["add", "remove"].includes(operation) || !target || extra.length)
      throw new Error(
        "用法：qingtian projects <add|remove> <项目目录>，或 projects list",
      );
    await changeProject(operation, target);
    return console.log(
      `${operation === "add" ? "已登记" : "已移除登记"}：${path.resolve(target)}`,
    );
  }
  if (action !== "dashboard")
    throw new Error(`未知命令：${action}。运行 qingtian --help 查看用法。`);
  const roots = [];
  let port = 0;
  let open = true;
  for (let index = 0; index < args.length; index++) {
    if (
      args[index] === "--root" &&
      args[index + 1] &&
      !args[index + 1].startsWith("--")
    )
      roots.push(path.resolve(args[++index]));
    else if (args[index] === "--port" && /^\d+$/.test(args[index + 1] || "")) {
      port = Number(args[++index]);
      if (port < 0 || port > 65535) throw new Error("端口须为 0～65535 的整数");
    } else if (args[index] === "--no-open") open = false;
    else throw new Error(`未知参数或缺少参数值：${args[index]}`);
  }
  const { startDashboard } = await import("../lib/dashboard.mjs");
  console.log("擎天大盘：正在读取项目产物…");
  const dashboard = await startDashboard({
    roots: roots.length ? roots : await defaultRoots(),
    port,
  });
  console.log(
    `擎天大盘已启动 · ${dashboard.snapshot.projects.length} 个项目 · ${dashboard.snapshot.documents.length} 份产物\n${dashboard.url}\nCtrl+C 停止服务。完整地址包含本次会话凭据，请仅在自己的浏览器使用。`,
  );
  if (open) openBrowser(dashboard.url);
  const stop = async () => {
    await dashboard.close();
    process.exit(0);
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
}

main(process.argv.slice(2)).catch((error) => {
  console.error(`ERROR: ${error.message}`);
  process.exitCode = 1;
});
