---
name: development-step-tracing
description: 仅在项目显式开启开发阶段标记插件时，展示已由Lifecycle确定的开发流程和阶段；不拥有阶段编排或完成判断。
---

# 开发阶段标记（可选插件）

## 开关与边界

默认关闭，由项目根AGENTS.md的项目自有段落保存开关，安装/升级不自动开启。开启行：

```text
- Qingtian 插件 development-step-tracing：开启
```

关闭时把“开启”改为“关闭”，或删除该配置行。下一任务/恢复时读取新配置；任务中用户明确开关立即生效。不得写进体系受管段落、锁文件或单次进度摘要。配置不清晰时沿Lifecycle的关闭处理，不自行猜测。其它项目的开启不影响当前项目。

这是由AI遵循的输出插件，不是拦截模型输出的程序，不保证每次模型执行都无遗漏。遗漏时从当前真实阶段恢复标记，不补造过去阶段。

## 输出合同

只复用Lifecycle已经判断的flow和phase，附在原本需要发送的用户可见消息首行、项目规定前缀之后，不额外发消息：

- 开始任务且flow已确定：`[flow:standard][step:task-understanding]`（值按真实分类替换）。
- flow尚未确定：先只写`[step:task-understanding]`；冻结flow后首次阶段转换补一次flow。
- 阶段转换：`[step:implementation]`、`[step:validation]`等；同一阶段普通进度不重复。
- 返工返回旧阶段：再次标真实目标阶段，不伪造跳过的阶段。
- 恢复任务：从原任务记录核flow/phase，在第一条有意义的接续消息标当前阶段；无法确认则先理解核查，不能按最近提交猜阶段。
- 收尾：标当前真实阶段并说明完成/未完成边界，不把`step`当完成凭证。已经处于同一阶段时不重复标记。

允许flow：`initialization`、`standard`、`trivial`、`bugfix`。允许phase：`task-understanding`、`design`、`implementation`、`validation`、`review`、`delivery`、`retrospective`。方案与实现审查都用review，正文注明mode。每条消息最多一个flow和一个step；示例和引用不得在首行伪装成真实标记。

## 与其它模块的关系

只展示阶段，不采集Token、不创建任务ID、不读取会话日志或自动启动大盘。项目已有其它阶段观察器时，不输出重复标记；由项目确定唯一观察器，未明确时报告冲突并暂停本插件输出，继续原开发流程。

开关检查归Lifecycle，具体输出合同只归本文。开发阶段、授权、Review、交付、复盘和整体完成仍归原owner；社媒运营等非开发任务不套用开发phase，也不替代它们的启动模板。
