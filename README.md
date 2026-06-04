# QuestLife

QuestLife is an AI-driven personal behavior data system that turns natural language input into structured goals, skills, execution logs, and feedback.

**Live Demo:** https://questlife-alpha-orpin.vercel.app

## Overview

QuestLife turns short, messy real-life inputs into structured behavior data and immediate feedback.

Core product loop:

```text
Natural language input
→ AI parsing
→ Guided completion
→ Goal / module / skill routing
→ Execution log
→ Progress feedback
→ Next action recommendation
```

Users can record actions through short inputs such as:

- Bench press 80kg 3x5
- Studied SQL for 20 minutes
- Played basketball
- Ate some chocolate

QuestLife decides whether an input should become a structured execution record, a completion prompt, or a non-execution observation.

## Core Features

### Natural Language Capture

Users can type short natural language records. QuestLife classifies the input, extracts useful fields, and determines whether the entry should become a structured execution record.

### Goal → Module → Skill Structure

QuestLife organizes behavior through a layered system:

```text
Goal
→ Module
→ Skill
→ ExecutionLog
→ Insight / Feedback
```

Example:

```text
Goal: Fitness
Module: Chest
Skill: Bench Press
ExecutionLog: 80kg × 5 × 3
```

### Guided Completion Flow

When information is incomplete, QuestLife opens a completion card instead of saving vague data.

The completion flow supports:

- suggested actions
- custom actions
- goal selection
- goal creation
- module selection
- module creation
- duration input
- quality rating
- performance fields such as weight, sets, reps, and RPE

### AI-Assisted Parsing

QuestLife integrates AI parsing through a server-side API route.

The parser supports:

- domain classification
- task / skill extraction
- goal and module suggestions
- completion schema generation
- structured execution entry generation
- local fallback logic when AI parsing fails or returns incomplete data

### Post-Save Progress Feedback

After saving a record, QuestLife generates immediate feedback, including:

- what was recorded
- goal / module / skill contribution
- first baseline detection
- comparison with previous records
- simple trend detection
- suggested next action

### Today Command Center

The Today page acts as a lightweight action dashboard.

It brings together:

- smart capture input
- latest feedback or pending completion
- current recommended action
- rescue mode for low-energy situations
- today’s plan
- current state
- recent execution records
- detailed data section

## Tech Stack

| Area | Technology |
| --- | --- |
| Frontend | React Native, Expo, TypeScript |
| Deployment | Vercel |
| Version Control | GitHub |
| AI Parsing | DeepSeek API |
| Storage | AsyncStorage |
| Architecture | Goal / Module / Skill / ExecutionLog data model |
| UI | Token-based theme system |

## System Architecture

```text
User Input
↓
Smart Capture
↓
AI Parse API / Local Fallback
↓
Completion Card
↓
Goal + Module Routing
↓
Skill Creation / Matching
↓
ExecutionLog Storage
↓
Progress Feedback
↓
Today Command Recommendation
↓
Insights
```

## Key Data Concepts

- **Goal:** A long-term direction or outcome, such as fitness, learning, or a project.
- **Module:** A meaningful sub-area inside a goal, such as Chest, Practice, or Frontend.
- **Skill:** A repeatable executable capability or action, such as Bench Press or SQL Practice.
- **ExecutionLog:** A structured record of what happened, including performance, duration, quality, and routing metadata.

Bench Press example:

```json
{
  "skillName": "Bench Press",
  "metricType": "performance_log",
  "structuredData": {
    "weight": 80,
    "sets": 3,
    "reps": 5
  },
  "qualityRating": 4
}
```

SQL example:

```json
{
  "skillName": "SQL",
  "metricType": "time_based",
  "durationMinutes": 20,
  "qualityRating": 3
}
```

## Current Status

QuestLife is an actively developed prototype.

Completed core flows include:

- natural language capture
- AI parsing
- guided completion
- custom action creation
- goal / module routing
- structured execution logging
- post-save progress feedback
- Today Command Center
- basic insights and trend analysis
- GitHub + Vercel deployment workflow

## Roadmap

Planned improvements:

- more accurate domain-specific completion templates
- better learning, coding, and sport-specific tracking fields
- richer progress visualization
- health data integration such as sleep and recovery signals
- more advanced AI-generated next-action recommendations
- better mobile UI polish
- cloud sync and user accounts
- exportable personal behavior data

## Why This Project Matters

QuestLife explores how personal behavior can be transformed into structured data.

The deeper loop is:

```text
Self-observation
→ Structured data
→ Feedback
→ Better decisions
→ Better execution
```

The project is an experiment in making everyday effort visible, comparable, and actionable without forcing users into rigid forms.
