import { PrismaClient, UserRole, ContentStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const BCRYPT_COST = 12;

async function seedModules(
  trackId: string,
  modules: Array<{ order: number; title: string; description: string; estimatedMinutes: number; passingScore?: number }>,
) {
  return Promise.all(
    modules.map((m) =>
      prisma.module.upsert({
        where: { trackId_order: { trackId, order: m.order } },
        update: { title: m.title, description: m.description, estimatedMinutes: m.estimatedMinutes },
        create: { trackId, ...m, passingScore: m.passingScore ?? 60 },
      }),
    ),
  );
}

async function seedConcepts(
  moduleId: string,
  concepts: Array<{ order: number; title: string; description: string }>,
) {
  return Promise.all(
    concepts.map((c) =>
      prisma.concept.upsert({
        where: { moduleId_order: { moduleId, order: c.order } },
        update: { title: c.title, description: c.description },
        create: { moduleId, ...c },
      }),
    ),
  );
}

async function main(): Promise<void> {
  console.log('🌱 Seeding BBT LearnOS database...');

  // ─── Tracks ──────────────────────────────────────────────────────────────────

  const t1 = await prisma.track.upsert({ where: { slug: 'genai-agentic-ai' }, update: { title: 'GenAI + Agentic AI', description: 'Master LLMs, prompt engineering, RAG pipelines, LangGraph, AutoGen, and LLMOps. Build production-grade AI agents aligned to AWS, Anthropic, and Databricks certifications.', icon: '🤖' }, create: { slug: 'genai-agentic-ai', title: 'GenAI + Agentic AI', description: 'Master LLMs, prompt engineering, RAG pipelines, LangGraph, AutoGen, and LLMOps. Build production-grade AI agents aligned to AWS, Anthropic, and Databricks certifications.', icon: '🤖', trackNumber: 1, isActive: true } });
  const t2 = await prisma.track.upsert({ where: { slug: 'cloud-mlops' }, update: { title: 'Cloud + MLOps', description: 'Docker, Kubernetes, CI/CD pipelines, MLflow, SageMaker, and Azure ML. Ship and monitor ML models at scale on AWS or Azure.', icon: '☁️' }, create: { slug: 'cloud-mlops', title: 'Cloud + MLOps', description: 'Docker, Kubernetes, CI/CD pipelines, MLflow, SageMaker, and Azure ML. Ship and monitor ML models at scale on AWS or Azure.', icon: '☁️', trackNumber: 2, isActive: true } });
  const t3 = await prisma.track.upsert({ where: { slug: 'odoo-erp-development' }, update: { title: 'Odoo ERP Development', description: 'Custom Odoo module development with Python ORM, QWeb, and Owl JS. Build ERP automations and integrations for Pakistan and MENA clients. Internship at bigbinaryerp.com.', icon: '🏢' }, create: { slug: 'odoo-erp-development', title: 'Odoo ERP Development', description: 'Custom Odoo module development with Python ORM, QWeb, and Owl JS. Build ERP automations and integrations for Pakistan and MENA clients. Internship at bigbinaryerp.com.', icon: '🏢', trackNumber: 3, isActive: true } });
  const t4 = await prisma.track.upsert({ where: { slug: 'ai-integrated-fullstack' }, update: { title: 'AI-Integrated Full Stack', description: 'Next.js 15, NestJS, Supabase, pgvector, Vercel AI SDK, and WebSockets. Build full-stack AI products from scratch and deploy them to production.', icon: '⚡' }, create: { slug: 'ai-integrated-fullstack', title: 'AI-Integrated Full Stack', description: 'Next.js 15, NestJS, Supabase, pgvector, Vercel AI SDK, and WebSockets. Build full-stack AI products from scratch and deploy them to production.', icon: '⚡', trackNumber: 4, isActive: true } });
  const t5 = await prisma.track.upsert({ where: { slug: 'cybersecurity' }, update: { title: 'Cybersecurity', description: 'Offensive and defensive security with HTB, Kali Linux, SIEM, and MITRE ATT&CK. Aligned to HTB CPTS, CWES, CDSA, and CompTIA Security+ certifications.', icon: '🛡️' }, create: { slug: 'cybersecurity', title: 'Cybersecurity', description: 'Offensive and defensive security with HTB, Kali Linux, SIEM, and MITRE ATT&CK. Aligned to HTB CPTS, CWES, CDSA, and CompTIA Security+ certifications.', icon: '🛡️', trackNumber: 5, isActive: true } });
  const t6 = await prisma.track.upsert({ where: { slug: 'ui-ux-brand-design' }, update: { title: 'UI/UX + Brand Design', description: 'Figma, WCAG 2.2, design systems, Webflow, and AI design tools. Specialise in UX Research, Design Systems, or AI UX to land senior roles faster.', icon: '🎨' }, create: { slug: 'ui-ux-brand-design', title: 'UI/UX + Brand Design', description: 'Figma, WCAG 2.2, design systems, Webflow, and AI design tools. Specialise in UX Research, Design Systems, or AI UX to land senior roles faster.', icon: '🎨', trackNumber: 6, isActive: true } });
  const t7 = await prisma.track.upsert({ where: { slug: 'ai-marketing-sales' }, update: { title: 'AI Marketing + Sales', description: 'Meta Ads, Google Ads, HubSpot, Apollo.io, Clay, Salesforce Einstein AI, and Shopify. The shortest track — 8 weeks to a job in growth, sales, or e-commerce.', icon: '📈' }, create: { slug: 'ai-marketing-sales', title: 'AI Marketing + Sales', description: 'Meta Ads, Google Ads, HubSpot, Apollo.io, Clay, Salesforce Einstein AI, and Shopify. The shortest track — 8 weeks to a job in growth, sales, or e-commerce.', icon: '📈', trackNumber: 7, isActive: true } });
  const t8 = await prisma.track.upsert({ where: { slug: 'networking-infrastructure' }, update: { title: 'Networking + Infrastructure', description: 'Cisco CCNA-aligned networking from foundations to automation. TCP/IP, OSPF, BGP, firewalls, VPN, and Python automation. Cisco NetAcademy affiliated — up to 58% exam voucher discount.', icon: '🌐' }, create: { slug: 'networking-infrastructure', title: 'Networking + Infrastructure', description: 'Cisco CCNA-aligned networking from foundations to automation. TCP/IP, OSPF, BGP, firewalls, VPN, and Python automation. Cisco NetAcademy affiliated — up to 58% exam voucher discount.', icon: '🌐', trackNumber: 8, isActive: true } });

  console.log('✅ 8 tracks ready');

  // ─── Track 01 — GenAI + Agentic AI (14 weeks) ────────────────────────────────

  const genaiModules = await seedModules(t1.id, [
    { order: 1, title: 'Python for AI + LLM Foundations', description: 'Python 3.12 essentials, OpenAI and Anthropic API setup, tokenisation, embeddings, and the transformer architecture. Understand how LLMs actually work under the hood.', estimatedMinutes: 180 },
    { order: 2, title: 'Prompt Engineering', description: 'Zero-shot, few-shot, chain-of-thought, tree-of-thought, and system prompts. Prompt injection and jailbreaking. Building reliable prompt pipelines.', estimatedMinutes: 120 },
    { order: 3, title: 'RAG Pipelines', description: 'Vector stores with Pinecone and FAISS, document loaders with LlamaIndex, embedding strategies, and retrieval-augmented generation end-to-end.', estimatedMinutes: 150 },
    { order: 4, title: 'LangChain Agents + Function Calling + MCP', description: 'LangChain agent patterns, tool use, function calling with the OpenAI API, and the Model Context Protocol (MCP) for connecting agents to external systems.', estimatedMinutes: 120 },
    { order: 5, title: 'Agentic AI: LangGraph, AutoGen, CrewAI', description: 'Multi-agent orchestration with LangGraph state machines, AutoGen conversation loops, and CrewAI role-based crews. Build agents that plan, delegate, and self-correct.', estimatedMinutes: 150 },
    { order: 6, title: 'Fine-tuning: HuggingFace, PEFT, LoRA, W&B', description: 'Dataset preparation, parameter-efficient fine-tuning with LoRA and QLoRA, training on HuggingFace, and experiment tracking with Weights & Biases.', estimatedMinutes: 120 },
    { order: 7, title: 'LLMOps: LangSmith, Arize Phoenix, MLflow', description: 'Tracing and evaluation with LangSmith, production monitoring with Arize Phoenix, model tracking with MLflow. Prompt versioning and per-call cost tracking.', estimatedMinutes: 90 },
    { order: 8, title: 'Production Deployment: FastAPI + Docker + AWS Lambda', description: 'Serving LLM applications with FastAPI, containerising with Docker, deploying serverless on AWS Lambda and as containerised APIs on AWS.', estimatedMinutes: 90 },
    { order: 9, title: 'Communication + Technical Writing', description: 'Business English for tech, code review presentations, technical writing for documentation and proposals. Stage 2 of the BBT programme structure.', estimatedMinutes: 60 },
    { order: 10, title: 'HR Grooming + Exam Prep', description: 'LinkedIn profile build, CV polish, mock interviews with AI feedback. Exam prep for AWS AI Practitioner (AIF-C01), AWS ML Engineer Associate (MLA-C01), or Databricks GenAI Engineer Associate. Stage 3–5.', estimatedMinutes: 90 },
  ]);

  await seedConcepts(genaiModules[0].id, [
    { order: 1, title: 'What are Large Language Models?', description: 'History from RNNs to transformers, scale laws, and what makes GPT-4, Claude, and Gemini different from earlier models.' },
    { order: 2, title: 'Tokenisation and Embeddings', description: 'BPE tokenisation, token costs, embedding vectors, cosine similarity, and why embeddings power semantic search.' },
    { order: 3, title: 'Transformer Architecture Overview', description: 'Self-attention, multi-head attention, positional encoding, and how decoder-only models generate tokens autoregressively.' },
    { order: 4, title: 'OpenAI API + Anthropic API Setup', description: 'API keys, the Chat Completions format, streaming responses, and making your first structured API call in Python.' },
  ]);

  await seedConcepts(genaiModules[1].id, [
    { order: 1, title: 'Zero-shot and Few-shot Prompting', description: 'Instruction-only prompts vs. providing examples. When few-shot helps and when it hurts. Formatting your examples well.' },
    { order: 2, title: 'Chain-of-Thought and Tree-of-Thought', description: 'Reasoning step-by-step, self-consistency voting, and tree-of-thought exploration for complex problem solving.' },
    { order: 3, title: 'System Prompts and Role Prompting', description: 'Structuring system vs. user vs. assistant turns. Giving models a persona, constraints, and output format instructions.' },
    { order: 4, title: 'Prompt Injection and Safety', description: 'Jailbreaking techniques, prompt injection attacks, output guardrails, and how to defend your applications.' },
  ]);

  await seedConcepts(genaiModules[2].id, [
    { order: 1, title: 'Vector Stores: Pinecone and FAISS', description: 'Indexing embeddings for fast approximate nearest-neighbour search. Pinecone managed service vs FAISS for local/on-prem deployments.' },
    { order: 2, title: 'Document Loaders and Text Splitting', description: 'Loading PDFs, CSVs, and web pages with LlamaIndex loaders. Chunking strategies: fixed-size, recursive, and semantic splitting.' },
    { order: 3, title: 'RAG Pipeline End-to-End', description: 'Embedding → store → retrieval → prompt injection → generation. Evaluating retrieval quality with precision@k and recall metrics.' },
  ]);
  await seedConcepts(genaiModules[3].id, [
    { order: 1, title: 'LangChain Agents and Tool Use', description: 'ReAct agents that reason and act. Defining tools as Python functions, binding them to an LLM, and observing the action loop.' },
    { order: 2, title: 'OpenAI Function Calling', description: 'Structured tool calls via JSON schema, parallel function calling, and extracting structured data from unstructured text.' },
    { order: 3, title: 'Model Context Protocol (MCP)', description: 'The MCP standard for connecting AI agents to external data sources and tools. Building MCP servers and registering them with Claude.' },
  ]);
  await seedConcepts(genaiModules[4].id, [
    { order: 1, title: 'LangGraph State Machines', description: 'Defining stateful agent workflows as directed graphs. Nodes, edges, conditional routing, and human-in-the-loop interrupts.' },
    { order: 2, title: 'AutoGen Conversation Loops', description: 'Multi-agent conversations with AutoGen. User proxy, assistant, and code executor agents collaborating to solve tasks.' },
    { order: 3, title: 'CrewAI Role-Based Crews', description: 'Defining agent roles, backstories, and goals in CrewAI. Sequential vs hierarchical task execution across a crew.' },
  ]);
  await seedConcepts(genaiModules[5].id, [
    { order: 1, title: 'LoRA and QLoRA Fine-Tuning', description: 'Low-Rank Adaptation for parameter-efficient fine-tuning. QLoRA quantised fine-tuning on consumer GPUs with 4-bit precision.' },
    { order: 2, title: 'HuggingFace Datasets and Trainer', description: 'Loading and formatting instruction datasets. Using the Trainer API and SFTTrainer for supervised fine-tuning runs.' },
    { order: 3, title: 'Weights & Biases Experiment Tracking', description: 'Logging loss curves, hyperparameters, and model checkpoints to W&B. Comparing runs and sweeping hyperparameters automatically.' },
  ]);
  await seedConcepts(genaiModules[6].id, [
    { order: 1, title: 'LangSmith Tracing and Evaluation', description: 'Capturing every LLM call, chain step, and tool invocation with LangSmith. Building automated evaluators for accuracy and faithfulness.' },
    { order: 2, title: 'Prompt Versioning and Regression Testing', description: 'Managing prompt templates as versioned artifacts. Running regression suites when prompts change to catch quality regressions.' },
    { order: 3, title: 'Per-Call Cost and Latency Tracking', description: 'Measuring token usage, cost, and p95 latency per LLM call. Identifying the most expensive chains and optimising them.' },
  ]);
  await seedConcepts(genaiModules[7].id, [
    { order: 1, title: 'FastAPI for LLM Applications', description: 'Async FastAPI routes for streaming LLM responses. SSE (Server-Sent Events) for real-time token streaming in the browser.' },
    { order: 2, title: 'Containerising with Docker', description: 'Writing Dockerfiles for Python AI apps. Multi-stage builds, CUDA base images for GPU inference, and Docker Compose for local dev.' },
    { order: 3, title: 'Deploying to AWS Lambda and ECS', description: 'Serverless LLM endpoints on AWS Lambda with function URLs. Container-based deployments on ECS Fargate for persistent APIs.' },
  ]);
  await seedConcepts(genaiModules[8].id, [
    { order: 1, title: 'Technical Writing for AI Engineers', description: 'Writing clear API documentation, architecture decision records (ADRs), and project proposals for AI systems.' },
    { order: 2, title: 'Code Review Presentations', description: 'Presenting diffs to senior engineers. Explaining trade-offs, test coverage, and migration risks clearly and concisely.' },
    { order: 3, title: 'Business English for Tech Professionals', description: 'Email etiquette, meeting participation, async written communication, and presenting technical results to non-technical stakeholders.' },
  ]);
  await seedConcepts(genaiModules[9].id, [
    { order: 1, title: 'AWS AI Practitioner Exam Prep (AIF-C01)', description: 'AI/ML fundamentals on AWS. Covering SageMaker, Bedrock, and responsible AI concepts aligned to the AWS AIF-C01 exam domains.' },
    { order: 2, title: 'LinkedIn Profile and GitHub Portfolio', description: 'Crafting an AI engineer LinkedIn headline and summary. Pinning and presenting GitHub projects with clear READMEs and demos.' },
    { order: 3, title: 'Mock Technical Interviews', description: 'LeetCode warm-up, system design for AI applications, and behavioural questions. AI-powered mock interview practice with feedback.' },
  ]);

  console.log('✅ GenAI + Agentic AI track: 10 modules');

  // ─── Track 02 — Cloud + MLOps (12 weeks) ─────────────────────────────────────

  const cloudModules = await seedModules(t2.id, [
    { order: 1, title: 'Containerisation with Docker', description: 'Dockerfile best practices, multi-stage builds, Docker Compose for multi-service ML apps, and pushing to AWS ECR and Azure ACR.', estimatedMinutes: 120 },
    { order: 2, title: 'Kubernetes and AKS Orchestration', description: 'Pods, Deployments, Services, Ingress controllers, Helm charts for ML workloads. Horizontal pod autoscaling and rolling updates.', estimatedMinutes: 150 },
    { order: 3, title: 'CI/CD: GitHub Actions and Azure DevOps', description: 'Building ML pipelines as code. Automated testing, model validation gates, Docker image builds, and deployment triggers on merge.', estimatedMinutes: 120 },
    { order: 4, title: 'ML Pipelines: MLflow and Kubeflow / Azure ML', description: 'Experiment tracking with MLflow, pipeline orchestration with Kubeflow on Kubernetes or Azure ML Pipelines. Model registry and artifact management.', estimatedMinutes: 120 },
    { order: 5, title: 'Monitoring: Prometheus, Grafana, and Alerting', description: 'Scraping metrics from ML services, building Grafana dashboards for model latency and error rates, alert rules and notification channels.', estimatedMinutes: 90 },
    { order: 6, title: 'LLMOps: LangSmith, Arize Phoenix, Cost Tracking', description: 'Production observability for LLM applications. Prompt versioning, per-call latency and token cost tracking, regression testing for prompts.', estimatedMinutes: 90 },
    { order: 7, title: 'AWS Path: SageMaker, Glue, CloudWatch, ArgoCD', description: 'SageMaker Pipelines for end-to-end ML, AWS Glue for data prep, CloudWatch for infrastructure monitoring, ArgoCD for GitOps deployments.', estimatedMinutes: 150 },
    { order: 8, title: 'Azure Path: Azure ML, OpenAI Service, Data Factory, ArgoCD', description: 'Azure ML Studio managed compute, Azure OpenAI Service deployment, Data Factory for ETL, and ArgoCD GitOps on AKS.', estimatedMinutes: 150 },
    { order: 9, title: 'Internal Dev Platform: Backstage IDP', description: 'Building a developer portal with Backstage. Software catalogue, tech radar, and self-service scaffolding for ML teams.', estimatedMinutes: 90 },
    { order: 10, title: 'Communication + HR Grooming + Exam Prep', description: 'Technical communication for cloud engineers. Exam prep for AWS SAA-C03, DOP-C02, MLA-C01 (AWS path) or AZ-104, AZ-400, DP-100, AI-200 (Azure path). Stage 2–5.', estimatedMinutes: 90 },
  ]);

  await seedConcepts(cloudModules[0].id, [
    { order: 1, title: 'Container vs Virtual Machine', description: 'Why containers replaced VMs for ML workloads. Namespaces, cgroups, and the Docker daemon.' },
    { order: 2, title: 'Writing Your First Dockerfile', description: 'Base image selection, COPY vs ADD, RUN layers, ENV, EXPOSE, and ENTRYPOINT vs CMD.' },
    { order: 3, title: 'Docker Compose for Multi-Service Apps', description: 'Defining model server, feature store, and database services. Health checks, depends_on, and shared volumes.' },
    { order: 4, title: 'Container Registries: ECR and ACR', description: 'Pushing and pulling images, IAM policies for ECR, and automated builds from GitHub Actions.' },
  ]);

  await seedConcepts(cloudModules[1].id, [
    { order: 1, title: 'Pods, Deployments, and Services', description: 'The K8s object hierarchy. Writing YAML for Deployments and ClusterIP vs LoadBalancer Services.' },
    { order: 2, title: 'Kubernetes Ingress and TLS', description: 'NGINX Ingress Controller, path-based routing, and Let\'s Encrypt TLS termination for ML APIs.' },
    { order: 3, title: 'Helm Charts for ML Models', description: 'Packaging model servers as Helm charts. Values files for environment-specific config, upgrades and rollbacks.' },
    { order: 4, title: 'Horizontal Pod Autoscaling', description: 'CPU/memory-based HPA, custom metrics with Prometheus Adapter, and scaling ML inference under load.' },
  ]);

  await seedConcepts(cloudModules[2].id, [
    { order: 1, title: 'GitHub Actions Workflows', description: 'Writing YAML workflows, trigger events (push, PR, schedule), caching dependencies, and matrix builds for multi-version testing.' },
    { order: 2, title: 'ML Pipeline Stages as Code', description: 'Data validation, training, evaluation, and registration stages in a CI/CD pipeline. Failing pipelines on metric regressions.' },
    { order: 3, title: 'Automated Docker Builds and Push', description: 'Building and tagging Docker images in CI, pushing to ECR/ACR on merge, and triggering rolling deployments automatically.' },
  ]);
  await seedConcepts(cloudModules[3].id, [
    { order: 1, title: 'MLflow Experiment Tracking', description: 'Logging parameters, metrics, and artifacts in MLflow. Comparing runs in the UI and promoting the best model to the registry.' },
    { order: 2, title: 'Kubeflow Pipelines', description: 'Defining ML pipelines as Python functions with the KFP SDK. Compiling to YAML and running on a Kubeflow cluster.' },
    { order: 3, title: 'Model Registry and Lifecycle', description: 'Staging → production promotion workflows. Version aliases, deployment approval gates, and rollback to previous model versions.' },
  ]);
  await seedConcepts(cloudModules[4].id, [
    { order: 1, title: 'Prometheus Metrics for ML Services', description: 'Instrumenting Python APIs with the prometheus_client library. Exposing prediction latency, error rates, and model version metrics.' },
    { order: 2, title: 'Grafana Dashboards', description: 'Building dashboards from Prometheus and Loki data. Row panels, stat panels, and time-series graphs for model health monitoring.' },
    { order: 3, title: 'Alert Rules and On-Call', description: 'Writing Prometheus alerting rules for p95 latency and error rate. Routing alerts to PagerDuty/Opsgenie and writing runbooks.' },
  ]);
  await seedConcepts(cloudModules[5].id, [
    { order: 1, title: 'LangSmith in Production', description: 'Tracing all LLM calls from production services to LangSmith. Setting sampling rates and filtering sensitive data from traces.' },
    { order: 2, title: 'Token Cost Tracking at Scale', description: 'Aggregating token usage per customer and feature. Setting cost alerts and implementing token budgets in high-traffic services.' },
    { order: 3, title: 'Prompt Regression Suites', description: 'Versioning prompts as code, running automated evals on every merge, and catching quality regressions before they reach production.' },
  ]);
  await seedConcepts(cloudModules[6].id, [
    { order: 1, title: 'SageMaker Pipelines', description: 'Defining end-to-end ML workflows as SageMaker Pipeline DAGs. Processing, training, evaluation, and conditional registration steps.' },
    { order: 2, title: 'AWS Glue for Data Preparation', description: 'Serverless ETL with Glue jobs and crawlers. Data Catalog, Glue DataBrew for visual data prep, and Glue workflows.' },
    { order: 3, title: 'ArgoCD GitOps Deployments', description: 'Declarative Kubernetes deployments with ArgoCD. App of apps pattern, sync waves, and automated rollback on health check failure.' },
  ]);
  await seedConcepts(cloudModules[7].id, [
    { order: 1, title: 'Azure ML Managed Compute', description: 'Compute clusters, compute instances, and serverless inference in Azure ML. Submitting training jobs and registering models.' },
    { order: 2, title: 'Azure OpenAI Service Deployment', description: 'Deploying GPT-4o and text-embedding models via Azure OpenAI. Managing quota, private endpoints, and responsible AI content filters.' },
    { order: 3, title: 'Azure Data Factory ETL Pipelines', description: 'Building data pipelines with ADF linked services, datasets, and activities. Trigger-based scheduling and monitoring pipeline runs.' },
  ]);
  await seedConcepts(cloudModules[8].id, [
    { order: 1, title: 'Backstage Software Catalog', description: 'Registering services, libraries, and ML models as catalog entities. Writing catalog-info.yaml and navigating the Backstage UI.' },
    { order: 2, title: 'Tech Radar and Adoption Tracking', description: 'Defining your organisation\'s technology radar with Assess, Trial, Adopt, and Hold rings for ML tools and frameworks.' },
    { order: 3, title: 'Self-Service Scaffolding Templates', description: 'Creating Backstage Software Templates for ML projects. One-click project bootstrapping with pre-configured CI/CD and monitoring.' },
  ]);
  await seedConcepts(cloudModules[9].id, [
    { order: 1, title: 'AWS Solutions Architect Exam Prep (SAA-C03)', description: 'Core AWS service domains covered in SAA-C03. High availability patterns, cost optimisation, and the well-architected framework.' },
    { order: 2, title: 'Azure Administrator Exam Prep (AZ-104)', description: 'Managing Azure identities, virtual networks, storage, and compute. AZ-104 exam domains and study resources.' },
    { order: 3, title: 'MLOps Portfolio and GitHub Profile', description: 'Showcasing MLOps projects on GitHub. Pinning pipeline repos, writing architecture diagrams with Mermaid, and LinkedIn headline optimisation.' },
  ]);

  console.log('✅ Cloud + MLOps track: 10 modules');

  // ─── Track 03 — Odoo ERP Development (12 weeks) ───────────────────────────────

  const odooModules = await seedModules(t3.id, [
    { order: 1, title: 'Odoo Architecture and Python ORM', description: 'Odoo MVC pattern, module structure, manifest files, Python ORM models, fields, recordsets, and the Odoo shell.', estimatedMinutes: 120 },
    { order: 2, title: 'Custom Module Development: QWeb and Owl JS', description: 'QWeb templating engine, Owl JS component framework, form views, list views, kanban views, and server-side actions.', estimatedMinutes: 150 },
    { order: 3, title: 'Custom Widgets and Business Logic', description: 'Building custom field widgets, computed fields, constraints, wizards, and automated server-side business rule enforcement.', estimatedMinutes: 120 },
    { order: 4, title: 'API Integration: XML-RPC, JSON-RPC, REST, Webhooks', description: 'Connecting external systems to Odoo via XML-RPC and JSON-RPC, building REST API endpoints, and firing webhooks on business events.', estimatedMinutes: 120 },
    { order: 5, title: 'Pakistan and UAE ERP Localisation', description: 'Chart of accounts for Pakistan FBR and UAE VAT compliance, HRMS localisation, payroll configuration, and currency handling for PKR/AED/USD.', estimatedMinutes: 90 },
    { order: 6, title: 'Odoo AI Module v18/v19 Configuration', description: 'Configuring the Odoo AI Module in v18 and v19, AI-assisted lead scoring, smart forecasting, and integrating custom ML models via the AI connector.', estimatedMinutes: 90 },
    { order: 7, title: 'Odoo.sh Deployment Capstone', description: 'Deploying custom modules to Odoo.sh, branch management, automated testing pipelines, backups, and production upgrade procedures.', estimatedMinutes: 120 },
    { order: 8, title: 'Communication + HR Grooming + Exam Prep', description: 'Client communication for ERP consultants. Exam prep for Odoo Functional Certification v18 ($250) or Odoo Technical Certification. Stage 2–5.', estimatedMinutes: 60 },
  ]);

  await seedConcepts(odooModules[0].id, [
    { order: 1, title: 'Odoo MVC Pattern and Module Structure', description: 'How Odoo separates models (ORM), views (XML/QWeb), and controllers. The __manifest__.py file and module dependency graph.' },
    { order: 2, title: 'Python ORM: Models, Fields, and Recordsets', description: 'Defining models with fields.Char, Many2one, One2many, Binary. Searching and filtering with the domain syntax. Recordset operations.' },
    { order: 3, title: 'Odoo Views: Form, Tree, Kanban', description: 'Writing XML for form layouts, optional columns in tree views, and kanban cards with progress bars and colors.' },
    { order: 4, title: 'Scaffolding and the Odoo Shell', description: 'Using odoo scaffold to bootstrap modules. Running the Odoo shell for ORM exploration, debugging, and quick data fixes.' },
  ]);

  await seedConcepts(odooModules[1].id, [
    { order: 1, title: 'QWeb Templates and Dynamic Rendering', description: 'QWeb t-if, t-foreach, t-field directives. Server-side rendering for reports vs client-side rendering in Owl components.' },
    { order: 2, title: 'Owl JS Components', description: 'Component lifecycle, props, state, slots, and hooks in Owl 2. Writing reactive UI without leaving the Odoo ecosystem.' },
    { order: 3, title: 'Inheritance: Extension vs Delegation', description: '_inherit for in-place extension, _inherits for delegation. Adding fields to existing models, overriding methods safely.' },
    { order: 4, title: 'Server and Client Actions', description: 'ir.actions.server for automation, ir.actions.client for custom views. Triggering actions from buttons and base records.' },
  ]);

  await seedConcepts(odooModules[2].id, [
    { order: 1, title: 'Custom Field Widgets', description: 'Building custom Many2one widgets, binary field previews, and progress bar widgets using Owl JS in Odoo 17/18.' },
    { order: 2, title: 'Computed Fields and Constraints', description: 'depends() decorator, store=True vs compute-on-read, and Python constraints that enforce business rules at the ORM level.' },
    { order: 3, title: 'Wizards and Transient Models', description: 'Building wizard dialogs with TransientModel. Multi-step wizards, passing context between steps, and triggering batch operations.' },
  ]);
  await seedConcepts(odooModules[3].id, [
    { order: 1, title: 'XML-RPC and JSON-RPC Clients', description: 'Calling Odoo\'s xmlrpc.client from Python and curl. Authentication, model search/read/write/create operations over RPC.' },
    { order: 2, title: 'Building REST Endpoints in Odoo', description: 'Using @http.route with type=\'json\' and type=\'http\'. Authentication middleware, CORS, and returning structured JSON responses.' },
    { order: 3, title: 'Webhooks on Business Events', description: 'Triggering outbound HTTP webhooks from Odoo automated actions. Retry logic, payload signing, and connecting to Zapier or n8n.' },
  ]);
  await seedConcepts(odooModules[4].id, [
    { order: 1, title: 'Pakistan FBR Tax Configuration', description: 'Configuring tax groups, fiscal positions, and FBR-aligned chart of accounts. GST and withholding tax setup for Pakistani businesses.' },
    { order: 2, title: 'UAE VAT and GCC Compliance', description: 'UAE 5% VAT fiscal positions, tax reports, e-invoice requirements, and multi-currency PKR/AED/USD handling.' },
    { order: 3, title: 'HRMS and Payroll Localisation', description: 'Pakistan EOBI, PESSI, and income tax bracket configuration. Leave accrual, overtime, and payslip generation for local payroll.' },
  ]);
  await seedConcepts(odooModules[5].id, [
    { order: 1, title: 'Odoo AI Connector Configuration', description: 'Setting up the Odoo AI Module in v18/v19. Connecting to OpenAI or local LLMs, configuring AI-powered actions on records.' },
    { order: 2, title: 'AI Lead Scoring and Forecasting', description: 'Enabling AI lead scoring in CRM, interpreting scoring factors, and using AI-powered sales forecasting for pipeline management.' },
    { order: 3, title: 'Custom ML Models via AI Connector', description: 'Calling external ML model APIs from Odoo automated actions. Integrating custom prediction services with the AI connector endpoint.' },
  ]);
  await seedConcepts(odooModules[6].id, [
    { order: 1, title: 'Odoo.sh Branch Strategy', description: 'Production, staging, and development branches on Odoo.sh. Merge workflow, automated testing on push, and rollback procedures.' },
    { order: 2, title: 'Module Testing with Odoo Test Runner', description: 'Writing Python unit tests for Odoo models. Transactional rollback, tagged tests, and running the test suite in Odoo.sh CI.' },
    { order: 3, title: 'Upgrade Procedures and Backup Strategy', description: 'Safe Odoo version upgrades, pre-upgrade testing with the Upgrade Analysis tool, and automated daily backup configuration on Odoo.sh.' },
  ]);
  await seedConcepts(odooModules[7].id, [
    { order: 1, title: 'Odoo Functional Certification Prep', description: 'Exam domains for the Odoo 17 Functional Certification ($250). Practice with the Odoo.com certification portal and mock tests.' },
    { order: 2, title: 'Portfolio: ERP Module Showcase', description: 'Presenting a custom Odoo module on GitHub. Writing a compelling case study for freelance or agency job applications.' },
    { order: 3, title: 'Freelance ERP Consulting Workflow', description: 'Scoping Odoo projects, writing proposals, managing client expectations, and delivering customisations on time and on budget.' },
  ]);

  console.log('✅ Odoo ERP Development track: 8 modules');

  // ─── Track 04 — AI-Integrated Full Stack (16 weeks) ──────────────────────────

  const fsModules = await seedModules(t4.id, [
    { order: 1, title: 'Web Foundations: HTML5, CSS3, Tailwind, TypeScript', description: 'Semantic HTML5, CSS Grid and Flexbox, utility-first styling with Tailwind CSS, and TypeScript types, interfaces, and generics.', estimatedMinutes: 180 },
    { order: 2, title: 'React + Next.js 15 App Router', description: 'React hooks, Next.js 15 App Router file conventions, Server Components vs Client Components, and data fetching with Server Actions.', estimatedMinutes: 150 },
    { order: 3, title: 'shadcn/ui Component Systems + RSC Patterns', description: 'Building UIs with shadcn/ui, composing accessible components, React Server Component patterns, and streaming with Suspense.', estimatedMinutes: 90 },
    { order: 4, title: 'Node.js + NestJS API Design', description: 'NestJS modules, guards, interceptors, pipes, and decorators. Building RESTful and WebSocket APIs with dependency injection.', estimatedMinutes: 150 },
    { order: 5, title: 'Supabase + Prisma ORM + pgvector', description: 'Supabase as a Postgres-as-a-service backend, Prisma schema design, migrations, and pgvector for storing and querying AI embeddings.', estimatedMinutes: 120 },
    { order: 6, title: 'Authentication: JWT, OAuth, Role-Based Access', description: 'JWT access and refresh token flows, Google OAuth via Passport.js, role-based guards, and securing Next.js routes with middleware.', estimatedMinutes: 90 },
    { order: 7, title: 'AI Integration: Vercel AI SDK, OpenAI, WebSockets', description: 'Streaming chat with the Vercel AI SDK, useChat and useCompletion hooks, real-time AI features via WebSockets, and token streaming.', estimatedMinutes: 150 },
    { order: 8, title: 'LangChain in Full Stack', description: 'Integrating LangChain agents into a NestJS backend, RAG pipelines with pgvector, and exposing AI capabilities through typed REST endpoints.', estimatedMinutes: 90 },
    { order: 9, title: 'DevOps: Docker, GitHub Actions, Vercel + AWS EC2', description: 'Containerising Next.js and NestJS, GitHub Actions CI/CD, deploying frontend to Vercel and backend to AWS EC2 or Railway.', estimatedMinutes: 120 },
    { order: 10, title: 'Full-Stack AI Product Capstone', description: '16-week capstone: build a complete AI product end-to-end — ideation, database design, API, frontend, AI features, and production deployment.', estimatedMinutes: 180 },
    { order: 11, title: 'Communication + HR Grooming + Exam Prep', description: 'Portfolio presentation, GitHub profile polish, technical interviews. Exam prep for AWS Developer Associate (DVA-C02) or Azure AI Developer (AI-200). Stage 2–5.', estimatedMinutes: 90 },
  ]);

  await seedConcepts(fsModules[0].id, [
    { order: 1, title: 'Semantic HTML5 and CSS Grid/Flexbox', description: 'Structuring pages with article, section, nav, and aside. Two-dimensional layouts with CSS Grid vs one-dimensional with Flexbox.' },
    { order: 2, title: 'Tailwind CSS Utility-First Styling', description: 'Building responsive designs without writing custom CSS. Responsive prefixes, dark mode, and extracting components with @apply.' },
    { order: 3, title: 'TypeScript: Types, Interfaces, Generics', description: 'Static typing for safer JavaScript. Interfaces vs type aliases, generic functions, and utility types like Partial, Pick, and Omit.' },
    { order: 4, title: 'ES6+ Patterns: Async/Await and Destructuring', description: 'Promises vs async/await, error handling, array and object destructuring, spread/rest, and optional chaining.' },
  ]);

  await seedConcepts(fsModules[1].id, [
    { order: 1, title: 'React Hooks: useState, useEffect, useContext', description: 'Managing local state, side effects and cleanup, and sharing state across component trees without prop drilling.' },
    { order: 2, title: 'Next.js 15 App Router and File Conventions', description: 'page.tsx, layout.tsx, loading.tsx, error.tsx, and route.ts. How the file system maps to URLs.' },
    { order: 3, title: 'Server Components vs Client Components', description: 'When to add \'use client\', the component tree boundary, serialisation rules, and why RSC reduce bundle size.' },
    { order: 4, title: 'Data Fetching with Server Actions', description: 'Defining async server actions, form mutations without API routes, optimistic updates, and revalidation after mutations.' },
  ]);

  await seedConcepts(fsModules[2].id, [
    { order: 1, title: 'shadcn/ui Component Composition', description: 'Installing and customising shadcn/ui components. Composing accessible Button, Dialog, Form, and DataTable components.' },
    { order: 2, title: 'RSC Patterns and Streaming', description: 'Avoiding client component bloat. Passing server data as props to client components, Suspense boundaries, and streaming with loading.tsx.' },
    { order: 3, title: 'Server Actions for Mutations', description: 'Progressive enhancement with server actions, useFormState and useFormStatus hooks, and optimistic UI updates.' },
  ]);
  await seedConcepts(fsModules[3].id, [
    { order: 1, title: 'NestJS Dependency Injection', description: 'Providers, injectable services, module encapsulation, and the NestJS IoC container. Circular dependency detection and resolution.' },
    { order: 2, title: 'Guards, Interceptors, and Pipes', description: 'JwtAuthGuard, RolesGuard, logging interceptors, response transformation interceptors, and ValidationPipe with class-validator DTOs.' },
    { order: 3, title: 'WebSocket Gateways in NestJS', description: 'Socket.io gateways, @SubscribeMessage handlers, broadcasting to rooms, and authenticating WebSocket connections with JWT.' },
  ]);
  await seedConcepts(fsModules[4].id, [
    { order: 1, title: 'Prisma Schema Design', description: 'Models, relations (one-to-many, many-to-many), enums, and index strategies. Writing migrations and seeding with Prisma.' },
    { order: 2, title: 'pgvector for AI Embeddings', description: 'Storing OpenAI embeddings in PostgreSQL with pgvector. Vector similarity search with Prisma raw queries for semantic search.' },
    { order: 3, title: 'Supabase Row-Level Security', description: 'Enabling RLS on Supabase tables. Writing policies for authenticated users, service role bypass, and testing policies.' },
  ]);
  await seedConcepts(fsModules[5].id, [
    { order: 1, title: 'JWT Access and Refresh Token Flow', description: 'Short-lived access tokens, long-lived refresh tokens in HttpOnly cookies, silent refresh, and token rotation on every refresh.' },
    { order: 2, title: 'Google OAuth with Passport.js', description: 'Registering a Google OAuth app, implementing the Passport Google Strategy in NestJS, and handling the callback.' },
    { order: 3, title: 'Role-Based Access Control', description: 'Custom @Roles() decorator, RolesGuard, and protecting Next.js routes with middleware that reads the JWT payload.' },
  ]);
  await seedConcepts(fsModules[6].id, [
    { order: 1, title: 'Vercel AI SDK: useChat and useCompletion', description: 'Building streaming chat UIs with the Vercel AI SDK. Submitting messages, rendering streaming tokens, and stop/regenerate controls.' },
    { order: 2, title: 'Real-Time AI Features via WebSockets', description: 'Streaming AI responses from a NestJS WebSocket gateway. Joining rooms for collaborative AI sessions and broadcasting partial tokens.' },
    { order: 3, title: 'Structured Output and Tool Calls', description: 'Using the AI SDK generateObject for typed JSON output. Wiring AI tool calls to backend functions for function-augmented chat.' },
  ]);
  await seedConcepts(fsModules[7].id, [
    { order: 1, title: 'LangChain in a NestJS Backend', description: 'Injecting LangChain chains as NestJS providers. Using LCEL (LangChain Expression Language) to compose prompts, models, and parsers.' },
    { order: 2, title: 'RAG Pipeline with pgvector', description: 'Embedding user documents, storing in pgvector, and wiring a retrieval chain that injects relevant chunks into LLM prompts.' },
    { order: 3, title: 'Typed REST Endpoints for AI Features', description: 'Exposing RAG, summarisation, and agent APIs as NestJS REST endpoints with proper DTOs, rate limiting, and cost guards.' },
  ]);
  await seedConcepts(fsModules[8].id, [
    { order: 1, title: 'Dockerising Next.js and NestJS', description: 'Standalone Next.js output, NestJS Dockerfile with multi-stage build, and Docker Compose for local full-stack development.' },
    { order: 2, title: 'GitHub Actions CI/CD Pipeline', description: 'Running tests, building Docker images, pushing to ECR, and deploying to Vercel (frontend) and EC2/Railway (backend) on merge.' },
    { order: 3, title: 'Environment Management', description: 'Managing .env files per environment, Vercel environment variables, AWS Secrets Manager for production secrets, and secret rotation.' },
  ]);
  await seedConcepts(fsModules[9].id, [
    { order: 1, title: 'Product Ideation and Architecture', description: 'Defining user stories, selecting a data model, and planning the AI feature set for the capstone product.' },
    { order: 2, title: 'Full-Stack Build Sprint', description: 'Building the database schema, API, and frontend incrementally. Daily demos, feedback incorporation, and scope management.' },
    { order: 3, title: 'Production Launch Checklist', description: 'Error monitoring (Sentry), analytics (PostHog), SEO, performance audit (Lighthouse), and launch announcement.' },
  ]);
  await seedConcepts(fsModules[10].id, [
    { order: 1, title: 'AWS Developer Associate Exam Prep (DVA-C02)', description: 'Serverless, DynamoDB, SQS, Lambda, and CodePipeline — the core services in DVA-C02. Study plan and practice exam strategy.' },
    { order: 2, title: 'Azure AI Developer Exam Prep (AI-200)', description: 'Azure AI Services, Bot Framework, Azure OpenAI, and responsible AI — the AI-200 domains and key study areas.' },
    { order: 3, title: 'Portfolio Presentation and LinkedIn Optimisation', description: 'Building a compelling developer portfolio, writing case studies for the capstone project, and LinkedIn headline/summary.' },
  ]);

  console.log('✅ AI-Integrated Full Stack track: 11 modules');

  // ─── Track 05 — Cybersecurity (14 weeks) ─────────────────────────────────────

  const cyberModules = await seedModules(t5.id, [
    { order: 1, title: 'Networking Fundamentals + Linux CLI', description: 'OSI model, TCP/IP stack, subnetting, DNS, HTTP/HTTPS, Linux CLI essentials for security, Bash scripting, and network scanning with Nmap.', estimatedMinutes: 150 },
    { order: 2, title: 'Kali Linux + Metasploit + Burp Suite', description: 'Kali Linux setup and tool ecosystem, Metasploit Framework modules and msfconsole, Burp Suite intercepting proxy, and basic exploitation workflows.', estimatedMinutes: 150 },
    { order: 3, title: 'OWASP Top 10 + Web Application Exploitation', description: 'SQL injection, XSS, IDOR, SSRF, command injection, broken access control, and the OWASP Testing Guide methodology. Practicing on DVWA and HTB web boxes.', estimatedMinutes: 120 },
    { order: 4, title: 'Cloud Security + Zero Trust Architecture', description: 'AWS IAM misconfigurations, S3 bucket exposure, Azure AD attacks, Zero Trust principles, and cloud-specific attack paths in HTB cloud labs.', estimatedMinutes: 90 },
    { order: 5, title: 'Offensive: Active Directory Attacks', description: 'BloodHound domain enumeration, Mimikatz credential dumping, Impacket toolkit, Kerberoasting, Pass-the-Hash, and lateral movement techniques.', estimatedMinutes: 150 },
    { order: 6, title: 'Offensive: Advanced Web Exploitation + Bug Bounty', description: 'Advanced techniques beyond OWASP Top 10, bug bounty methodology, HTB Pro Labs, report writing, and responsible disclosure.', estimatedMinutes: 150 },
    { order: 7, title: 'Defensive: SIEM + MITRE ATT&CK', description: 'Splunk queries (SPL), Microsoft Sentinel KQL, MITRE ATT&CK framework mapping for SOC analysts, detection rule writing, and alert triage.', estimatedMinutes: 150 },
    { order: 8, title: 'Defensive: EDR + Threat Hunting', description: 'CrowdStrike Falcon and SentinelOne EDR consoles, threat hunting methodology, indicator of compromise analysis, and incident response playbooks.', estimatedMinutes: 120 },
    { order: 9, title: 'AI Red Team + AI Security', description: 'Prompt injection attacks against LLM applications, LLM threat modelling, jailbreaking techniques, and AI security aligned to HTB COAE (co-developed with Google).', estimatedMinutes: 90 },
    { order: 10, title: 'Communication + HR Grooming + Exam Prep', description: 'Technical report writing for clients. Offensive exam prep: HTB CJCA ($105), HTB CPTS ($210), HTB CWES ($210). Defensive exam prep: HTB CDSA ($210), Cisco CCNA Cybersecurity (~$140 with BBT voucher), CompTIA Security+ SY0-701 ($392). Stage 2–5.', estimatedMinutes: 90 },
  ]);

  await seedConcepts(cyberModules[0].id, [
    { order: 1, title: 'OSI Model and TCP/IP Stack', description: 'The 7 OSI layers in practice, how TCP/IP maps to OSI, and how packets travel from your browser to a server.' },
    { order: 2, title: 'Linux CLI Essentials for Security', description: 'File permissions, process management, cron, networking commands (ip, ss, netstat), and Bash one-liners for security automation.' },
    { order: 3, title: 'Network Scanning with Nmap', description: 'TCP SYN scans, service version detection, OS fingerprinting, NSE scripts, and evasion techniques for recon.' },
    { order: 4, title: 'Wireshark Traffic Analysis', description: 'Capturing packets, display filters, following TCP streams, and identifying credentials and sensitive data in cleartext protocols.' },
  ]);

  await seedConcepts(cyberModules[1].id, [
    { order: 1, title: 'Kali Linux Setup and Tool Overview', description: 'Installing Kali, updating tool repositories, the most important tools for each attack phase, and VM snapshot management.' },
    { order: 2, title: 'Metasploit Framework Fundamentals', description: 'msfconsole navigation, searching for modules, configuring exploits and payloads, sessions, and Meterpreter basics.' },
    { order: 3, title: 'Burp Suite: Intercepting Web Traffic', description: 'Setting up the proxy, intercepting and replaying requests, the Intruder for fuzzing, and Repeater for manual testing.' },
    { order: 4, title: 'Exploitation Basics and Privilege Escalation', description: 'Exploiting vulnerable services, upgrading shells, Linux privesc with SUID and sudo misconfigurations, and post-exploitation enumeration.' },
  ]);

  await seedConcepts(cyberModules[2].id, [
    { order: 1, title: 'SQL Injection Attack and Defense', description: 'Union-based, error-based, and blind SQL injection. Parameterised queries, prepared statements, and ORM defenses.' },
    { order: 2, title: 'Cross-Site Scripting (XSS)', description: 'Reflected, stored, and DOM-based XSS. Content Security Policy headers, output encoding, and input sanitisation.' },
    { order: 3, title: 'IDOR and Broken Access Control', description: 'Insecure Direct Object Reference exploitation, horizontal and vertical privilege escalation, and fixing with authorisation checks.' },
  ]);
  await seedConcepts(cyberModules[3].id, [
    { order: 1, title: 'AWS IAM Misconfigurations', description: 'Overly permissive IAM policies, wildcard actions, and privilege escalation paths via iam:PassRole. Using Prowler for cloud security scanning.' },
    { order: 2, title: 'S3 Bucket Exposure', description: 'Public bucket enumeration, exposed data discovery with S3Scanner, and remediating with bucket policies and Block Public Access settings.' },
    { order: 3, title: 'Zero Trust Architecture', description: 'Never-trust-always-verify model, BeyondCorp principles, micro-segmentation, and identity-based access in cloud environments.' },
  ]);
  await seedConcepts(cyberModules[4].id, [
    { order: 1, title: 'BloodHound Domain Enumeration', description: 'Collecting AD data with SharpHound, analysing attack paths in BloodHound, and identifying the shortest path to Domain Admin.' },
    { order: 2, title: 'Kerberoasting and AS-REP Roasting', description: 'Requesting service tickets for offline cracking, AS-REP roasting accounts without pre-authentication, and defending with strong service account passwords.' },
    { order: 3, title: 'Pass-the-Hash and Lateral Movement', description: 'Using Impacket\'s psexec, smbexec, and wmiexec with NTLM hashes. Lateral movement techniques and detection evasion.' },
  ]);
  await seedConcepts(cyberModules[5].id, [
    { order: 1, title: 'Advanced Web Exploitation Techniques', description: 'HTTP request smuggling, SSRF, template injection, and deserialization vulnerabilities beyond the standard OWASP Top 10.' },
    { order: 2, title: 'Bug Bounty Methodology', description: 'Scope definition, reconnaissance with Subfinder and httpx, target prioritisation, and a repeatable testing workflow for bug bounty programs.' },
    { order: 3, title: 'Vulnerability Report Writing', description: 'Writing clear, reproducible bug reports with CVSS scoring, business impact, and step-by-step reproduction steps for triagers.' },
  ]);
  await seedConcepts(cyberModules[6].id, [
    { order: 1, title: 'Splunk SPL for SOC Analysis', description: 'Building SPL searches for authentication failures, process creation events, and network anomalies. Creating dashboards for SOC monitoring.' },
    { order: 2, title: 'MITRE ATT&CK Framework Mapping', description: 'Mapping observed TTPs to ATT&CK techniques and sub-techniques. Using MITRE Navigator to visualise coverage gaps in detection rules.' },
    { order: 3, title: 'Detection Rule Writing', description: 'Writing Sigma rules for portable detection, Splunk saved searches for automated alerting, and tuning thresholds to reduce false positives.' },
  ]);
  await seedConcepts(cyberModules[7].id, [
    { order: 1, title: 'CrowdStrike Falcon EDR Console', description: 'Navigating the Falcon console, threat graph investigation, process tree analysis, and responding to detections with network containment.' },
    { order: 2, title: 'Threat Hunting Methodology', description: 'Hypothesis-driven threat hunts using known TTPs. Hunting for persistence mechanisms, living-off-the-land binaries, and lateral movement.' },
    { order: 3, title: 'Incident Response Playbooks', description: 'Structured IR phases: preparation, identification, containment, eradication, recovery, lessons learned. Writing and testing playbooks.' },
  ]);
  await seedConcepts(cyberModules[8].id, [
    { order: 1, title: 'Prompt Injection Attacks', description: 'Direct and indirect prompt injection against LLM-powered applications. Jailbreaking system prompts and extracting hidden instructions.' },
    { order: 2, title: 'LLM Threat Modelling', description: 'STRIDE threat modelling applied to AI systems. Identifying training data poisoning, model extraction, and membership inference threats.' },
    { order: 3, title: 'AI Application Security Testing', description: 'Testing LLM guardrails with adversarial inputs. Automated red teaming with Garak and the OWASP LLM Top 10 as a test framework.' },
  ]);
  await seedConcepts(cyberModules[9].id, [
    { order: 1, title: 'HTB CPTS Exam Preparation', description: 'Hack The Box Certified Penetration Testing Specialist exam structure. Lab strategy, time management, and report writing for a 10-day exam.' },
    { order: 2, title: 'CompTIA Security+ Exam Prep (SY0-701)', description: 'Security+ domains: threats/attacks, PKI, network security, incident response, governance, and compliance. Practice questions and weak area review.' },
    { order: 3, title: 'Cybersecurity Portfolio and LinkedIn', description: 'Documenting HTB writeups ethically, TryHackMe certificates, CVE disclosures, and building a professional cybersecurity LinkedIn presence.' },
  ]);

  console.log('✅ Cybersecurity track: 10 modules');

  // ─── Track 06 — UI/UX + Brand Design (11 weeks) ──────────────────────────────

  const uxModules = await seedModules(t6.id, [
    { order: 1, title: 'Design Thinking + User Research', description: 'Empathy mapping, user personas, user journey mapping, problem framing with How Might We statements, and ideation with Crazy 8s and mind mapping.', estimatedMinutes: 90 },
    { order: 2, title: 'Figma: Auto-Layout, Components, and Variants', description: 'Figma interface deep dive, Auto-Layout for responsive frames, reusable components with properties, variants, and interactive prototypes.', estimatedMinutes: 150 },
    { order: 3, title: 'Prototyping and Interaction Design', description: 'Click-through prototypes, smart animation, micro-interactions, gesture-based interactions, and user testing sessions with real feedback loops.', estimatedMinutes: 90 },
    { order: 4, title: 'WCAG 2.2 Accessibility Design', description: 'Colour contrast ratios, keyboard navigation, focus order, ARIA labels in design, and auditing existing designs for accessibility compliance.', estimatedMinutes: 90 },
    { order: 5, title: 'Design Systems + Design Tokens', description: 'Building a scalable component library, token architecture for colour, spacing, and typography, Figma Variables, and documenting a design system.', estimatedMinutes: 120 },
    { order: 6, title: 'Brand Identity + Visual Systems', description: 'Logo system design, colour theory and brand palettes, type scale selection, brand guidelines documentation, and applying brand across touchpoints.', estimatedMinutes: 90 },
    { order: 7, title: 'Webflow: Design to Code', description: 'Building responsive websites in Webflow without code, interactions and animations, CMS collections, and handing off Webflow builds to clients.', estimatedMinutes: 90 },
    { order: 8, title: 'AI Design Tools: Midjourney, Adobe Firefly, Framer AI', description: 'Generating concept art and mockups with Midjourney, recoloring and extending assets with Adobe Firefly, and AI layout generation in Framer.', estimatedMinutes: 90 },
    { order: 9, title: 'Storybook + Developer Handoff', description: 'Documenting components in Storybook, Figma Dev Mode for inspect and specs, handoff checklists, and collaborating with frontend engineers.', estimatedMinutes: 60 },
    { order: 10, title: 'Communication + HR Grooming + Exam Prep', description: 'Portfolio presentation and case study writing. Exam prep for Google UX Design Certificate (Coursera) or Figma Professional Certification. Stage 2–5.', estimatedMinutes: 60 },
  ]);

  await seedConcepts(uxModules[0].id, [
    { order: 1, title: 'Empathy Mapping and User Personas', description: 'Structuring user research findings into empathy maps and actionable personas. Moving from data to design decisions.' },
    { order: 2, title: 'User Journey Mapping', description: 'Charting the end-to-end user experience across touchpoints. Identifying pain points, moments of delight, and design opportunities.' },
    { order: 3, title: 'Problem Framing and HMW Statements', description: 'Reframing user problems as design challenges with How Might We. From problem statement to product brief.' },
    { order: 4, title: 'Ideation: Crazy 8s and Mind Mapping', description: 'Rapid idea generation with Crazy 8s. Using mind maps to explore solution spaces before committing to wireframes.' },
  ]);

  await seedConcepts(uxModules[1].id, [
    { order: 1, title: 'Figma Interface and Frame Setup', description: 'Pages, frames vs groups, the layers panel, and setting up frames for desktop, tablet, and mobile viewports.' },
    { order: 2, title: 'Auto-Layout for Responsive Designs', description: 'Horizontal and vertical auto-layout, padding and gap, hug vs fill vs fixed sizing, and building responsive cards.' },
    { order: 3, title: 'Components, Variants, and Props', description: 'Main components and instances, variant properties, component properties for text and boolean visibility.' },
    { order: 4, title: 'Design Tokens and Figma Variables', description: 'Creating colour, spacing, and typography tokens with Figma Variables. Binding tokens to components for theme switching.' },
  ]);

  await seedConcepts(uxModules[2].id, [
    { order: 1, title: 'Click-Through Prototypes in Figma', description: 'Linking frames with interactions, overflow scrolling, overlays for modals, and setting up presentation mode for user testing.' },
    { order: 2, title: 'Smart Animation and Micro-interactions', description: 'Figma Smart Animate for smooth transitions, spring easing, and designing loading states, button feedback, and form validation animations.' },
    { order: 3, title: 'Conducting User Testing Sessions', description: 'Writing a test script, recruiting participants, moderated vs unmoderated testing, and synthesising usability findings into prioritised issues.' },
  ]);
  await seedConcepts(uxModules[3].id, [
    { order: 1, title: 'WCAG 2.2 Success Criteria', description: 'Level A, AA, and AAA criteria. The four principles: Perceivable, Operable, Understandable, Robust. Practical application in Figma.' },
    { order: 2, title: 'Colour Contrast and Focus Indicators', description: 'Checking contrast ratios with Figma plugins. Visible focus states for keyboard navigation, skip-to-content links, and focus traps.' },
    { order: 3, title: 'ARIA Labels in Design Specs', description: 'Annotating designs with ARIA roles, labels, and live regions. Communicating accessibility requirements to developers in handoff notes.' },
  ]);
  await seedConcepts(uxModules[4].id, [
    { order: 1, title: 'Design Token Architecture', description: 'Primitive tokens (raw values), semantic tokens (purpose-based aliases), and component tokens. Token naming conventions and documentation.' },
    { order: 2, title: 'Building a Component Library in Figma', description: 'Atomic design hierarchy (atoms, molecules, organisms). Component API design, property toggles, and maintaining library updates.' },
    { order: 3, title: 'Figma Variables for Theme Switching', description: 'Variable modes for light/dark themes, brand theming, and density variants. Binding variables to components for instant theme switching.' },
  ]);
  await seedConcepts(uxModules[5].id, [
    { order: 1, title: 'Logo System Design', description: 'Primary, secondary, and icon variants of a logo. Safe space rules, minimum sizes, and incorrect usage guidelines in a brand book.' },
    { order: 2, title: 'Colour Theory and Brand Palettes', description: 'Primary, secondary, and neutral palette construction. HSL colour model, palette generation tools, and ensuring WCAG accessibility.' },
    { order: 3, title: 'Brand Guidelines Documentation', description: 'Structuring a complete brand guidelines PDF/website. Voice and tone, photography style, and co-branding rules.' },
  ]);
  await seedConcepts(uxModules[6].id, [
    { order: 1, title: 'Webflow Layout and Flexbox/Grid', description: 'Webflow\'s visual CSS interface for building responsive layouts. CSS Grid in Webflow, auto and fixed column widths.' },
    { order: 2, title: 'Webflow CMS Collections', description: 'Creating CMS collections for blog posts, case studies, and product catalogues. Binding CMS fields to design elements.' },
    { order: 3, title: 'Webflow Client Handoff', description: 'Setting up the Webflow Editor for non-technical clients, training clients on content updates, and transfer to a client account.' },
  ]);
  await seedConcepts(uxModules[7].id, [
    { order: 1, title: 'Midjourney for Concept Art and Mockups', description: 'Prompt engineering for Midjourney. Generating UI concept art, hero images, product mockups, and refining outputs with --style and --ar flags.' },
    { order: 2, title: 'Adobe Firefly for Asset Generation', description: 'Generative fill for image editing, text-to-image for background assets, and extending images with Generative Expand in Photoshop.' },
    { order: 3, title: 'Framer AI Layout Generation', description: 'Using Framer\'s AI to generate initial layouts, editing generated components in Framer\'s visual editor, and publishing.' },
  ]);
  await seedConcepts(uxModules[8].id, [
    { order: 1, title: 'Storybook Component Documentation', description: 'Writing Stories for UI components, Controls addon for interactive props, and Accessibility addon for automated a11y checks.' },
    { order: 2, title: 'Figma Dev Mode for Inspect', description: 'Switching to Dev Mode, reading CSS properties, copying design tokens, and generating code snippets for components.' },
    { order: 3, title: 'Handoff Checklists and Spec Documents', description: 'Writing component specs that developers love. Edge cases, error states, empty states, and animation easing in handoff notes.' },
  ]);
  await seedConcepts(uxModules[9].id, [
    { order: 1, title: 'Google UX Design Certificate Prep', description: 'The five Coursera courses covering: empathise, define, ideate, prototype, test. Portfolio project structure and review.' },
    { order: 2, title: 'UX Case Study Writing', description: 'Structuring a portfolio case study: problem → research → solution → results. Quantifying impact and writing for hiring managers.' },
    { order: 3, title: 'Figma Professional Certification', description: 'Figma certification exam domains: components, prototyping, variables, and Dev Mode. Study guide and practice scenarios.' },
  ]);

  console.log('✅ UI/UX + Brand Design track: 10 modules');

  // ─── Track 07 — AI Marketing + Sales (8 weeks) ───────────────────────────────

  const mktModules = await seedModules(t7.id, [
    { order: 1, title: 'Digital Marketing Foundations + Funnels', description: 'Marketing funnel stages (TOFU/MOFU/BOFU), customer acquisition cost, lifetime value, attribution models, and building a go-to-market strategy.', estimatedMinutes: 90 },
    { order: 2, title: 'SEO + Content Strategy + AI Copywriting', description: 'On-page and technical SEO, keyword research with AI tools, content calendar planning, and writing high-converting copy with ChatGPT.', estimatedMinutes: 90 },
    { order: 3, title: 'Meta Ads + Google Ads + Campaign Optimisation', description: 'Meta Ads Manager campaign structure, Google Ads Search and Performance Max, A/B testing, ROAS optimisation, and budget pacing.', estimatedMinutes: 90 },
    { order: 4, title: 'HubSpot CRM + Apollo.io + Clay AI Outbound', description: 'HubSpot pipeline management, Apollo.io AI prospecting and sequencing, and Clay for hyper-personalised AI outbound campaigns.', estimatedMinutes: 90 },
    { order: 5, title: 'Shopify + E-Commerce Conversion Optimisation', description: 'Store setup and theme customisation, product page optimisation, Shopify analytics, abandoned cart recovery, and conversion rate testing.', estimatedMinutes: 90 },
    { order: 6, title: 'AI Marketing Automation: n8n, Make.com, Gong.io', description: 'Building no-code AI automation workflows in n8n and Make.com, Gong.io for AI sales intelligence, and connecting tools without code.', estimatedMinutes: 90 },
    { order: 7, title: 'LinkedIn Sales Navigator + Salesforce + Einstein AI', description: 'LinkedIn Sales Navigator filters and InMail, Salesforce CRM setup and pipeline management, and Salesforce Einstein AI for lead scoring.', estimatedMinutes: 90 },
    { order: 8, title: 'Growth Analytics: GA4, Dashboards, Cohort Analysis', description: 'GA4 event tracking, custom conversion events, Looker Studio dashboards, cohort analysis, and reporting to stakeholders.', estimatedMinutes: 90 },
    { order: 9, title: 'Communication + HR Grooming + Exam Prep', description: 'Sales and marketing communication skills. Exam prep for Google Digital Marketing Certificate (Coursera), HubSpot Marketing + Sales Certifications (free), or Meta Blueprint ($150). Stage 2–5.', estimatedMinutes: 60 },
  ]);

  await seedConcepts(mktModules[0].id, [
    { order: 1, title: 'Marketing Funnels: TOFU, MOFU, BOFU', description: 'Top, middle, and bottom of funnel content. Mapping content types to funnel stages for awareness, consideration, and conversion.' },
    { order: 2, title: 'CAC, LTV, and Marketing Metrics', description: 'Calculating customer acquisition cost and lifetime value. The unit economics of sustainable marketing campaigns.' },
    { order: 3, title: 'Attribution Models', description: 'First touch, last touch, linear, and data-driven attribution. Understanding what channels really drive conversions.' },
    { order: 4, title: 'Building a Marketing Strategy', description: 'Target audience definition, channel selection, budget allocation, and campaign calendar planning for a new product launch.' },
  ]);

  await seedConcepts(mktModules[1].id, [
    { order: 1, title: 'On-Page SEO: Keywords, Meta, Structure', description: 'Keyword intent, title tag and meta description optimisation, header hierarchy, internal linking, and optimising for featured snippets.' },
    { order: 2, title: 'Technical SEO: Speed, Schema, Crawlability', description: 'Core Web Vitals, structured data markup, XML sitemaps, robots.txt, and fixing crawl errors in Google Search Console.' },
    { order: 3, title: 'AI-Powered Copywriting with ChatGPT', description: 'Prompt frameworks for blog posts, ad copy, email sequences, and product descriptions. Editing AI output to sound human and on-brand.' },
    { order: 4, title: 'Content Calendar and Distribution', description: 'Planning 90-day content calendars, repurposing content across formats, and distributing via SEO, social, and email simultaneously.' },
  ]);

  await seedConcepts(mktModules[2].id, [
    { order: 1, title: 'Meta Ads Campaign Structure', description: 'Campaign → Ad Set → Ad hierarchy. Audience targeting, lookalike audiences, and retargeting pixel setup for a Meta campaign.' },
    { order: 2, title: 'Google Search Ads and Performance Max', description: 'Keyword match types, ad copy best practices, Quality Score, Smart Bidding strategies, and Performance Max asset groups.' },
    { order: 3, title: 'A/B Testing and ROAS Optimisation', description: 'Running split tests at the ad and landing page level. Calculating ROAS, pausing underperforming ad sets, and scaling winners.' },
  ]);
  await seedConcepts(mktModules[3].id, [
    { order: 1, title: 'HubSpot Pipeline Management', description: 'Setting up deal stages, pipeline views, automated task creation, and HubSpot sequences for follow-up email automation.' },
    { order: 2, title: 'Apollo.io AI Prospecting', description: 'Building ICP-targeted prospect lists, AI-powered email personalisation, and multi-touch sequencing in Apollo.io.' },
    { order: 3, title: 'Clay for Hyper-Personalised Outbound', description: 'Enriching prospect data with Clay, using AI to write personalised opening lines at scale, and pushing to a CRM or sequencer.' },
  ]);
  await seedConcepts(mktModules[4].id, [
    { order: 1, title: 'Shopify Store Setup and Theme', description: 'Choosing and customising a Shopify theme, configuring shipping and payment settings, and adding apps from the Shopify App Store.' },
    { order: 2, title: 'Product Page Conversion Optimisation', description: 'Trust signals, social proof, urgency triggers, image carousel best practices, and product description frameworks that convert.' },
    { order: 3, title: 'Abandoned Cart Recovery', description: 'Shopify email and SMS abandoned cart flows. Timing, copy, and discount incentives that recover between 5-15% of abandoned carts.' },
  ]);
  await seedConcepts(mktModules[5].id, [
    { order: 1, title: 'n8n Automation Workflows', description: 'Building no-code workflows in n8n. HTTP Request nodes, conditional logic, data transformation, and connecting marketing tools.' },
    { order: 2, title: 'Make.com Scenario Design', description: 'Trigger → module → router patterns in Make.com. Error handling, filters, and iterating over arrays for batch operations.' },
    { order: 3, title: 'Gong.io AI Sales Intelligence', description: 'Recording and analysing sales calls with Gong.io. Identifying winning talk patterns, tracking pipeline activity, and coaching reps.' },
  ]);
  await seedConcepts(mktModules[6].id, [
    { order: 1, title: 'LinkedIn Sales Navigator', description: 'Advanced search filters, lead and account lists, InMail best practices, and LinkedIn Social Selling Index (SSI) optimisation.' },
    { order: 2, title: 'Salesforce CRM Setup', description: 'Leads vs Contacts vs Accounts, opportunity stages, custom fields, and reports. Salesforce basics for a sales development role.' },
    { order: 3, title: 'Salesforce Einstein AI for Lead Scoring', description: 'Enabling Einstein Lead Scoring, interpreting score factors, and prioritising outreach based on AI-predicted conversion likelihood.' },
  ]);
  await seedConcepts(mktModules[7].id, [
    { order: 1, title: 'GA4 Event Tracking Setup', description: 'GA4 event schema, custom events via gtag.js or GTM, conversion events, and linking GA4 to Google Ads for ROAS reporting.' },
    { order: 2, title: 'Looker Studio Dashboards', description: 'Connecting GA4, Google Ads, and Meta Ads data to Looker Studio. Building executive dashboards with scorecards and trend charts.' },
    { order: 3, title: 'Cohort Analysis and Retention', description: 'Understanding cohort analysis in GA4. User retention curves, identifying churn inflection points, and improving onboarding.' },
  ]);
  await seedConcepts(mktModules[8].id, [
    { order: 1, title: 'HubSpot Marketing and Sales Certifications', description: 'HubSpot\'s free certification library: Inbound Marketing, Content Marketing, Sales Enablement, and Email Marketing. All free via HubSpot Academy.' },
    { order: 2, title: 'Meta Blueprint Certifications', description: 'Meta Certified Digital Marketing Associate and Meta Certified Media Buying Professional exams. Study resources and exam registration.' },
    { order: 3, title: 'Marketing Portfolio for Job Applications', description: 'Building a marketing portfolio with campaign case studies, metrics dashboards, and before/after ROAS improvements.' },
  ]);

  console.log('✅ AI Marketing + Sales track: 9 modules');

  // ─── Track 08 — Networking + Infrastructure (12 weeks) ───────────────────────

  const netModules = await seedModules(t8.id, [
    { order: 1, title: 'Networking Foundations: TCP/IP, OSI, VLANs, Cisco IOS', description: 'TCP/IP and OSI model deep dive, IPv4 and IPv6 addressing and subnetting, VLANs, Spanning Tree Protocol, and first Cisco IOS CLI commands via Packet Tracer. Aligned to CCNA 200-301 Part 1–2.', estimatedMinutes: 180 },
    { order: 2, title: 'Enterprise Networking + WAN: OSPF, BGP, SD-WAN', description: 'OSPF routing configuration, BGP for enterprise and ISP peering, EtherChannel link aggregation, MPLS basics, SD-WAN architecture, and Packet Tracer enterprise labs. Aligned to CCNA 200-301 Part 3.', estimatedMinutes: 150 },
    { order: 3, title: 'Network Security: Firewalls, IPS/IDS, VPN, Zero Trust', description: 'Cisco ASA and Firepower firewall configuration, IPS/IDS deployment, RADIUS and TACACS+ AAA, IPsec and SSL VPN setup, Zero Trust network access, and ACL hardening.', estimatedMinutes: 150 },
    { order: 4, title: 'Cisco CCNA Cybersecurity: SOC, Cloud Network Security', description: 'Threat detection in a SOC environment, network-based intrusion analysis, cloud network security fundamentals, and cryptography basics. Aligned to Cisco CCNA Cybersecurity (formerly CyberOps Associate, renamed Feb 2026).', estimatedMinutes: 120 },
    { order: 5, title: 'Network Automation: Python Netmiko/NAPALM, NETCONF, Ansible', description: 'Using Python with Netmiko and NAPALM for multi-vendor device automation, NETCONF/RESTCONF for model-driven programmability, and Ansible network playbooks.', estimatedMinutes: 150 },
    { order: 6, title: 'Cloud Networking: AWS VPC and Azure VNet', description: 'AWS VPC design (subnets, route tables, security groups, NACLs, Transit Gateway), Azure Virtual Network (NSGs, VPN Gateway, ExpressRoute), and hybrid connectivity patterns.', estimatedMinutes: 90 },
    { order: 7, title: 'Capstone: Enterprise Network Lab + Mock CCNA 200-301', description: 'Full enterprise network build in Packet Tracer covering all domains. Scored mock CCNA 200-301 exam under exam conditions. BBT Cisco NetAcademy affiliation provides up to 58% discount ($330 → ~$140) on the real exam.', estimatedMinutes: 180, passingScore: 75 },
    { order: 8, title: 'Communication + HR Grooming + Exam Prep', description: 'Network engineering communication skills. Exam prep for Cisco CCNA 200-301 (~$140 with BBT voucher), Cisco CCNA Cybersecurity (~$140), Cisco CCNA Automation (~$140), or CompTIA Network+ N10-009 ($338). Stage 2–5.', estimatedMinutes: 60 },
  ]);

  await seedConcepts(netModules[0].id, [
    { order: 1, title: 'OSI Model: 7 Layers Explained', description: 'Physical, Data Link, Network, Transport, Session, Presentation, and Application layers. How data is encapsulated and decapsulated at each layer.' },
    { order: 2, title: 'IPv4/IPv6 Addressing and Subnetting', description: 'Classful and classless addressing, CIDR notation, subnet masks, calculating host ranges, and IPv6 global unicast and link-local addresses.' },
    { order: 3, title: 'VLANs, STP, and Layer 2 Switching', description: 'VLAN configuration and trunking with 802.1Q, inter-VLAN routing, Spanning Tree Protocol loop prevention, and PortFast.' },
    { order: 4, title: 'Cisco IOS CLI Fundamentals', description: 'User EXEC vs Privileged EXEC vs Global Config modes, interface configuration, show commands for troubleshooting, and saving config to NVRAM.' },
  ]);

  await seedConcepts(netModules[1].id, [
    { order: 1, title: 'OSPF Routing Protocol Configuration', description: 'Single-area and multi-area OSPF, router ID, DR/BDR election, cost metric, and configuring OSPF on Cisco IOS.' },
    { order: 2, title: 'BGP for Enterprise and ISP Networks', description: 'eBGP and iBGP peering, AS numbers, BGP attributes (LOCAL_PREF, MED, AS_PATH), and basic routing policy with route maps.' },
    { order: 3, title: 'SD-WAN Architecture and Benefits', description: 'Why SD-WAN replaced MPLS for branch connectivity, Cisco Viptela and Meraki SD-WAN concepts, and WAN optimisation.' },
    { order: 4, title: 'Packet Tracer Lab: CCNA 3 Scenarios', description: 'Building a multi-site enterprise network in Packet Tracer. Configuring OSPF, VLANs, and inter-VLAN routing end-to-end.' },
  ]);

  await seedConcepts(netModules[2].id, [
    { order: 1, title: 'Cisco ASA and Firepower Firewall Config', description: 'Configuring ACLs on Cisco ASA, NAT translation, inspection policies, and Firepower Threat Defense (FTD) initial setup.' },
    { order: 2, title: 'IPsec and SSL VPN Setup', description: 'Site-to-site IPsec VPN tunnels between Cisco routers, AnyConnect SSL VPN for remote access, and split tunnelling configuration.' },
    { order: 3, title: 'Zero Trust Network Access (ZTNA)', description: 'Cisco Duo for MFA, Cisco ISE for network access control, and the principles of least-privilege access in enterprise networks.' },
  ]);
  await seedConcepts(netModules[3].id, [
    { order: 1, title: 'SOC Operations and Network Monitoring', description: 'Setting up network TAPs and SPANs, traffic analysis with Zeek, and feeding network events to a SIEM for correlation.' },
    { order: 2, title: 'Network-Based Intrusion Analysis', description: 'Snort/Suricata IDS rule syntax, identifying network-based attack patterns (port scans, DoS, C2 beacons) in packet captures.' },
    { order: 3, title: 'Cryptography Basics for Network Security', description: 'Symmetric and asymmetric encryption, PKI and certificates, TLS 1.3 handshake, and how HTTPS secures web traffic.' },
  ]);
  await seedConcepts(netModules[4].id, [
    { order: 1, title: 'Python Netmiko for Device Automation', description: 'Connecting to Cisco IOS, NX-OS, and Junos devices with Netmiko. Sending commands, parsing output, and making config changes.' },
    { order: 2, title: 'NAPALM for Multi-Vendor Management', description: 'NAPALM\'s unified API for get_interfaces(), get_bgp_neighbors(), and config deployment across multiple vendor platforms.' },
    { order: 3, title: 'Ansible Network Playbooks', description: 'Writing Ansible playbooks for network device configuration, ios_command and ios_config modules, and inventory file setup.' },
  ]);
  await seedConcepts(netModules[5].id, [
    { order: 1, title: 'AWS VPC Design', description: 'Public and private subnets, route tables, Internet Gateway, NAT Gateway, security groups, NACLs, and Transit Gateway for multi-VPC.' },
    { order: 2, title: 'Azure VNet and Hybrid Connectivity', description: 'Azure Virtual Network subnets, NSGs, VPN Gateway for site-to-site, ExpressRoute for dedicated private connectivity to Azure.' },
    { order: 3, title: 'Hybrid Network Architecture Patterns', description: 'Hub-and-spoke topology in Azure, AWS Direct Connect, SD-WAN integration with cloud, and dual-cloud redundancy patterns.' },
  ]);
  await seedConcepts(netModules[6].id, [
    { order: 1, title: 'CCNA 200-301 Exam Strategy', description: 'Understanding the exam blueprint weightings. Packet Tracer vs real gear for practice, and time management for the 120-minute exam.' },
    { order: 2, title: 'Enterprise Network Lab Build', description: 'Designing and configuring a multi-site enterprise network covering all CCNA 200-301 domains in a single Packet Tracer lab.' },
    { order: 3, title: 'BBT Cisco NetAcademy Voucher Process', description: 'How to claim the BBT voucher for up to 58% discount on CCNA 200-301. Registration process and exam scheduling on Pearson VUE.' },
  ]);
  await seedConcepts(netModules[7].id, [
    { order: 1, title: 'CompTIA Network+ Exam Prep (N10-009)', description: 'Network+ domains: networking concepts, infrastructure, network operations, security, and network troubleshooting. Comparison with CCNA.' },
    { order: 2, title: 'CCNA Cybersecurity and Automation Paths', description: 'Cisco CCNA Cybersecurity (Feb 2026 rename) and CCNA Network Automation as follow-on certifications after CCNA 200-301.' },
    { order: 3, title: 'Networking Career Roadmap', description: 'Network engineer vs cloud network engineer vs security engineer. Salary benchmarks for Pakistan and MENA, and the BBT placement pathway.' },
  ]);

  console.log('✅ Networking + Infrastructure track: 8 modules');

  // ─── Test users ───────────────────────────────────────────────────────────────

  const passwordHash = await bcrypt.hash('Password123!', BCRYPT_COST);

  const learner = await prisma.user.upsert({
    where: { email: 'learner@bbt.edu.pk' },
    update: {},
    create: {
      email: 'learner@bbt.edu.pk',
      name: 'Ali Hassan',
      passwordHash,
      role: UserRole.LEARNER,
      emailVerified: true,
      learnerProfile: { create: {} },
    },
  });

  await prisma.user.upsert({
    where: { email: 'creator@bbt.edu.pk' },
    update: {},
    create: {
      email: 'creator@bbt.edu.pk',
      name: 'Sara Khan',
      passwordHash,
      role: UserRole.CREATOR,
      emailVerified: true,
      creatorProfile: {
        create: {
          displayName: 'Sara Khan',
          tier: 2,
          isVerified: true,
          revenueSharePercent: 15,
        },
      },
    },
  });

  await prisma.user.upsert({
    where: { email: 'admin@bbt.edu.pk' },
    update: {},
    create: {
      email: 'admin@bbt.edu.pk',
      name: 'BBT Admin',
      passwordHash,
      role: UserRole.ADMIN,
      emailVerified: true,
    },
  });

  console.log('✅ Test users ready (learner, creator, admin) — password: Password123!');

  // ─── Sample enrollments ───────────────────────────────────────────────────────

  const cybersecurityTrack = await prisma.track.findUnique({ where: { slug: 'cybersecurity' } });
  if (cybersecurityTrack) {
    await prisma.enrollment.upsert({
      where: { learnerId_trackId: { learnerId: learner.id, trackId: cybersecurityTrack.id } },
      update: {},
      create: { learnerId: learner.id, trackId: cybersecurityTrack.id, plan: 'FREE', status: 'ACTIVE' },
    });
  }

  const genaiTrack = await prisma.track.findUnique({ where: { slug: 'genai-agentic-ai' } });
  if (genaiTrack) {
    await prisma.enrollment.upsert({
      where: { learnerId_trackId: { learnerId: learner.id, trackId: genaiTrack.id } },
      update: {},
      create: { learnerId: learner.id, trackId: genaiTrack.id, plan: 'MONTHLY', status: 'ACTIVE' },
    });
  }

  console.log('✅ Test learner enrolled in Cybersecurity (free) + GenAI (monthly)');

  // ─── Sample content (1 Mux stub) ─────────────────────────────────────────────

  const creator = await prisma.user.findUnique({ where: { email: 'creator@bbt.edu.pk' } });
  if (creator && t1.id) {
    await prisma.content.upsert({
      where: { id: '00000000-0000-0000-0000-000000000001' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000001',
        creatorId: creator.id,
        trackId: t1.id,
        type: 'REEL',
        title: 'What is a Large Language Model?',
        description: 'A 60-second explainer on how LLMs work — transformers, tokens, and next-token prediction.',
        status: ContentStatus.APPROVED,
        tags: ['llm', 'genai', 'explainer'],
      },
    });
  }

  // ─── YouTube content (5 per track = 40 reels) ────────────────────────────────

  if (creator) {
    const youtubeVideos: Array<{ id: string; trackId: string; youtubeId: string; title: string; description: string; tags: string[] }> = [
      // GenAI track
      { id: '10000000-0000-0000-0000-000000000001', trackId: t1.id, youtubeId: 'zjkBMFhNj_g', title: 'Intro to Large Language Models', description: 'Andrej Karpathy\'s 1-hour deep dive into how LLMs work — training, inference, and the emergent capabilities of scale.', tags: ['llm', 'genai', 'karpathy'] },
      { id: '10000000-0000-0000-0000-000000000002', trackId: t1.id, youtubeId: 'aircAruvnKk', title: 'But what is a neural network?', description: '3Blue1Brown\'s visual explanation of neural networks — the mathematical intuition behind deep learning.', tags: ['neural-networks', 'deep-learning', '3blue1brown'] },
      { id: '10000000-0000-0000-0000-000000000003', trackId: t1.id, youtubeId: 'eMlx5fFNoYc', title: 'Attention in Transformers, visually explained', description: '3Blue1Brown on the attention mechanism — the key innovation that powers every modern LLM.', tags: ['transformers', 'attention', 'genai'] },
      { id: '10000000-0000-0000-0000-000000000004', trackId: t1.id, youtubeId: 'mrjtrefjlCM', title: 'LangChain explained in 13 minutes', description: 'Fireship\'s fast-paced intro to LangChain — chains, agents, and tools in under 15 minutes.', tags: ['langchain', 'agents', 'fireship'] },
      { id: '10000000-0000-0000-0000-000000000005', trackId: t1.id, youtubeId: 'ul_mYaIuJzA', title: 'Build an AI Agent from Scratch', description: 'TechWithTim walks through building a ReAct agent from first principles using only the OpenAI API.', tags: ['agents', 'openai', 'react-agent'] },
      // Cloud + MLOps track
      { id: '10000000-0000-0000-0000-000000000006', trackId: t2.id, youtubeId: 'Gjnup-PuquQ', title: 'Docker in 100 Seconds', description: 'Fireship\'s super-quick intro to Docker containers — what they are, why they matter, and how to use them.', tags: ['docker', 'containers', 'devops'] },
      { id: '10000000-0000-0000-0000-000000000007', trackId: t2.id, youtubeId: '3c-iBn73dDE', title: 'Docker Tutorial for Beginners', description: 'TechWorld with Nana\'s comprehensive Docker tutorial — from zero to running containers in production.', tags: ['docker', 'tutorial', 'nana'] },
      { id: '10000000-0000-0000-0000-000000000008', trackId: t2.id, youtubeId: 'X48VuDVv0do', title: 'Kubernetes Course for Beginners', description: 'TechWorld with Nana\'s full Kubernetes course — pods, deployments, services, and Helm charts from scratch.', tags: ['kubernetes', 'k8s', 'devops'] },
      { id: '10000000-0000-0000-0000-000000000009', trackId: t2.id, youtubeId: 'mFFXuXjVgkU', title: 'GitHub Actions CI/CD Pipeline', description: 'Build a complete CI/CD pipeline with GitHub Actions — test, build, and deploy automatically on every push.', tags: ['github-actions', 'cicd', 'devops'] },
      { id: '10000000-0000-0000-0000-000000000010', trackId: t2.id, youtubeId: 'tomUWcQ0yeY', title: 'Terraform in 100 Seconds', description: 'Fireship explains Terraform infrastructure-as-code in 100 seconds — providers, resources, and state.', tags: ['terraform', 'iac', 'cloud'] },
      // Odoo ERP track
      { id: '10000000-0000-0000-0000-000000000011', trackId: t3.id, youtubeId: 'G-CiMvpqkJo', title: 'Odoo 17 — Complete Tutorial', description: 'Comprehensive Odoo 17 tutorial covering the full ERP suite — from CRM to accounting to manufacturing.', tags: ['odoo', 'erp', 'tutorial'] },
      { id: '10000000-0000-0000-0000-000000000012', trackId: t3.id, youtubeId: 'WMtXXCgSV_M', title: 'Build Your First Odoo Module', description: 'Step-by-step guide to building a custom Odoo module — manifest, models, views, and data files.', tags: ['odoo', 'module', 'python'] },
      { id: '10000000-0000-0000-0000-000000000013', trackId: t3.id, youtubeId: 'kQqZkX-bgVM', title: 'Odoo for Small Business', description: 'How small businesses use Odoo ERP to manage inventory, sales, accounting, and HR in one system.', tags: ['odoo', 'erp', 'small-business'] },
      { id: '10000000-0000-0000-0000-000000000014', trackId: t3.id, youtubeId: '8lNOasN5AoM', title: 'Odoo Web Controller Tutorial', description: 'Building custom REST API endpoints in Odoo using HTTP controllers — routing, authentication, and JSON responses.', tags: ['odoo', 'api', 'controller'] },
      { id: '10000000-0000-0000-0000-000000000015', trackId: t3.id, youtubeId: 'ZXiRBqzEArs', title: 'Odoo Accounting — Pakistan Setup', description: 'Configuring Odoo accounting for Pakistan businesses — chart of accounts, tax, and FBR compliance.', tags: ['odoo', 'accounting', 'pakistan'] },
      // AI-Integrated Full Stack track
      { id: '10000000-0000-0000-0000-000000000016', trackId: t4.id, youtubeId: 'wm5gMKuwSYk', title: 'Next.js 14 Full Course', description: 'Dave Gray\'s complete Next.js 14 course — App Router, Server Components, data fetching, and deployment.', tags: ['nextjs', 'react', 'fullstack'] },
      { id: '10000000-0000-0000-0000-000000000017', trackId: t4.id, youtubeId: 'GHTA143_b-s', title: 'NestJS Crash Course', description: 'Mosh Hamedani\'s NestJS crash course — modules, controllers, services, guards, and database integration.', tags: ['nestjs', 'nodejs', 'backend'] },
      { id: '10000000-0000-0000-0000-000000000018', trackId: t4.id, youtubeId: 'rLRIB6AF2Dg', title: 'Prisma & PostgreSQL Tutorial', description: 'Fireship\'s Prisma ORM tutorial — schema definition, migrations, seeding, and querying a PostgreSQL database.', tags: ['prisma', 'postgresql', 'orm'] },
      { id: '10000000-0000-0000-0000-000000000019', trackId: t4.id, youtubeId: 'GnodscC_MsE', title: 'Full Stack AI App Tutorial', description: 'Build a full-stack AI application with Next.js, NestJS, and the OpenAI API — from idea to deployed product.', tags: ['ai', 'fullstack', 'openai'] },
      { id: '10000000-0000-0000-0000-000000000020', trackId: t4.id, youtubeId: 'C7ZFXbJd48M', title: 'Next.js + NestJS Monorepo Setup', description: 'How to structure a Next.js frontend and NestJS backend in a monorepo with shared types and a unified dev server.', tags: ['monorepo', 'nextjs', 'nestjs'] },
      // Cybersecurity track
      { id: '10000000-0000-0000-0000-000000000021', trackId: t5.id, youtubeId: '3Kq1MIfTWCE', title: 'Ethical Hacking Full Course', description: 'freeCodeCamp\'s complete ethical hacking course — from networking fundamentals to advanced penetration testing.', tags: ['ethical-hacking', 'pentesting', 'cybersecurity'] },
      { id: '10000000-0000-0000-0000-000000000022', trackId: t5.id, youtubeId: 'lZAoFs75_cs', title: 'Kali Linux Tutorial for Beginners', description: 'NetworkChuck\'s Kali Linux tutorial — setting up your hacking lab, essential tools, and first reconnaissance.', tags: ['kali-linux', 'hacking', 'networkchuck'] },
      { id: '10000000-0000-0000-0000-000000000023', trackId: t5.id, youtubeId: 'dVFoXD9E-04', title: 'SOC Analyst Day in the Life', description: 'A real SOC analyst walks through their daily workflow — incident triage, SIEM investigation, and threat response.', tags: ['soc', 'analyst', 'blue-team'] },
      { id: '10000000-0000-0000-0000-000000000024', trackId: t5.id, youtubeId: 'qiQR5rTSshw', title: 'Network Security Fundamentals', description: 'Professor Messer on network security concepts — firewalls, IDS/IPS, VPNs, and network hardening best practices.', tags: ['network-security', 'firewall', 'vpn'] },
      { id: '10000000-0000-0000-0000-000000000025', trackId: t5.id, youtubeId: 'HcgekGePhbs', title: 'Cybersecurity Career Roadmap 2024', description: 'How to break into cybersecurity in 2024 — certifications, job roles, salary expectations, and the best learning paths.', tags: ['career', 'cybersecurity', 'roadmap'] },
      // UI/UX + Brand Design track
      { id: '10000000-0000-0000-0000-000000000026', trackId: t6.id, youtubeId: 'c9Wg6Cb_YlU', title: 'UI/UX Design Course Full', description: 'Flux Academy\'s comprehensive UI/UX design course — design principles, Figma workflow, and building a portfolio.', tags: ['uiux', 'figma', 'design'] },
      { id: '10000000-0000-0000-0000-000000000027', trackId: t6.id, youtubeId: 'HZuk6Wkx_Eg', title: 'Figma Tutorial for Beginners', description: 'DesignCourse\'s Figma tutorial — frames, components, auto-layout, prototyping, and sharing your first design.', tags: ['figma', 'tutorial', 'ui-design'] },
      { id: '10000000-0000-0000-0000-000000000028', trackId: t6.id, youtubeId: 'EK-pHkc5EL4', title: 'Design Systems in Figma', description: 'Building a scalable design system in Figma — component library, design tokens, and documentation.', tags: ['design-system', 'figma', 'tokens'] },
      { id: '10000000-0000-0000-0000-000000000029', trackId: t6.id, youtubeId: 'DxJZHYiXAp8', title: 'Motion Design in After Effects', description: 'Beginner motion design tutorial — keyframes, easing, and creating smooth animations in Adobe After Effects.', tags: ['motion-design', 'after-effects', 'animation'] },
      { id: '10000000-0000-0000-0000-000000000030', trackId: t6.id, youtubeId: 't4h9wjlRuBg', title: 'UX Research Methods', description: 'Google UX Design Certificate module on UX research — interviews, surveys, usability testing, and affinity mapping.', tags: ['ux-research', 'user-testing', 'google-ux'] },
      // AI Marketing + Sales track
      { id: '10000000-0000-0000-0000-000000000031', trackId: t7.id, youtubeId: '7yfWtn_c0iw', title: 'Digital Marketing Full Course', description: 'Simplilearn\'s complete digital marketing course — SEO, social media, PPC, email marketing, and analytics.', tags: ['digital-marketing', 'seo', 'ppc'] },
      { id: '10000000-0000-0000-0000-000000000032', trackId: t7.id, youtubeId: 'DvwS7cV9GmQ', title: 'SEO Full Course 2024', description: 'Ahrefs\' comprehensive SEO course — keyword research, on-page SEO, link building, and technical SEO.', tags: ['seo', 'ahrefs', 'content-marketing'] },
      { id: '10000000-0000-0000-0000-000000000033', trackId: t7.id, youtubeId: '5yrRoqRBFpQ', title: 'Meta Ads Tutorial for Beginners', description: 'Ben Heath\'s Meta Ads tutorial — campaign structure, targeting, creative best practices, and scaling winning ads.', tags: ['meta-ads', 'facebook-ads', 'paid-social'] },
      { id: '10000000-0000-0000-0000-000000000034', trackId: t7.id, youtubeId: 'ZyRnfBQLJgY', title: 'Shopify Tutorial 2024', description: 'Wholesale Ted\'s Shopify tutorial — store setup, product pages, payment gateways, and launching your first store.', tags: ['shopify', 'ecommerce', 'dropshipping'] },
      { id: '10000000-0000-0000-0000-000000000035', trackId: t7.id, youtubeId: 'Yh9GVdqWcF0', title: 'ChatGPT for Marketing', description: 'HubSpot\'s guide to using ChatGPT for marketing — ad copy, email campaigns, SEO content, and social media posts.', tags: ['chatgpt', 'ai-marketing', 'copywriting'] },
      // Networking + Infrastructure track
      { id: '10000000-0000-0000-0000-000000000036', trackId: t8.id, youtubeId: 'S7MNX_UD98k', title: 'CCNA 200-301 Complete Course', description: 'NetworkChuck\'s complete CCNA 200-301 course — everything you need to pass the Cisco CCNA exam.', tags: ['ccna', 'cisco', 'networking'] },
      { id: '10000000-0000-0000-0000-000000000037', trackId: t8.id, youtubeId: '_N4WjHKz0fE', title: 'Cisco Packet Tracer Tutorial', description: 'Getting started with Cisco Packet Tracer — building network topologies, configuring devices, and troubleshooting.', tags: ['packet-tracer', 'cisco', 'network-lab'] },
      { id: '10000000-0000-0000-0000-000000000038', trackId: t8.id, youtubeId: 'vLHFPNgeGZI', title: 'Network Automation with Python', description: 'TechWorld with Nana on network automation — Python Netmiko, NAPALM, and Ansible for automating network devices.', tags: ['network-automation', 'python', 'netmiko'] },
      { id: '10000000-0000-0000-0000-000000000039', trackId: t8.id, youtubeId: 'fxkHlg32at8', title: 'AWS VPC Deep Dive', description: 'Adrian Cantrill\'s deep dive into AWS VPC — subnets, route tables, security groups, NACLs, and Transit Gateway.', tags: ['aws', 'vpc', 'cloud-networking'] },
      { id: '10000000-0000-0000-0000-000000000040', trackId: t8.id, youtubeId: 'ulprqHHWlng', title: 'AWS for Beginners', description: 'TechWorld with Nana\'s AWS beginner tutorial — core services, IAM, EC2, S3, and how to navigate the AWS console.', tags: ['aws', 'cloud', 'beginners'] },
    ];

    for (const v of youtubeVideos) {
      await prisma.content.upsert({
        where: { id: v.id },
        update: {},
        create: {
          id: v.id,
          creatorId: creator.id,
          trackId: v.trackId,
          type: 'REEL',
          title: v.title,
          description: v.description,
          youtubeId: v.youtubeId,
          status: ContentStatus.APPROVED,
          tags: v.tags,
          viewCount: Math.floor(Math.random() * 5000) + 100,
        },
      });
    }

    console.log('✅ 40 YouTube content records seeded (5 per track)');

    // ─── Sample reactions + comments ─────────────────────────────────────────────

    const firstYoutubeContentIds = [
      '10000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000002',
      '10000000-0000-0000-0000-000000000021',
    ];

    for (const contentId of firstYoutubeContentIds) {
      await prisma.contentReaction.upsert({
        where: { userId_contentId: { userId: learner.id, contentId } },
        update: {},
        create: { userId: learner.id, contentId, type: 'LIKE' },
      });
      await prisma.contentReaction.upsert({
        where: { userId_contentId: { userId: creator.id, contentId } },
        update: {},
        create: { userId: creator.id, contentId, type: 'FIRE' },
      });
    }

    await prisma.contentComment.createMany({
      skipDuplicates: true,
      data: [
        { userId: learner.id, contentId: '10000000-0000-0000-0000-000000000001', body: 'This explanation finally made transformers click for me. The visualisation is incredible.' },
        { userId: creator.id, contentId: '10000000-0000-0000-0000-000000000001', body: 'Karpathy is the GOAT. Rewatch this after every module for a refresher.' },
        { userId: learner.id, contentId: '10000000-0000-0000-0000-000000000021', body: 'Already finished the first HTB box after watching this. So motivating!' },
      ],
    });

    console.log('✅ Sample reactions and comments seeded');
  }

  console.log('✅ Sample content ready');

  console.log(`
🎉 Seed complete.
   learner@bbt.edu.pk  — LEARNER (Cybersecurity FREE + GenAI MONTHLY)
   creator@bbt.edu.pk  — CREATOR (Tier 2, verified)
   admin@bbt.edu.pk    — ADMIN
   password: Password123!

📚 All 8 tracks: full module + concept coverage
   40 YouTube content records seeded (5 reels per track)
   Sample reactions and comments added
`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
