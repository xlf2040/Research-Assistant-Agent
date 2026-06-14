<div align="center" id="top">

####

[English](README.md) | [中文](README-zh_CN.md) | [日本語](README-ja_JP.md) | [한국어](README-ko_KR.md)

</div>

# 🔎 科研agent助手

**科研agent助手是一个开源的深度研究智能体，专为网页和本地文档的自动化研究任务而设计，由立峰项独立开发完成。**

该智能体生成详细、事实性、无偏见的研究报告并附带引用。科研agent助手提供完整的定制选项，可创建专属的领域特定研究智能体。受 [Plan-and-Solve](https://arxiv.org/abs/2305.04091) 和 [RAG](https://arxiv.org/abs/2005.11401) 论文启发，科研agent助手通过并行化智能体工作解决信息误导、速度、确定性和可靠性问题，提供稳定的性能和更快的处理速度。

**我们的使命是通过 AI 赋能个人和组织，获取准确、无偏见、事实性的信息。**

## 为什么选择科研agent助手？

- 手动研究的客观结论可能需要数周时间，耗费大量资源和精力。
- 基于过时数据训练的 LLM 可能产生幻觉，不适用于当前的研究任务。
- 当前 LLM 存在 token 限制，不足以生成长篇研究报告。
- 现有服务中有限的网络来源导致错误信息和浅薄结果。
- 选择性的网络来源可能引入研究偏见。

## 架构

核心理念是利用「规划器」和「执行器」智能体。规划器生成研究问题，而执行器智能体收集相关信息。发布器随后将所有发现汇总成一份全面的报告。

步骤：
* 基于研究查询创建任务特定智能体。
* 生成一系列共同形成对任务客观观点的问题。
* 使用爬虫智能体收集每个问题的信息。
* 总结并追踪每个资源的来源。
* 过滤并汇总成最终研究报告。

## 功能特性

- 📝 使用网页和本地文档生成详细的研究报告。
- 🖼️ 智能图片抓取和报告过滤。
- 🍌 **AI 生成的内嵌图片**，使用 Google Gemini (Nano Banana) 生成可视化插画。
- 📜 生成超过 2,000 字的详细报告。
- 🌐 聚合超过 20 个来源以得出客观结论。
- 🖥️ 提供轻量级（HTML/CSS/JS）和生产级（NextJS + Tailwind）两种前端版本。
- 🔍 JavaScript 启用的网页抓取。
- 📂 在整个研究过程中维护记忆和上下文。
- 📄 导出报告为 PDF、Word 等多种格式。
- 📚 **文献库管理** — 构建和管理个人本地参考文献库，支持 FAISS 向量索引、自动分类、受控词表和用户自定义标签。
- 📰 **论文投稿顾问** — 两阶段期刊推荐：通过 OpenAlex + Crossref API 发现候选期刊，再为论文初稿生成 16 个维度的修改报告。
- 🤖 **15+ 检索器支持** — 支持 Google、Bing、DuckDuckGo、arXiv、Semantic Scholar、PubMed Central、OpenAlex 等。

## ⚙️ 快速开始

### 安装

1. 安装 Python 3.11 或更高版本。[参考指南](https://www.tutorialsteacher.com/python/install-python)。
2. 进入项目目录：

    ```bash
    cd gpt-researcher
    ```

3. 设置 API 密钥，可通过环境变量导出或保存到 `.env` 文件：

    ```bash
    export OPENAI_API_KEY={你的 OpenAI API 密钥}
    export TAVILY_API_KEY={你的 Tavily API 密钥}
    ```

    （可选）如需增强追踪和可观测性：

    ```bash
    # export LANGCHAIN_TRACING_V2=true
    # export LANGCHAIN_API_KEY={你的 LangChain API 密钥}
    ```

    如果使用自定义 OpenAI 兼容 API（如本地模型、其他服务商）：

    ```bash
    export OPENAI_BASE_URL={你的自定义 API 基础 URL}
    ```

4. 安装依赖并启动服务：

    ```bash
    pip install -r requirements.txt
    python -m uvicorn main:app --reload
    ```

访问 [http://localhost:8000](http://localhost:8000) 开始使用。

如需其他环境搭建方式（如 Poetry 或虚拟环境），可参考项目内文档。

### 代码示例

```python
...
from gpt_researcher import GPTResearcher

query = "为什么英伟达股票在涨？"
researcher = GPTResearcher(query=query)
# 针对给定查询进行研究
research_result = await researcher.conduct_research()
# 撰写报告
report = await researcher.write_report()
...
```

### 🔧 MCP 客户端

科研agent助手支持 MCP 集成，可连接 GitHub 仓库、数据库和自定义 API 等专业数据源，实现数据源与网络搜索的混合研究。

```bash
export RETRIEVER=tavily,mcp  # 启用混合网页 + MCP 研究
```

```python
from gpt_researcher import GPTResearcher
import asyncio
import os

async def mcp_research_example():
    os.environ["RETRIEVER"] = "tavily,mcp"
    
    researcher = GPTResearcher(
        query="有哪些优秀的开源网页研究智能体？",
        mcp_configs=[
            {
                "name": "github",
                "command": "npx",
                "args": ["-y", "@modelcontextprotocol/server-github"],
                "env": {"GITHUB_TOKEN": os.getenv("GITHUB_TOKEN")}
            }
        ]
    )
    
    research_result = await researcher.conduct_research()
    report = await researcher.write_report()
    return report
```

## 🍌 内嵌图片生成

科研agent助手可以自动生成 AI 创作的插画并将其嵌入到你的研究报告中，使用 Google 的 Gemini 模型 (Nano Banana)。

```bash
# 在 .env 文件中启用
IMAGE_GENERATION_ENABLED=true
GOOGLE_API_KEY=your_google_api_key
IMAGE_GENERATION_MODEL=models/gemini-2.5-flash-image
```

启用后，系统将：
1. 分析研究上下文以识别可视化机会
2. 在研究阶段预先生成 2-3 张相关图片
3. 在撰写报告时以内嵌方式嵌入

图片采用深色模式样式生成，与科研agent助手 UI 风格匹配，具有专业的信息图表美学和蓝绿色调点缀。

## ✨ 深度研究

科研agent助手现已包含深度研究——一种高级递归研究工作流，以智能体的深度和广度探索主题。此功能采用树形探索模式，在深入子主题的同时保持对研究主题的全面视角。

- 🌳 可配置深度和广度的树形探索
- ⚡️ 并发处理以加快速度
- 🤝 跨研究分支的智能上下文管理
- ⏱️ 每次深度研究约需 5 分钟

## 📰 论文投稿顾问

专为研究人员设计的两阶段工作流，帮助您准备论文投稿：

### 第一阶段 — 期刊发现
- **多源期刊搜索**，使用 OpenAlex 和 Crossref API 查找与研究方向匹配的候选期刊。
- **LLM 驱动排名**，基于相关性、影响力、范围匹配和接收特征对期刊进行评分和排序。
- **优雅降级**，当外部 API 不可用时自动回退到纯 LLM 推荐。

### 第二阶段 — 修改指导
- **16 维度论文审查**，涵盖：格式规范、标题与摘要、关键词、引言质量、方法可复现性、结果与讨论、图表规范、文献引用、语法与拼写、专业术语、用词一致性、逻辑连贯性、必备声明、作者署名（含盲审安全检查）、匿名化检查、投稿信建议。
- **期刊特定投稿指南**，自动从目标期刊网站抓取（支持 24 小时磁盘缓存）。
- **带批注的修改报告**，以 Markdown 格式生成，精确定位论文中问题的行级别位置。
- **导出选项**：Markdown、PDF 和结构化 JSON 批注文件。

```bash
# 在前端使用：选择「论文投稿」作为报告类型
# 或以编程方式：
export REPORT_TYPE=paper_submission
```

修改报告通过 WebSocket 实时流式输出，先展示候选期刊卡片，随后呈现详细审查结果和可操作的修改建议。

## 📚 文献库管理

构建和管理您的个人参考文献库，并享受 AI 驱动的智能整理：

- **FAISS 向量索引** — 对所有存储文档进行全文语义搜索，支持增量索引合并和 SHA256 去重。
- **自动分类** — 每篇文献由 LLM 分析，生成一级领域、二级方向、5-10 个关键词和 200 字摘要。
- **受控词表** — 加载并校验自定义的学术领域分类体系，可通过 API 扩展。
- **用户标签** — 创建、编辑和颜色标注您的自定义标签，与系统词表完全解耦。
- **REST API** — 文档和标签的完整增删改查：上传、预览、重命名、重建索引、导出（JSON/CSV）。

```bash
# 设置文档存储路径
export DOC_PATH="./my-literature"
```

上传 PDF、Word 文档、Markdown 文件等，文献库自动索引、分类并整理，方便快速检索和研究。

## 使用 Docker 运行

> **步骤 1** - 安装 Docker

> **步骤 2** - 复制 `.env.example` 文件，将你的 API 密钥添加到复制的文件中，保存为 `.env`

> **步骤 3** - 在 docker-compose 文件中注释掉你不想通过 Docker 运行的服务。

```bash
docker-compose up --build
```

如果上述命令无效，尝试去掉横线运行：
```bash
docker compose up --build
```

> **步骤 4** - 默认情况下，此流程将启动 2 个服务：
 - Python 服务运行在 localhost:8000<br>
 - React 应用运行在 localhost:3000<br>

在浏览器中访问 localhost:3000，开始研究！

## 📄 本地文档研究

你可以指示科研agent助手基于本地文档运行研究任务。目前支持的文件格式：PDF、纯文本、CSV、Excel、Markdown、PowerPoint 和 Word 文档。

步骤 1：添加环境变量 `DOC_PATH` 指向你的文档所在文件夹。

```bash
export DOC_PATH="./my-docs"
```

步骤 2：
 - 如果在 localhost:8000 运行前端应用，只需从「报告来源」下拉选项中选择「我的文档」。
 - 如果以代码方式使用，传递 `report_source` 参数为 "local"。

## 🤖 MCP 服务

科研agent助手 MCP Server 使 Claude 等 AI 应用能够进行深度研究。虽然 LLM 应用可以通过 MCP 访问网络搜索工具，但科研agent助手 MCP 提供更深入、更可靠的研究结果。

功能特性：
- 为 AI 助手提供深度研究能力
- 通过优化上下文使用获得更高质量的信息
- 为 LLM 提供更全面、更优质推理的结果
- Claude Desktop 集成

## 👪 多智能体助手

随着 AI 从提示工程和 RAG 向多智能体系统演进，本项目引入基于 [LangGraph](https://python.langchain.com/v0.1/docs/langgraph/) 和 [AG2](https://github.com/ag2ai/ag2) 构建的多智能体助手。

通过使用多智能体框架，利用多个具备专业技能智能体的协同工作，研究过程的深度和质量可显著提升。受 [STORM](https://arxiv.org/abs/2402.14207) 论文启发，本项目展示了 AI 智能体团队如何协作完成从规划到出版的给定主题研究。

### 智能体团队角色

| 智能体 | 职责 |
|--------|------|
| **主编 (Chief Editor)** | 编排 LangGraph 状态图工作流，协调所有智能体。 |
| **编辑 (Editor)** | 规划研究大纲，管理并行研究任务执行。 |
| **研究员 (Researcher)** | 对每个子主题执行跨多源的深度网络搜索。 |
| **作者 (Writer)** | 根据风格指南撰写引言、结论和目录。 |
| **审稿人 (Reviewer)** | 依据指南审查草稿，提供结构化反馈。 |
| **修改者 (Reviser)** | 基于审稿人反馈修改草稿，返回详细修订笔记。 |
| **发布者 (Publisher)** | 输出 MD、PDF、DOCX 格式的最终报告。 |
| **人工 (Human)** | 通过 WebSocket 或控制台交互式审批研究计划。 |

工作流：`browser → planner → human → researcher → writer → reviewer → reviser → publisher`，内部包含 `reviewer ↔ reviser` 循环直至草稿通过审核。

平均每次运行可生成 5-6 页的研究报告，支持 PDF、Docx 和 Markdown 等多种格式。

## 🔍 可观测性

科研agent助手支持 **LangSmith** 进行增强的追踪和可观测性，使调试和优化复杂的多智能体工作流更加容易。

启用追踪：
1. 设置以下环境变量：
   ```bash
   export LANGCHAIN_TRACING_V2=true
   export LANGCHAIN_API_KEY=your_api_key
   export LANGCHAIN_PROJECT="gpt-researcher"
   ```
2. 照常运行研究任务。所有基于 LangGraph 的智能体交互将自动追踪并在 LangSmith 仪表板中可视化。

## 🖥️ 前端应用

科研agent助手配备增强前端以改善用户体验并简化研究流程。前端提供：

- 直观的研究查询输入界面
- 研究任务的实时进度追踪
- 研究发现的交互式展示
- 可定制设置以打造个性化研究体验

两种部署选项：
1. FastAPI 提供的轻量级静态前端
2. 功能丰富的 NextJS 应用，提供高级功能

## ✉️ 联系方式

- 作者邮箱：2329427907@qq.com

## 🛡 免责声明

本项目科研agent助手是一个实验性应用，按「原样」提供，不作任何明示或暗示的担保。我们基于 Apache 2 许可协议分享代码，仅供学术目的使用。本文内容不构成学术建议，也不建议用于学术或研究论文中。

我们对无偏见研究主张的看法：
1. 科研agent助手的主要目标是减少不正确和有偏见的事实。我们假设抓取的网站越多，错误数据的可能性就越小。通过为每项研究抓取多个网站并选择最常见的信息，它们全部出错的概率极低。
2. 我们不旨在消除偏见；而是尽可能减少偏见。**我们在此作为一个共同体，探索最有效的人/LLM 交互方式。**
3. 在研究中，人们也容易产生偏见，因为大多数人对他们所研究的主题已有自己的看法。本工具抓取多种观点，并会公正地解释一个带有偏见的人永远不会读到的多样化视角。

---

<p align="right">
  <a href="#top">⬆️ 回到顶部</a>
</p>
