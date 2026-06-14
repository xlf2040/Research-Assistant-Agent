# 🔍 科研agent助手 MCP Server

## Overview

The 科研agent助手 MCP Server enables AI assistants like Claude to conduct comprehensive web research and generate detailed reports via the Machine Conversation Protocol (MCP).

## Why 科研agent助手 MCP?

While LLM apps can access web search tools with MCP, **科研agent助手 MCP delivers deep research results.** Standard search tools return raw results requiring manual filtering, often containing irrelevant sources and wasting context window space.

科研agent助手 autonomously explores and validates numerous sources, focusing only on relevant, trusted and up-to-date information. Though slightly slower than standard search, it delivers:

* ✨ Higher quality information
* 📊 Optimized context usage
* 🔎 Comprehensive results
* 🧠 Better reasoning for LLMs

## Features

### Resources
* `research_resource`: Get web resources related to a given task via research.

### Primary Tools
* `deep_research`: Performs deep web research on a topic, finding reliable and relevant information
* `quick_search`: Performs a fast web search optimized for speed over quality 
* `write_report`: Generate a report based on research results
* `get_research_sources`: Get the sources used in the research
* `get_research_context`: Get the full context of the research
