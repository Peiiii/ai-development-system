# npm OIDC 无人值守发布

当前结果：首次信任已授权，0.1.22 已通过 GitHub OIDC 发布并完成公开包摘要、幂等重跑及 registry 隔离安装验收。下文保留接入过程中的历史阻塞与修正。

## 目标与约束

用户要求把发布改为不依赖长期 Token、无需逐次人工介入的自动流程，并由 AI 完成接入、发布与验收。原 0.1.22 官网包已测试并上线，npm 尚未完成。沿用[设计](../../designs/2026-11-25-npm-trusted-publishing.design.md)与[计划](../../plans/2026-11-25-npm-trusted-publishing.plan.md)，全程单代理，不修改 NextClaw 产品发布或原私有认证。

## 实现与方案 Review

20:22（Asia/Shanghai）开始。workflow 将发布控制提交与被发布源码分开，环境分支策略限定 main；只授予 contents:read 和 id-token:write，固定 actions 提交。安装包身份、幂等与 registry 核对归单一脚本，不把业务散落在 workflow。每次由 AI dispatch，不要求人工批准环境或暂存包。

0.1.22 使用源码 `585fba75eeb8f419c01cfbb8b21a4777d6ae1f30`、已受测归档 SHA256 `deb1006587d295a25bfac050e531a77f8579227d3d2963f9e66467365a255070`；新发布脚本不混入该包。跨提交旧产物关闭自动 provenance，避免把后续 workflow 提交误标成包源码；摘要与完整文件字节核对保留。当前 Agent Review 已覆盖权限、源码与 tarball 身份、工作流分支、原版本重跑和传播失败，不代表 npm trust 已建立。

## 验证与接入进度

发布脚本已验证 npm 10 与 npm 12 的实际 JSON 返回形态；npm 12 改为以包名为 key 的对象，已在同一解析边界归一化。真实 npm 产物、错误摘要、正确摘要但源码改变均有定向测试；原 85 文件安装包另做完整只读验收。具体最终测试、GitHub environment、npm trust 和运行结果在实际执行后补充。

npm `trust list` 在当前登录下返回 EOTP，说明首次配置仍受账号认证约束。此为实际接入检查结果，不把本地登录成功当作 OIDC 已生效，也不降低或关闭账号二次验证。

## 实际检查与实现 Review

41 项仓库测试、3 项 npm 12 下的 artifact 合同测试、原 85 文件包的完整只读验收、actionlint 与 56 文件规则检查均通过。GitHub `npm-production` environment 已创建，reviewers 为空、无等待时间，部署分支策略只允许 main。当前 Agent 复核工作流调用、固定 action SHA、短效 OIDC 权限、源码与已测试包的一致性及 registry 幂等，无未关闭 finding。具体见 [verification.json](verification.json)。

npm 一次性信任接入和真实发布仍待执行；不能把以上检查当作发布成功。

## 真实 CI 与外部阻塞

- 发布控制已提交推送：`2169313`，随后 `cfc0c75` 将冻结源码验证放在发布端 npm 升级之前，保留源码原验证基线；npm 12 仅用于现代 OIDC 发布端和其合同测试。
- 已实际执行 `npm trust github`，指定包 `@nextclaw/qingtian`、仓库 `Peiiii/ai-development-system`、文件 `npm-publish.yml`、环境 `npm-production`、直接 publish 权限。npm 返回 EOTP，首次登记未成功；未创建长期 Token、未关闭 2FA，也未改变 NextClaw 的私有认证或产品流水线。
- 已 dispatch [run 45615211484](https://github.com/Peiiii/ai-development-system/actions/runs/45615211484)。main 历史约束、源码依赖安装与全部原测试、现代 npm 安装、发布端合同测试均成功；最后在实际 npm 发布时返回 ENEEDAUTH。没有匹配的 npm 端信任授权，OIDC 不能完成发布。
- GitHub 环境已回读：无 reviewer、无等待，只允许 main。GitHub 配置本身没有人工审批阻塞；剩余阻塞位于 npm 账号端的首次授权。

## 首次受阻时的交付边界与复盘

自动化实现、GitHub 环境与前置验证已完成；无人值守发布尚不能标记为启用，0.1.22 的 registry 发布也未完成。用户要求不再重复介入，未再发起人工接管或要求重复安全密钥；没有绕过账号的强制验证。

首次授权不能由未受信任的 workflow 自己给自己授予。当前认证返回 EOTP，正常权限下无法自主完成这一外部前置条件；后续应在首次信任登记实际成功后重跑同一 workflow，无需更换包、源码、hash 或增加长期 Token。OIDC 成功必须以 registry 真实产物与受测摘要一致验收。

本轮复盘已将“源码验证基线与发布端工具升级分开”落在原 workflow，npm JSON 返回形态差异收敛于发布 owner；没有向共享开发阶段或 AGENTS 追加规则。当前不新增进一步通用规则。

## 首次受阻后的公开状态核对

官网内容部署版本 `612cf5a1-90c1-4228-920e-7488e13d7975` 已生效。当前能力原文与网页及五份原公开安装入口/归档/摘要共七文件均逐字节匹配受测构建，原 0.1.22 安装包没有重新生成或替换；官网明确显示首次 npm 信任登记未完成。

20:40（Asia/Shanghai）再次公开查询 registry，0.1.22 仍返回 E404。未将已完成的源码、环境、检查或官网交付写成 npm 发布成功。没有新增长期 Token、没有关闭账号 2FA、没有为该接入新增人工审批环境，也没有要求用户再操作。

记录更新：2026-11-25 20:41（Asia/Shanghai）。

## 首次信任成功与传播期修正

20:48（Asia/Shanghai）用户完成首次授权，npm CLI 实际返回 trust 创建成功：`ebbaa998-ad3f-40d5-a878-c527ed7c98e8`，权限含 publish 与 stage publish，仓库、workflow 和 environment 与设计一致。账号授权阻塞已解除；上文 EOTP/ENEEDAUTH 是先前尝试的历史状态。

[授权后 run 45617350796](https://github.com/Peiiii/ai-development-system/actions/runs/45617350796)实际使用 OIDC 成功上传，npm 返回版本接受和异步处理提示。最初 35 秒回读窗口到期导致运行失败，不能把上传接受当作下载验收通过。随后公开版本元数据已出现，`_npmUser` 为 GitHub Actions，并包含该 trust ID；tarball 尚处于传播期。

`d432d51` 修正唯一发布 owner：等待窗口扩至五分钟，区分元数据可见而 tarball 尚未可下载，保留已有版本避免重复上传，摘要不匹配仍立即失败。两项传播与损坏反例通过，仓库测试共 43 项通过。已启动 [run 45618413622](https://github.com/Peiiii/ai-development-system/actions/runs/45618413622)继续真实回读验收，不再要求用户介入。

## 发布与真实安装验收完成

20:56（Asia/Shanghai）公开 tarball 回读成功，SHA256 为 `deb1006587d295a25bfac050e531a77f8579227d3d2963f9e66467365a255070`，与原 85 文件受测包完全一致。版本元数据的发布者是 GitHub Actions，trust ID 与首次登记一致。[run 45618413622](https://github.com/Peiiii/ai-development-system/actions/runs/45618413622)全部步骤成功，已有版本走 `already-published` 并回读实际字节，没有重复上传。

20:57 从公开 registry 按 `@nextclaw/qingtian@0.1.22` 进行隔离 npm 安装、dry-run 零登记、实际 install/check/upgrade、项目规则保留、包内 Skill 路由和大盘浏览器 smoke 全部通过，页面错误为空。完整结果在 verification.json。

当前 Review：唯一发布 owner 已覆盖真实观察到的 npm 传播顺序，版本元数据可见时避免重复上传，缺失 tarball 仅等待，摘要不符仍失败；43 项仓库测试通过，无未关闭 finding。首次账号授权由用户完成一次，后续该 GitHub workflow 无需长期 Token、逐次安全密钥或环境人工审批。NextClaw 产品认证与流水线仍未改动，不将本仓库接入外推为其它包已迁移。

官网最终内容版本 `bf32ab10-84b6-4dec-ad36-d00a03a9c80a` 已生效，当前 Wiki 与文档网页及五份原安装入口/归档/摘要共七文件逐字节回读通过，原 0.1.22 包未重建。公开 registry 的 latest 已核对为 0.1.22。
