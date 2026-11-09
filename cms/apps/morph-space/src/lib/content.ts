import type { Formation } from "../components/Morph";

﻿// ---------- Landing page ----------

export const pillars = [
  {
    title: "Your domain",
    text: "Pick the address your users will visit. Everything you set up lives there, under your name.",
  },
  {
    title: "Your tools",
    text: "Add the tools you want to offer and arrange them the way that makes sense for you.",
  },
  {
    title: "Your users",
    text: "Invite people in and share access. You decide who can use what.",
  },
];

export const steps = [
  {
    title: "Choose a domain",
    text: "Start with the address you want people to use.",
  },
  {
    title: "Set up your tools",
    text: "Add the tools you need and adjust them to fit the way you work.",
  },
  {
    title: "Share with your users",
    text: "Send an invite or a link so people can get started right away.",
  },
  {
    title: "Keep it running",
    text: "Add tools, change who has access and make updates whenever you need to.",
  },
];

export const features = [
  { title: "Bring your own domain", text: "Use an address that is yours, so people always know where they are." },
  { title: "Add tools as you go", text: "Start with one tool and add more later. Rearrange them or take them away whenever you like." },
  { title: "Control who gets in", text: "Give each person the tools they need, and nothing more." },
  { title: "Share with a link", text: "Send one link and your users can get started straight away." },
  { title: "One place to manage", text: "See your tools, your users and your settings together." },
  { title: "Yours to run", text: "You decide what you offer and who it is for." },
];

// ---------- How it works page ----------

export const missionIntro = [
  "Most of the world's sensors, datasets and models sit behind closed doors, useful to one team at a time. Morph Space opens them up to every agent, app and person that needs them, on your terms.",
  "Morph Space gives anything you own a home on the Real Time Web, where people, apps and AI agents can put it to work.",
];

/** From idea to live service. */
export const creatorPath = [
  { title: "Pick your space", text: "Choose a plan and a domain. That is your corner of the Real Time Web." },
  { title: "Bring a resource", text: "A camera feed, a price list, a trained model. Anything that produces something useful." },
  { title: "Shape it into a service", text: "It becomes a Morphic Service with its own address that people and agents can reach." },
  { title: "Let it travel", text: "Others combine it with their services. It stays yours wherever it goes." },
];

/** Chapters of the How it works story; the sticky point cloud re-forms into `formation` as each one scrolls into view. */
export const storyChapters: {
  id: string;
  title: string;
  formation: Formation;
  body: string[];
}[] = [
  {
    id: "new-visitors",
    title: "Your next visitor may not have eyes",
    formation: "sphere",
    body: [
      "AI agents don't scroll or click around. They arrive with a task, look for a service that can handle it, use it and move on.",
      "For them a clear address and a predictable format count for more than a beautiful homepage. Morph Space gives every service both from day one.",
    ],
  },
  {
    id: "combinations",
    title: "Small pieces, big combinations",
    formation: "network",
    body: [
      "A soil sensor on one farm. A rainfall model from a university lab. An irrigation planner from a two-person startup. None of them was built with the others in mind.",
      "On the Real Time Web an agent can join all three into a watering schedule, and each piece still belongs to the people who made it.",
    ],
  },
  {
    id: "ownership",
    title: "Your data never parks in the middle",
    formation: "cube",
    body: [
      "Data moves from source to user without the network keeping a copy along the way. If you want a record, you keep it, and only of what is yours.",
      "Control is split cleanly. Users steer the data layer, providers steer the application layer, and a source can change owners, its data going with it.",
    ],
  },
  {
    id: "earning",
    title: "Earn from what you connect",
    formation: "bars",
    body: [
      "Synx Trade is our planned marketplace. Put a price and terms on your data or service, and when a combination that includes your piece is used, you could share in what it earns.",
      "Build the useful part once and let it keep working for you.",
    ],
  },
];

// ---------- Features page ----------

/** What a creator gets, each with the point-cloud formation shown on its card. */
export const featureList: { title: string; text: string; formation: Formation }[] = [
  { title: "Your own domain", text: "Register a Morph Space domain and get your own address on the Real Time Web.", formation: "sphere" },
  { title: "Synx developer tools", text: "Use the Synx toolkit to create, connect and manage everything you publish.", formation: "grid" },
  { title: "Morphic Services", text: "Turn a machine, an IoT device, a dataset or an AI model into a service others can use.", formation: "cube" },
  { title: "An address for every service", text: "Each service you publish can be found and reached directly on the Real Time Web.", formation: "ring" },
  { title: "Connect data and intelligence", text: "Chain your services with other sources and AI layers to build something bigger together.", formation: "network" },
  { title: "Found by AI agents", text: "Made for agents that look for working services to reuse, as well as for people.", formation: "wave" },
];

/** Ownership promises. */
export const ownership = [
  { stat: "Yours", title: "Ownership stays with you", text: "What you build is yours, wherever it ends up being used." },
  { stat: "Most", title: "Of the revenue is yours", text: "When your service earns, you keep the larger share." },
  { stat: "P2P", title: "Independently owned network", text: "Every resource on it belongs to the person or team who made it, not to a platform." },
];

/** Synx Trade: how value moves along a chain of services. */
export const tradeChain = [
  { role: "Data", text: "A creator provides the source" },
  { role: "Enrich", text: "A service improves it" },
  { role: "Intelligence", text: "An AI model adds insight" },
  { role: "Result", text: "A final service delivers value" },
];

export const morphFaqs = [
  { q: "What can I turn into a service?", a: "Anything that produces useful output: sensor readings, a database, a price feed or an AI model. If it can be reached, it can become a Morphic Service." },
  { q: "Which tool do I start with?", a: "Synx DNS, to claim your domain. Then Synx Pass for identity, Synx BIOS to run your services and, soon, Skalle AI to build them from a plain description." },
  { q: "Where does my data live?", a: "With you. It streams across the network but is not stored along the way." },
  { q: "Which formats are supported?", a: "XML by default and JSON too. You can switch a live connection between them." },
  { q: "Can I hand a service to someone else?", a: "Yes. Ownership of a source can be transferred, and the new owner receives its data." },
  { q: "What is Synx Trade?", a: "Our planned marketplace, where you'll set terms for your data and services and share in the value when they're used." },
  { q: "Can I try it for free?", a: "Yes. The Shared plan costs nothing. Move to a private Morph Space when you need one." },
];

// ---------- Contact page ----------

/** A form field that only some topics ask for. `plan` renders a plan picker. */
export type TopicField = {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  type?: "text" | "url" | "plan" | "file";
  autoComplete?: string;
  /** file fields: accepted types and size limit in MB */
  accept?: string;
  maxMb?: number;
};

export type ContactTopic = { title: string; text: string; message: string; fields: TopicField[] };

/** Contact topics. Name, email and message are always asked; `fields` are the extra ones for that topic. */
export const contactTopics: ContactTopic[] = [
  {
    title: "Support",
    text: "Help with your space, domain or services.",
    message: "What do you need help with?",
    fields: [
      { name: "domain", label: "Your domain", placeholder: "e.g. yourname.com", autoComplete: "url" },
      { name: "plan", label: "Plan", type: "plan" },
    ],
  },
  {
    title: "Partners",
    text: "Build or integrate with Morph Space.",
    message: "How would you like to work together?",
    fields: [
      { name: "company", label: "Company", placeholder: "Company name", required: true, autoComplete: "organization" },
      { name: "website", label: "Website", placeholder: "https://", type: "url", autoComplete: "url" },
    ],
  },
  {
    title: "Investors",
    text: "Talk to us about the Real Time Web.",
    message: "Tell us about your fund and what interests you",
    fields: [
      { name: "firm", label: "Firm or fund", placeholder: "Firm name", required: true, autoComplete: "organization" },
      { name: "website", label: "Website or LinkedIn", placeholder: "https://", type: "url", autoComplete: "url" },
    ],
  },
  {
    title: "Careers",
    text: "Come and build Morph Space with us.",
    message: "Tell us a little about yourself",
    fields: [
      { name: "role", label: "Role you're interested in", placeholder: "e.g. Frontend engineer", required: true },
      { name: "profile", label: "LinkedIn or portfolio", placeholder: "https://", type: "url", autoComplete: "url" },
      { name: "resume", label: "Resume", type: "file", required: true, accept: ".pdf,.doc,.docx", maxMb: 5 },
    ],
  },
];

export const communityLinks = [
  { title: "Documentation", text: "Guides and references for every Synx tool.", href: "https://synx.tools/tools" },
  { title: "Discord", text: "Ask questions and meet other builders.", href: "https://discord.com/invite/Jdr4HsET7B" },
];

// ---------- Pricing ----------

export type Period = "monthly" | "yearly";
export const periods: { id: Period; label: string }[] = [
  { id: "monthly", label: "Monthly" },
  { id: "yearly", label: "Annual" },
];

/** Percent saved when paying annually (shown next to the toggle and applied to every paid plan). */
export let ANNUAL_SAVING = 10;
/** Lets the CMS change the yearly saving (importers see the new value). */
export const setAnnualSaving = (n: number) => {
  ANNUAL_SAVING = n;
};

export type Plan = {
  id: string;
  name: string;
  /** USD per month. 0 = free, null = priced on request. */
  monthly: number | null;
  specs: string[];
  popular?: boolean;
};

export const plans: Plan[] = [
  {
    id: "shared",
    name: "Shared",
    monthly: 0,
    specs: ["Shared space", "Ghost management", "Community support", "User access RTW"],
  },
  {
    id: "creator",
    name: "Creator Space",
    monthly: 81.63,
    specs: [
      "Private Morph Space",
      "2 vCPU · 8 GB RAM",
      "100 GB of Ghost",
      "8 TB bandwidth",
      "Access to Synx DNS, Synx BIOS, Synx Skalle, GitHub, Support",
    ],
  },
  {
    id: "entrepreneur",
    name: "Entrepreneur Space",
    popular: true,
    monthly: 143.3,
    specs: [
      "Private Morph Space",
      "4 vCPU · 16 GB RAM",
      "200 GB of Ghost",
      "16 TB bandwidth",
      "Access to Synx DNS, Synx BIOS, Synx Skalle, GitHub, Support",
      "Custom domain support",
    ],
  },
  {
    id: "tycoon",
    name: "Tycoon Space",
    monthly: 246.63,
    specs: [
      "Private Morph Space",
      "8 vCPU · 32 GB RAM",
      "400 GB of Ghost",
      "32 TB bandwidth",
      "Access to Synx DNS, Synx BIOS, Synx Skalle, GitHub, Support",
      "Dedicated resources",
      "Public IP address",
      "Priority support",
    ],
  },
  {
    id: "matrix",
    name: "Matrix Space",
    monthly: null,
    specs: ["White-label branding", "Dedicated manager", "Custom SLA", "Unlimited hardware", "Custom pricing"],
  },
];

export const faqs = [
  {
    q: "Which plan should I start with?",
    a: "Start with Shared for free. When you need your own private Morph Space, move up to Creator Space.",
  },
  {
    q: "Can I use my own domain?",
    a: "Yes. Custom domain support is included in Entrepreneur Space.",
  },
  {
    q: "What does Matrix Space include?",
    a: "White-label branding, a dedicated manager, a custom SLA, unlimited hardware and custom pricing. Get in touch and we’ll put together pricing for you.",
  },
  {
    q: "How does annual billing work?",
    a: "Paying annually saves you 10% compared with paying monthly. Prices are shown per month, in your local currency where we can detect it (converted from US dollars), and exclude taxes.",
  },
];

/** Where the Login button goes. PLACEHOLDER: point this at the real sign-in page. */
export const LOGIN_URL = "#";
