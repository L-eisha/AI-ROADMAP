// ─── Zen Sky AI — Corporate Automation Roadmap Data ─────
// Audience: Corporate professionals, business leaders, enterprise teams

export const NODES = [
  {
    id: 0,
    label: "Data & Analytics",
    icon: "DB",
    color: "#38bdf8",
    emissive: "#0369a1",
    position: [-6, 0.5, 0],
    tagline: "Turn raw data into business intelligence",
    description:
      "Every successful AI automation initiative starts with clean, structured data. In this module, corporate teams learn to audit existing data assets, build ETL pipelines, and establish a data governance framework that supports enterprise-scale AI deployment.",
    outcomes: [
      "Design enterprise data pipelines",
      "Implement data quality & governance",
      "Build real-time dashboards for KPIs",
      "Connect ERP, CRM, and cloud data sources",
    ],
    topics: ["Data Governance", "ETL & Data Pipelines", "Business Intelligence", "Real-Time Analytics", "Data Lakes & Warehouses"],
    tools: ["Power BI", "Azure Data Factory", "Snowflake", "Apache Kafka", "SQL Server"],
    duration: "3 Weeks",
    difficulty: "Foundational",
    roi: "Reduce reporting time by 70%",
  },
  {
    id: 1,
    label: "Machine Learning",
    icon: "ML",
    color: "#a78bfa",
    emissive: "#6d28d9",
    position: [-2.5, 1.5, -1],
    tagline: "Predictive intelligence for smarter decisions",
    description:
      "Machine Learning equips your organization with predictive power. Corporate professionals learn to apply ML models to real business problems — from customer churn prediction to demand forecasting — without requiring a deep mathematics background.",
    outcomes: [
      "Build predictive models for business forecasting",
      "Automate customer segmentation",
      "Deploy fraud detection systems",
      "Integrate ML into existing business workflows",
    ],
    topics: ["Supervised & Unsupervised Learning", "Predictive Forecasting", "Customer Churn Models", "Risk Scoring", "Model Governance"],
    tools: ["Azure ML Studio", "Google AutoML", "DataRobot", "Python (Scikit-learn)", "Tableau"],
    duration: "4 Weeks",
    difficulty: "Intermediate",
    roi: "30% improvement in forecast accuracy",
  },
  {
    id: 2,
    label: "Process Automation",
    icon: "RPA",
    color: "#34d399",
    emissive: "#059669",
    position: [1, -0.5, -2],
    tagline: "Eliminate repetitive work at enterprise scale",
    description:
      "Robotic Process Automation (RPA) is the fastest path to cost savings in the enterprise. This module trains corporate teams to identify high-value automation candidates and deploy software robots that work 24/7, processing invoices, onboarding employees, and handling compliance checks.",
    outcomes: [
      "Map and automate high-volume business processes",
      "Build and deploy RPA bots without coding",
      "Integrate automation across ERP and legacy systems",
      "Measure ROI and track automation performance",
    ],
    topics: ["RPA Design & Development", "Process Mining", "Attended vs Unattended Bots", "Exception Handling", "Compliance Automation"],
    tools: ["UiPath", "Automation Anywhere", "Power Automate", "Blue Prism", "SAP Build"],
    duration: "4 Weeks",
    difficulty: "Intermediate",
    roi: "Up to 60% reduction in operational costs",
  },
  {
    id: 3,
    label: "AI Agents & LLMs",
    icon: "AI",
    color: "#fb923c",
    emissive: "#c2410c",
    position: [4.5, 1.2, -1],
    tagline: "Deploy autonomous AI that thinks and acts",
    description:
      "Large Language Models and AI Agents are redefining what automation can accomplish. Corporate teams learn to deploy intelligent agents for customer service, contract analysis, report generation, and internal knowledge management — powered by GPT-4, Claude, and enterprise LLM platforms.",
    outcomes: [
      "Deploy AI chatbots for customer & employee support",
      "Automate contract review and document analysis",
      "Build internal knowledge assistants",
      "Create multi-step autonomous workflow agents",
    ],
    topics: ["LLM Integration (GPT-4, Claude)", "Prompt Engineering for Business", "RAG Systems", "AI Customer Service", "Document Intelligence"],
    tools: ["Azure OpenAI", "LangChain", "Microsoft Copilot Studio", "Anthropic Claude API", "Vector Databases"],
    duration: "5 Weeks",
    difficulty: "Advanced",
    roi: "Handle 80% of inquiries without human intervention",
  },
  {
    id: 4,
    label: "Hyperautomation",
    icon: "HA",
    color: "#f472b6",
    emissive: "#be185d",
    position: [8, 0, 0],
    tagline: "End-to-end intelligent enterprise orchestration",
    description:
      "Hyperautomation is the strategic combination of AI, RPA, ML, and intelligent orchestration to automate entire business processes end-to-end. Organizations that achieve hyperautomation gain a decisive competitive advantage through speed, accuracy, and scale that is impossible with human effort alone.",
    outcomes: [
      "Orchestrate AI + RPA + ML into unified workflows",
      "Deploy Centre of Excellence (CoE) frameworks",
      "Achieve enterprise-wide automation governance",
      "Measure and scale automation ROI across divisions",
    ],
    topics: ["Intelligent Orchestration", "Centre of Excellence", "Change Management", "Automation Governance", "Scalability & Security"],
    tools: ["ServiceNow", "MuleSoft", "Celonis", "Microsoft Power Platform", "AWS Step Functions"],
    duration: "5 Weeks",
    difficulty: "Strategic",
    roi: "10x faster end-to-end process execution",
  },
];

export const DIFFICULTY_COLOR = {
  Foundational: "#38bdf8",
  Intermediate: "#a78bfa",
  Advanced:     "#fb923c",
  Strategic:    "#f472b6",
};

export const CONTACT = {
  email: "training@zenskyai.com",
  phone: "+91 98765 43210",
  website: "www.zenskyai.com",
  tagline: "Start your enterprise AI journey today",
};