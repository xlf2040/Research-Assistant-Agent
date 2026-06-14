<div align="center" id="top">

####

[English](README.md) | [中文](README-zh_CN.md)

</div>

# 🔎 Research Agent Assistant

**Research Agent Assistant is an open-source deep research agent designed for automated research tasks on both web and local documents, independently developed by Li Fengxiang.**

The agent generates detailed, factual, and unbiased research reports with citations. Research Agent Assistant provides a full suite of customization options to create tailor-made and domain-specific research agents. Inspired by the recent [Plan-and-Solve](https://arxiv.org/abs/2305.04091) and [RAG](https://arxiv.org/abs/2005.11401) papers, Research Agent Assistant addresses misinformation, speed, determinism, and reliability by offering stable performance and increased speed through parallelized agent work.

**Our mission is to empower individuals and organizations with accurate, unbiased, and factual information through AI.**

## Why Research Agent Assistant?

- Manual research tasks to form objective conclusions can take weeks, consuming significant resources and effort.
- LLMs trained on outdated data may hallucinate and are unsuitable for current research tasks.
- Current LLMs have token limitations that are insufficient for generating long-form research reports.
- Limited web sources in existing services lead to misinformation and shallow results.
- Selective web sources can introduce research bias.

## Architecture

The core idea is to utilize "Planner" and "Executor" agents. The Planner generates research questions, while the Executor agents collect relevant information. The Publisher then aggregates all findings into a comprehensive report.

Steps:
* Create task-specific agents based on research queries.
* Generate a series of questions that collectively form an objective view of the task.
* Use crawler agents to collect information for each question.
* Summarize and track sources for each resource.
* Filter and aggregate into a final research report.

## Features

- 📝 Generate detailed research reports using web and local documents.
- 🖼️ Smart image scraping and report filtering.
- 🍌 **AI-generated inline images** using Google Gemini (Nano Banana) to generate visualization illustrations.
- 📜 Generate detailed reports exceeding 2,000 words.
- 🌐 Aggregate over 20 sources to derive objective conclusions.
- 🖥️ Provide both lightweight (HTML/CSS/JS) and production-grade (NextJS + Tailwind) frontend versions.
- 🔍 JavaScript-enabled web scraping.
- 📂 Maintain memory and context throughout the research process.
- 📄 Export reports in multiple formats like PDF, Word, etc.

## ⚙️ Quick Start

### Installation

1. Install Python 3.11 or higher. [Reference Guide](https://www.tutorialsteacher.com/python/install-python).
2. Navigate to the project directory:

    ```bash
    cd research-agent
    ```

3. Set up API keys by exporting environment variables or saving to a `.env` file:

    ```bash
    export OPENAI_API_KEY={Your OpenAI API Key}
    export TAVILY_API_KEY={Your Tavily API Key}
    ```

    (Optional) For enhanced tracing and observability:

    ```bash
    # export LANGCHAIN_TRACING_V2=true
    # export LANGCHAIN_API_KEY={Your LangChain API Key}
    ```

    If using custom OpenAI-compatible APIs (e.g., local models, other service providers):

    ```bash
    export OPENAI_BASE_URL={Your custom API base URL}
    ```

4. Install dependencies and start the service:

    ```bash
    pip install -r requirements.txt
    python -m uvicorn main:app --reload
    ```

Visit [http://localhost:8000](http://localhost:8000) to get started.

For other environment setup methods (e.g., Poetry or virtual environments), please refer to the documentation within the project.

### Code Example

```python
...
from gpt_researcher import GPTResearcher

query = "Why is Nvidia stock rising?"
researcher = GPTResearcher(query=query)
# Conduct research on the given query
research_result = await researcher.conduct_research()
# Write report
report = await researcher.write_report()
...
```

### 🔧 MCP Client

Research Agent Assistant supports MCP integration to connect with specialized data sources like GitHub repositories, databases, and custom APIs, enabling hybrid research with data sources and web search.

```bash
export RETRIEVER=tavily,mcp  # Enable hybrid web + MCP research
```

```python
from gpt_researcher import GPTResearcher
import asyncio
import os

async def mcp_research_example():
    os.environ["RETRIEVER"] = "tavily,mcp"
    
    researcher = GPTResearcher(
        query="What are some good open-source web research agents?",
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

## 🍌 Inline Image Generation

Research Agent Assistant can automatically generate AI-created illustrations and embed them in your research reports using Google's Gemini models (Nano Banana).

```bash
# Enable in your .env file
IMAGE_GENERATION_ENABLED=true
GOOGLE_API_KEY=your_google_api_key
IMAGE_GENERATION_MODEL=models/gemini-2.5-flash-image
```

When enabled, the system will:
1. Analyze your research context to identify visualization opportunities
2. Pre-generate 2-3 relevant images during the research phase
3. Embed them inline as the report is written

Images are generated with dark-mode styling that matches the Research Agent Assistant UI, featuring professional infographic aesthetics with teal accents.

## ✨ Deep Research

Research Agent Assistant now includes Deep Research - an advanced recursive research workflow that explores topics with agentic depth and breadth. This feature employs a tree exploration pattern, maintaining a comprehensive perspective on the research topic while diving into subtopics.

- 🌳 Tree exploration with configurable depth and breadth
- ⚡️ Concurrent processing for faster speed
- 🤝 Intelligent context management across research branches
- ⏱️ Each deep research takes approximately 5 minutes

## Running with Docker

> **Step 1** - Install Docker

> **Step 2** - Copy the `.env.example` file, add your API keys to the copied file, and save it as `.env`

> **Step 3** - Comment out services you don't want to run via Docker in the docker-compose file.

```bash
docker-compose up --build
```

If the above command doesn't work, try running without the hyphen:

```bash
docker compose up --build
```

> **Step 4** - By default, this process will start 2 services:
 - Python service running on localhost:8000<br>
 - React app running on localhost:3000<br>

Visit localhost:3000 in your browser and start researching!

## 📄 Local Document Research

You can instruct Research Agent Assistant to run research tasks based on your local documents. Currently supported file formats: PDF, plain text, CSV, Excel, Markdown, PowerPoint, and Word documents.

Step 1: Add the environment variable `DOC_PATH` pointing to your document folder.

```bash
export DOC_PATH="./my-docs"
```

Step 2:
 - If running the frontend app on localhost:8000, simply select "My Documents" from the "Report Source" dropdown.
 - If using programmatically, pass the `report_source` argument as "local".

## 🤖 MCP Server

The Research Agent Assistant MCP Server enables AI applications like Claude to conduct deep research. While LLM apps can access web search tools with MCP, Research Agent Assistant MCP delivers deeper, more reliable research results.

Features:
- Provide deep research capabilities for AI assistants
- Obtain higher quality information through optimized context usage
- Deliver more comprehensive and higher quality reasoning results for LLMs
- Claude Desktop integration

## 👪 Multi-Agent Assistant

As AI evolves from prompt engineering and RAG to multi-agent systems, this project introduces a multi-agent assistant built on [LangGraph](https://python.langchain.com/v0.1/docs/langgraph/) and [AG2](https://github.com/ag2ai/ag2).

By using multi-agent frameworks and leveraging the collaborative work of multiple agents with specialized skills, the depth and quality of the research process can be significantly improved. Inspired by the [STORM](https://arxiv.org/abs/2402.14207) paper, this project demonstrates how AI agent teams can collaborate on research on a given topic from planning to publication.

Each run can generate research reports of 5-6 pages on average, supporting multiple formats such as PDF, Docx, and Markdown.

## 🔍 Observability

Research Agent Assistant supports **LangSmith** for enhanced tracing and observability, making it easier to debug and optimize complex multi-agent workflows.

To enable tracing:
1. Set the following environment variables:
   ```bash
   export LANGCHAIN_TRACING_V2=true
   export LANGCHAIN_API_KEY=your_api_key
   export LANGCHAIN_PROJECT="research-agent"
   ```
2. Run research tasks as usual. All LangGraph-based agent interactions will be automatically traced and visualized in the LangSmith dashboard.

## 🖥️ Frontend Application

Research Agent Assistant features an enhanced frontend to improve the user experience and streamline the research process. The frontend provides:

- Intuitive research query input interface
- Real-time progress tracking for research tasks
- Interactive presentation of research findings
- Customizable settings for a personalized research experience

Two deployment options:
1. Lightweight static frontend served by FastAPI
2. Feature-rich NextJS application with advanced capabilities

## ✉️ Contact

- Author Email: 2329427907@qq.com

## 🛡 Disclaimer

This project, Research Agent Assistant, is an experimental application provided "as-is" without any warranty, express or implied. We share code for academic purposes under the Apache 2 license. Nothing herein is academic advice, and NOT a recommendation to use in academic or research papers.

Our view on unbiased research claims:
1. The main goal of Research Agent Assistant is to reduce incorrect and biased facts. We assume that the more websites we scrape, the lower the probability of erroneous data. By scraping multiple websites for each research task and selecting the most common information, the probability of them all being wrong is extremely low.
2. We do not aim to eliminate bias; rather, we aim to reduce bias as much as possible. **We are here as a community to explore the most effective human/LLM interactions.**
3. In research, people can also easily be biased because most have their own views on the topics they research. This tool scrapes a variety of perspectives and will fairly explain diverse viewpoints that a biased person would never read.

---

<p align="right">
  <a href="#top">⬆️ Back to Top</a>
</p>
