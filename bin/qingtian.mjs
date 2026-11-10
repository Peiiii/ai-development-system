#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { main as installMain } from "./ai-development-system.mjs";
import { changeProject, readProjects, defaultRoots } from "../lib/projects.mjs";
import { canonicalReadRoots, readProjectFile, readerUrl } from "../lib/reader.mjs";

const packageInfo = JSON.parse(
  await fs.readFile(new URL("../package.json", import.meta.url), "utf8"),
);
const help = `擎天 Qingtian ${packageInfo.version} · AI 驱动开发体系

  qingtian dashboard [--root <目录>] [--port <端口>] [--no-open] [--watch] [--require-token]
      打开当前项目大盘，可切换其它接入项目；--root 可重复指定。
      本机默认直接访问；--require-token 按需启用会话 token 鉴权。
      --watch 监听当前 CLI 的前端文件，CSS 即时更新，JS/HTML 自动刷新。
  qingtian read <文件.md> [--root <目录>] [--port <端口>] [--no-open]
      直接阅读项目文件，不扫描索引；支持链接跳转和代码高亮。
      默认端口 4318；已有阅读服务时复用并输出新文档链接。
  qingtian projects add <项目目录>
  qingtian projects remove <项目目录>
  qingtian projects list
      登记额外项目，或移除登记；自动扫描发现的项目仍会展示。
  qingtian install --target <项目目录> [--dry-run] [--agents=skip]
  qingtian check --target <项目目录> [--readiness]
  qingtian upgrade --target <项目目录> [--dry-run]
      接入、检查和升级；默认初始化阶段展示，保留明确开关；--readiness 核规则入口和展示配置，宿主加载仍需真实验证。
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
  const reading = action === "read";
  const file = reading && args[0] && !args[0].startsWith("--") ? path.resolve(args.shift()) : null;
  if (reading && !file) throw new Error("用法：qingtian read <文件.md> [--port <端口>] [--no-open]");
  if (action !== "dashboard" && !reading)
    throw new Error(`未知命令：${action}。运行 qingtian --help 查看用法。`);
  const roots = [];
  let port = reading ? 4318 : 0;
  let open = true;
  let livePreview = false;
  let requireToken = false;
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
    else if (args[index] === "--watch") livePreview = true;
    else if (args[index] === "--require-token") requireToken = true;
    else throw new Error(`未知参数或缺少参数值：${args[index]}`);
  }
  if (reading && livePreview) throw new Error("read 模式不使用 --watch；点击刷新读取文件最新内容");
  const scanRoots = roots.length ? roots : await defaultRoots(reading ? path.dirname(file) : process.cwd());
  if (reading && port && !requireToken) {
    let running = false;
    const origin = `http://127.0.0.1:${port}`;
    try {
      const response = await fetch(`${origin}/api/reader-info`, {signal: AbortSignal.timeout(700)});
      running = response.ok && (await response.json()).service === "qingtian";
    } catch {}
    if (running) {
      const response = await fetch(`${origin}/api/read?path=${encodeURIComponent(file)}`);
      if (!response.ok) throw new Error((await response.json()).error);
      const url = origin + readerUrl(file);
      console.log(`文档阅读 · 复用本机服务\n${url}`);
      if (open) openBrowser(url);
      return;
    }
  }
  if (reading) await readProjectFile(file, await canonicalReadRoots([...scanRoots, ...await readProjects()]));
  const { startDashboard } = await import("../lib/dashboard.mjs");
  console.log(reading ? "正在启动文档阅读服务…" : "擎天大盘：正在读取项目产物…");
  const dashboard = await startDashboard({
    roots: scanRoots,
    port,
    currentDirectory: process.cwd(),
    livePreview,
    requireToken,
    readerOnly: reading,
  });
  if (reading) {
    const url = dashboard.origin + readerUrl(file) + (dashboard.token ? `#token=${dashboard.token}` : "");
    console.log(`文档阅读已启动\n${url}\n仅监听本机；Ctrl+C 停止服务。`);
    if (open) openBrowser(url);
  } else {
    console.log(
      `擎天大盘已启动 · ${dashboard.snapshot.projects.length} 个项目 · ${dashboard.snapshot.projects.reduce((sum, project) => sum + project.documentCount, 0)} 份产物 · ${dashboard.snapshot.projects.reduce((sum, project) => sum + project.knowledgeCount, 0)} 份知识 · ${dashboard.snapshot.skills.length} 个 Skill\n${dashboard.url}\nCtrl+C 停止服务。${requireToken ? "已开启 token 鉴权，请使用上方完整地址。" : "仅监听本机，直接打开上方地址即可。"}`,
    );
    if (livePreview) console.log("实时预览已开启：修改前端后自动更新；Ctrl+C 停止监听。");
    if (open) openBrowser(dashboard.url);
  }
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
