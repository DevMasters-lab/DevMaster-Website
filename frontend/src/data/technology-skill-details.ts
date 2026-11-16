import type {TechnologySkill} from './technology-skills';

export type TechnologySkillDetails={
  description:string;
  applications:readonly string[];
};

// Related categories share applications while each skill keeps its canonical identity.
const profiles={
  programming:{
    description:"Use {technology} to build software features, automate tasks and bring project ideas to life.",
    applications:[
      "Custom software and application features",
      "Workflow automation and reusable tools",
      "Prototypes and technical proof of concept",
    ],
  },
  frontend:{
    description:"Use {technology} to create clear, responsive interfaces for people using your website or application.",
    applications:[
      "Responsive websites and web applications",
      "Accessible, interactive user interfaces",
      "Reusable components and design systems",
    ],
  },
  backend:{
    description:"Use {technology} to develop the services, business logic and data workflows behind your application.",
    applications:[
      "Application services and business logic",
      "Database integration and data processing",
      "Background jobs and system integrations",
    ],
  },
  mobile:{
    description:"Use {technology} to deliver mobile experiences that fit your users and their everyday tasks.",
    applications:[
      "Mobile applications and user interfaces",
      "Device features and service integration",
      "Mobile testing and release preparation",
    ],
  },
  desktop:{
    description:"Use {technology} to create desktop tools that support focused, practical work on a computer.",
    applications:[
      "Desktop applications and business utilities",
      "Local files and operating-system integration",
      "Offline and workstation workflows",
    ],
  },
  api:{
    description:"Use {technology} to help applications exchange information and work together through defined interfaces.",
    applications:[
      "API design and implementation",
      "Data exchange between applications",
      "Service integration and API documentation",
    ],
  },
  testing:{
    description:"Use {technology} to check software behavior, find issues and support more dependable releases.",
    applications:[
      "Functional and regression testing",
      "Automated checks and test workflows",
      "Issue investigation and release validation",
    ],
  },
  analytics:{
    description:"Use {technology} to explore data, explain patterns and support informed decisions.",
    applications:[
      "Data exploration and analysis",
      "Reports, dashboards and visualizations",
      "Business insights and decision support",
    ],
  },
  pipelines:{
    description:"Use {technology} to move, prepare and organize data for applications and analysis.",
    applications:[
      "Data ingestion and transformation",
      "Data pipelines and platform integration",
      "Data quality and processing workflows",
    ],
  },
  machine_learning:{
    description:"Use {technology} to explore machine-learning solutions and evaluate how models perform on your data.",
    applications:[
      "Predictive modeling and pattern recognition",
      "Model training and evaluation",
      "Machine-learning prototypes and integration",
    ],
  },
  generative_ai:{
    description:"Use {technology} to explore AI-assisted experiences and practical generative-AI workflows.",
    applications:[
      "AI-assisted content and code workflows",
      "Knowledge retrieval and conversational tools",
      "AI workflow prototyping and evaluation",
    ],
  },
  networking:{
    description:"Use {technology} to plan, connect and troubleshoot the networks your organization relies on.",
    applications:[
      "Network design and configuration",
      "Connectivity and traffic management",
      "Network troubleshooting and maintenance",
    ],
  },
  infrastructure:{
    description:"Use {technology} to configure and operate infrastructure that supports your applications and services.",
    applications:[
      "Infrastructure setup and service deployment",
      "Environment configuration and administration",
      "Operational maintenance and troubleshooting",
    ],
  },
  support:{
    description:"Use {technology} to organize technical support and keep everyday IT work moving.",
    applications:[
      "User support and incident resolution",
      "Device, account and asset administration",
      "Service requests and support workflows",
    ],
  },
  security:{
    description:"Use {technology} to review security controls and strengthen protection across applications and systems.",
    applications:[
      "Security configuration and control reviews",
      "Access protection and system hardening",
      "Vulnerability review and remediation planning",
    ],
  },
  penetration_testing:{
    description:"Use {technology} to support authorized security testing and understand weaknesses before remediation.",
    applications:[
      "Authorized application and network assessments",
      "Vulnerability validation and security reporting",
      "Remediation verification and follow-up testing",
    ],
  },
  security_operations:{
    description:"Use {technology} to investigate security signals and support a coordinated response to incidents.",
    applications:[
      "Security monitoring and alert analysis",
      "Incident investigation and response workflows",
      "Security event reporting and operational review",
    ],
  },
  forensics:{
    description:"Use {technology} to examine digital evidence and support a structured investigation.",
    applications:[
      "Digital evidence collection and examination",
      "Incident timelines and artifact analysis",
      "Investigation documentation and findings",
    ],
  },
  risk:{
    description:"Use {technology} to organize risk, assess controls and support security governance.",
    applications:[
      "Risk assessments and control mapping",
      "Policy, compliance and audit preparation",
      "Risk reporting and improvement planning",
    ],
  },
  delivery:{
    description:"Use {technology} to connect build, test and deployment steps into repeatable delivery workflows.",
    applications:[
      "Build and test automation",
      "Deployment pipelines and release workflows",
      "Delivery configuration and troubleshooting",
    ],
  },
  monitoring:{
    description:"Use {technology} to understand service behavior and spot operational issues through monitoring data.",
    applications:[
      "Service health and performance dashboards",
      "Logs, metrics and operational alerts",
      "Operational troubleshooting and capacity review",
    ],
  },
  databases:{
    description:"Use {technology} to organize application data and support dependable data access and maintenance.",
    applications:[
      "Data modeling and database integration",
      "Queries, indexing and performance review",
      "Database maintenance and data migration",
    ],
  },
  business_systems:{
    description:"Use {technology} to connect business processes, operational records and customer workflows.",
    applications:[
      "Business process configuration and improvement",
      "Customer and operational data workflows",
      "Business system integration and reporting",
    ],
  },
  integration:{
    description:"Use {technology} to connect existing systems and reduce disconnected steps in your operations.",
    applications:[
      "Application and service connections",
      "Data synchronization and exchange",
      "Cross-system workflow coordination",
    ],
  },
  experience_design:{
    description:"Use {technology} to explore user needs and shape clear, practical product experiences.",
    applications:[
      "User flows and interface design",
      "Interactive prototypes and usability reviews",
      "Product concepts and design systems",
    ],
  },
  graphic_design:{
    description:"Use {technology} to communicate ideas through visual assets and consistent design.",
    applications:[
      "Brand graphics and visual identities",
      "Marketing and communication materials",
      "Digital and print design assets",
    ],
  },
  motion_media:{
    description:"Use {technology} to develop visual stories, explain ideas and produce media for your audience.",
    applications:[
      "Visual storytelling and presentation content",
      "Product and concept visualization",
      "Media production and creative workflows",
    ],
  },
  geospatial:{
    description:"Use {technology} to work with location data and turn geographic information into useful maps and analysis.",
    applications:[
      "Mapping and geographic data management",
      "Spatial analysis and location insights",
      "Remote-sensing and geographic reporting",
    ],
  },
  embedded:{
    description:"Use {technology} to connect software with devices, sensors and physical environments.",
    applications:[
      "Device and sensor integration",
      "Embedded software and device prototypes",
      "Connected-device data and control workflows",
    ],
  },
  robotics:{
    description:"Use {technology} to explore robotic systems and connect sensing, planning and control.",
    applications:[
      "Robot simulation and system prototyping",
      "Sensor integration and robot control",
      "Robotic workflow development and testing",
    ],
  },
  blockchain:{
    description:"Use {technology} to explore distributed applications and programmable digital transactions.",
    applications:[
      "Distributed application prototypes",
      "Smart-contract development and integration",
      "Blockchain data and transaction workflows",
    ],
  },
  automation:{
    description:"Use {technology} to connect routine tasks and build repeatable workflows across your tools.",
    applications:[
      "Routine task and process automation",
      "Tool connections and workflow orchestration",
      "Automated notifications and data updates",
    ],
  },
} satisfies Record<string,TechnologySkillDetails>;

const categoryProfiles:Record<string,keyof typeof profiles>={
  "programming-languages":"programming",
  "frontend-development":"frontend",
  "backend-development":"backend",
  "mobile-development":"mobile",
  "desktop-development":"desktop",
  "api-development":"api",
  "software-testing":"testing",
  "data-analytics":"analytics",
  "data-science":"analytics",
  "data-engineering":"pipelines",
  "machine-learning":"machine_learning",
  "generative-ai":"generative_ai",
  "business-intelligence":"analytics",
  "network-engineering":"networking",
  "routing-switching":"networking",
  "wireless-networking":"networking",
  "server-administration":"infrastructure",
  "it-support":"support",
  "network-security":"security",
  "application-security":"security",
  "penetration-testing":"penetration_testing",
  "security-operations":"security_operations",
  "digital-forensics":"forensics",
  "risk-management":"risk",
  "cloud-computing":"infrastructure",
  "containerization":"infrastructure",
  "ci-cd":"delivery",
  "infrastructure-as-code":"infrastructure",
  "monitoring":"monitoring",
  "relational-databases":"databases",
  "nosql-databases":"databases",
  "database-administration":"databases",
  "erp-crm":"business_systems",
  "system-integration":"integration",
  "ui-ux-design":"experience_design",
  "graphic-design":"graphic_design",
  "product-design":"experience_design",
  "animation":"motion_media",
  "video-editing":"motion_media",
  "3d-design":"motion_media",
  "gis-remote-sensing":"geospatial",
  "iot":"embedded",
  "robotics":"robotics",
  "blockchain":"blockchain",
  "automation":"automation",
  "embedded-systems":"embedded",
};

export function getTechnologySkillDetails(skill:TechnologySkill):TechnologySkillDetails{
  const categoryId=skill.categoryIds.find(id=>categoryProfiles[id]);
  return profiles[categoryId?categoryProfiles[categoryId]:'programming'];
}
