---
title: "Langraph Learning"
date: "2026-07-16"
description: "A short writting on the advantages of langraph on openai."
author: "Jiongjie"
tags:
  - "Agent"
  - "Langraph"
image: "/images/langgraph-logo.png"
---

# Introducion

最近在构建基于 agent 的后端项目时，发现随代码量逐渐增大，代码的可读性和可维护性变得越来越差。 client 的创建本身不是很便捷，如果再加上输出类型管理、历史管理、异常处理、工具调用等功能，代码会变得非常臃肿。对于简单的多轮对话可能还行，但如果加上多模态、多工具调用或者是不同格式混合输出，再结合上后端的业务逻辑就会非常复杂，最终很可能不得已变成 Vibe Coding 的屎山😇。

于是我尝试使用 `Langraph` 来构建我的 agent 项目。在初步阅读了 `Langraph` 的文档后，我发现比起称为 agent 构建工具，`Langraph` 更像是 agent 业务构建工具。如果只是有基本需求的话，给定的 api 已经足够快速构建一个支持多轮对话以及工具调用的 agent 了。

# Agent

```python
init_chat_model(
  model: str | None = None,
  *,
  model_provider: str | None = None,
  configurable_fields: Literal['any'] | list[str] | tuple[str, ...] | None = None,
  config_prefix: str | None = None,
  **kwargs: Any = {}
) -> BaseChatModel | _ConfigurableModel
```

```
create_react_agent(
  llm: BaseLanguageModel,
  tools: Sequence[BaseTool],
  prompt: BasePromptTemplate,
  output_parser: AgentOutputParser | None = None,
  tools_renderer: ToolsRenderer = render_text_description,
  *,
  stop_sequence: bool | list[str] = True
) -> Runnable
```

## Tool

通过这两个方法就已经可以构建一个比较完善的 agent, 对于工具方面, `@tool` 装饰器可以很容易将一个方法包装成工具，且相关输入输出的 schema 都会自动构建，相比原始的 `openai` sdk，就不需要写很多 pydantic model 去规范化一些格式了，整体也更加优雅。

## Memory

`Langraph` 提供了两种管理记忆的[方式](https://langgraph.com.cn/agents/memory/index.html#short-term-memory)。

一种是短期内存：
1. 在创建代理时提供 checkpointer。checkpointer 可以实现代理状态的持久性。
2. 在运行代理时在配置中提供 thread_id。thread_id 是对话会话的唯一标识符。

另一种是长期内存：
1. 配置一个存储以在调用之间持久化数据。
2. 使用 get_store 函数从工具或提示中访问存储。

# Graph

graph 是 Langraph 相比其他 agent 框架最不同的地方。它把业务的 workflow 抽象成了 graph, 其中每一个 Node 都代表了一种业务，共享一种 state, 彼此间由 edge 联系起来，构成了最终的 graph。这么看整体的管线十分清晰，而且由于 Node 并不强制需要和 agent 有关，那么和 ai 无关的业务层逻辑也可以放到其中一同构建最终的 graph。

例如，我可以在第一个 Node 里导入长期内存（session_id, history之类的数据），如果导入成功，则通过conditional_edges 进入第二个 Node 来处理多轮对话。这让整体业务流程变得很清晰，毕竟要改 workflow 只需在图中加新的节点即可。

# 与后端的结合

以 FastAPI 为例，假设已经得到一个编译完成的 `graph`，后端可以使用 FastAPI 将它作为全局对象或通过依赖注入的方式复用，在接口层先使用 Pydantic 定义请求模型，例如 `class ChatRequest(BaseModel): message: str; thread_id: str | None = None`，然后在普通请求接口中调用 `await graph.ainvoke(...)` 执行整个工作流，并从最终状态中提取文本后返回 JSON；

如果 graph 生成的是图像，可以让节点返回图片路径、对象存储 URL 或二进制数据，再分别使用 `FileResponse`、JSON 中的 URL 或 `StreamingResponse` 配合 `image/png`、`image/jpeg` 等 `media_type` 返回；

对于需要固定格式的结果，可以在 graph 的最后增加结构化输出节点，让模型按照预先定义的 Pydantic 模型生成结果，后端再进行校验，校验通过后通过 `response_model` 返回规范化 JSON，失败时则返回 `422` 或让 graph 重新生成，而不是直接信任模型输出的字符串；

如果需要流式输出，则可以使用 `graph.astream(...)` 或 `graph.astream_events(...)`，把每个节点产生的 token、状态更新或自定义事件转换成 SSE 数据，例如 `data: {"type":"token","content":"..."}`，再通过 FastAPI 的 `StreamingResponse` 持续推送给前端，同时处理客户端断开、异常、心跳、超时和任务取消等情况。

因此，整体结构通常是“Pydantic 请求模型 → 转换为 graph state → 使用 `ainvoke` 或 `astream` 执行编译完成的 graph → 根据结果类型选择 JSON、文件响应或 SSE → 统一处理鉴权、日志、异常和会话持久化”；其中 `thread_id`、用户 ID 或任务 ID 可以放在 FastAPI 的请求上下文以及 LangGraph 的 `configurable` 配置中，用于实现多轮对话、状态恢复和并发隔离。