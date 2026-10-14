---
name: integrate-ai-development-system
description: Install or upgrade Qingtian, a reusable AI Development System, in the user's code repository.
---

# Integrate Qingtian

Canonical source: <https://ai-dev.nextclaw.io/SKILL.md>

Qingtian is a reusable AI Development System. This skill is a handoff for an AI coding agent with network access, a shell, Node.js 20+, and permission to edit the target repository. It installs a shared development lifecycle, stage skills, and supporting methods into a project. The current native layout targets Codex and other agents that honor `AGENTS.md` plus `.agents/skills`. Reading this URL alone does not install files or make an unrelated agent tool discover those skills.

The system has three responsibilities: flow constraints choose the path and completion gates; stage and scenario Skills guide execution; Wiki holds project facts and information shared by Skills. Read the [architecture Wiki](https://ai-dev.nextclaw.io/wiki/system-architecture.md) when adapting the system or explaining its ownership. Project facts must come from the target repository, not from this generic bundle. Its [artifact Wiki](https://ai-dev.nextclaw.io/wiki/artifact-traceability.md) explains traceable designs, plans, review evidence, and logs; do not create empty documents solely to satisfy a pattern. Its early evolution loop is documented in the [evolution Wiki](https://ai-dev.nextclaw.io/wiki/evolution.md).

## Identify the target

Use the repository the user asked you to integrate. Read its existing agent instructions and inspect `git status` first. If several repositories are plausible, ask which one is the target. Preserve its existing project-specific rules and unrelated working changes.

## Get the source snapshot

Download the archive from <https://ai-dev.nextclaw.io/download/ai-development-system.tar.gz> into a temporary directory. The expected SHA-256 is:

```text
{{BUNDLE_SHA256}}
```

Verify the downloaded archive against that exact value before extracting it. On macOS, `shasum -a 256`; on Linux, `sha256sum` works. The archive contains `manifest.json`, `payload/`, and the Node installer at `bin/ai-development-system.mjs`. Do not pipe a network response directly into a shell. Inspect the included `README.md` and manifest if you need to resolve a target conflict.

For example, in a POSIX shell:

```sh
ads_tmp_dir=$(mktemp -d)
curl -fsSL https://ai-dev.nextclaw.io/download/ai-development-system.tar.gz -o "$ads_tmp_dir/source.tar.gz"
# Verify the SHA-256 shown above before the next command.
tar -xzf "$ads_tmp_dir/source.tar.gz" -C "$ads_tmp_dir"
node "$ads_tmp_dir/bin/ai-development-system.mjs" install --target /absolute/path/to/project --dry-run
```

## Install or upgrade

- If `.agents/ai-development-system.lock.json` does not exist, review the dry-run and run `install --target <absolute-repo-path>`.
- If the lock exists, run `check --target <absolute-repo-path>`. If the user asked to update, review `upgrade --target <absolute-repo-path> --dry-run`, then run `upgrade`.
- The installer refuses to overwrite conflicting project files or locally edited managed files. Stop on a conflict, report the paths, and decide with the user or existing project instructions how those rules should be owned. Do not force-copy the payload.
- `install --agents=skip` is only for a repository whose existing root `AGENTS.md` already routes to `development-lifecycle`; otherwise use the default managed `AGENTS.md` block.

After installation or upgrade, run `check --target <absolute-repo-path> --readiness` and inspect the target's Git diff. This checks payload integrity, the Lifecycle route and a single project-owned tracing configuration. Install/upgrade initializes tracing when absent, preserves explicit on/off choices and rejects conflicting configuration before writing; skip mode never edits project rules, so missing routing/configuration must be resolved explicitly. The installer never commits or pushes the target repository.

Verify the actual host discovery path: reload the project's rules in a new or refreshed agent context, then confirm the first real work response carries its truthful stage marker (same-stage progress and final responses must also carry one). Do not start a dummy product task or send another conversation a message for this check. Report file integration and runtime loading separately; if this context cannot reload or observe another host, record runtime verification as pending rather than claiming all sessions now comply. Include the files changed, sourceDigest, tracing choice and remaining host adaptation.

Tell the user they can now request development work normally, without naming Qingtian in each prompt. For a later update, they can ask the AI to update Qingtian in this project; repeat the preview, upgrade, and check steps. Do not add CI jobs, build scripts, or runtime dependencies to the target project solely for Qingtian.

For an agent tool that does not load `AGENTS.md` and `.agents/skills` natively, treat the installed files as source material and establish that tool's actual discovery path before claiming integration works. Do not silently edit a different AI tool's global settings.

## Optional cross-project dashboard

Installing or upgrading this snapshot also installs `.agents/wiki/skills/tools/qingtian-dashboard/SKILL.md` and its shared AGENTS route. When the user says “帮我打开擎天大盘” or asks to open the AI development system dashboard, read that Skill and execute through a verified usable local URL. Previously installed projects need a shared-system upgrade to receive this entry.

The Node.js 22.12+ CLI can open a local read-only dashboard of installed projects. Install `@nextclaw/qingtian` from npm or the npm-compatible archive published alongside this snapshot (see the homepage for its version and checksum), then run `qingtian dashboard`. Use `qingtian projects add /absolute/path/to/project` for repositories outside the default scan roots. The CLI reuses the same install/check/upgrade implementation and existing lock files. The dashboard reads project documents; it does not execute project tasks or confirm host scheduling. Installing the shared rules does not require installing the dashboard runtime.
