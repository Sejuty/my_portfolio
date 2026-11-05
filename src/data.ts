// Content for Fig. 1, "the path so far". Edit this file to add or change what appears on the map.
//
// The map is drawn like a railway map:
//  - TRACKS are the lines. The B.Sc. is the trunk; the engineering track and the research tracks branch off it.
//  - SPANS are periods you can click: the degree (drawn as the education track itself) and the job roles
//    (drawn as brackets under the engineering track).
//  - NODES are the stations: projects, placed on their track at the time they happened.

export type TrackId = 'auth' | 'multi' | 'bias' | 'edu' | 'eng'
export type TrackKind = 'edu' | 'eng' | 'research'

export interface Track {
  id: TrackId
  label: string
  kind: TrackKind
  /** Start and end as fractional years (2024.5 = mid-2024); `to: null` means it is still going. */
  from: number
  to: number | null
  /** Where this track leaves another one (drawn as a rounded bend), with a short caption. */
  branch?: { from: TrackId; label: string }
  /** For the education track: the span whose details it shows when selected. */
  span?: string
}

interface Detail {
  id: string
  label: string
  /** Shorter label used where the full one doesn't fit (mostly phones). */
  short?: string
  /** First line of the detail panel: what it is, where, and when. */
  when: string
  text: string
  pts: string[]
}

export interface PathSpan extends Detail {
  kind: 'edu' | 'role'
  from: number
  to: number | null
}

export interface PathNode extends Detail {
  track: TrackId
  /** Position on the timeline, as a fractional year. */
  year: number
  /** Id of the role span this project was done in. */
  within?: string
  /** A smaller project: drawn as a minor stop, labelled only where there's room (else on hover or selection). */
  minor?: boolean
}

/** Listed top to bottom as they appear on wide screens. */
export const TRACKS: Track[] = [
  { id: 'eng', label: 'Engineering', kind: 'eng', from: 2023.08, to: null, branch: { from: 'edu', label: 'first job' } },
  { id: 'edu', label: 'Education', kind: 'edu', from: 2018.6, to: 2024.0, span: 'bsc' },
  { id: 'bias', label: 'Bias & fairness', kind: 'research', from: 2024.0, to: null, branch: { from: 'edu', label: 'thesis' } },
  { id: 'multi', label: 'Multimodal', kind: 'research', from: 2025.95, to: null },
  { id: 'auth', label: 'Authorship', kind: 'research', from: 2026.3, to: null },
]

export const SPANS: PathSpan[] = [
  { id: 'bsc', kind: 'edu', from: 2018.6, to: 2024.0, label: 'B.Sc., Software Engineering', short: 'B.Sc., SUST', when: 'Education · SUST · 2018–2024',
    text: 'Undergraduate degree at Shahjalal University of Science and Technology (session 2018–22, completed in 2024 after COVID-19 closures).',
    pts: ['Graduated with a CGPA of 3.77 out of 4.00',
      'Coursework in machine learning, artificial intelligence, data science, statistics and probability, calculus, and linear and abstract algebra',
      'Undergraduate thesis on gender bias detection in Bengali text, which became the WoNBias dataset'] },
  { id: 'assoc', kind: 'role', from: 2023.08, to: 2023.55, label: 'Associate SE', when: 'Role · Vivasoft · Feb–Jul 2023',
    text: 'My first engineering role, building front-end features for client products while still at university.',
    pts: ['Built reusable React UI components that made up about 60% of a platform’s shared component library',
      'Built the Menu v2 feature for Klikit, a restaurant management platform',
      'Left the role to complete the final year of my B.Sc.'] },
  { id: 'l1', kind: 'role', from: 2024.17, to: null, label: 'Software Engineer L-1, Vivasoft', short: 'SE L-1, Vivasoft', when: 'Role · Vivasoft · Mar 2024–present',
    text: 'Front-end engineer delivering React, Next.js and TypeScript applications to international ad tech and fintech clients in a fully remote setting.',
    pts: ['Lead shared component libraries, design systems and build-tool migrations across client projects',
      'Build role-based access control, multi-step workflows and interactive data visualizations; improved component rendering performance by 25%',
      'Review code, mentor junior developers, and work directly with client teams on requirements and delivery'] },
]

export const NODES: PathNode[] = [
  { id: 'klikit', track: 'eng', year: 2023.3, within: 'assoc', label: 'Klikit', when: 'Project · Vivasoft (Associate SE) · 2023',
    text: 'A restaurant management platform, where I built the Menu v2 feature.',
    pts: ['Built an interactive view of a restaurant’s service time slots',
      'Used service workers to keep it fast across devices'] },
  { id: 'weselect', track: 'eng', year: 2024.2, within: 'l1', minor: true, label: 'WeSelect', when: 'Project · Vivasoft (SE L-1) · 2024',
    text: 'A campaign and data analysis application.',
    pts: ['Built the applicant tracking (ATS), campaign, company and user features',
      'Built with Next.js, Tailwind CSS and RTK Query'] },
  { id: 'vivakits', track: 'eng', year: 2024.35, within: 'l1', label: 'VivaKits', when: 'Project · Vivasoft (SE L-1) · Mar–Jun 2024',
    text: 'An open-source React component library, started for PiHR alongside it and published on npm as vivakit.',
    pts: ['Designed and published accessibility-compliant components: Input, Select, OTP, Skeleton and Switch',
      'Wrote full API documentation so other teams could adopt the components directly',
      'Built with React, TypeScript and Tailwind CSS'] },
  { id: 'pihr', track: 'eng', year: 2024.6, within: 'l1', label: 'PiHR', when: 'Project · Vivasoft (SE L-1) · May–Oct 2024',
    text: 'Front-end work on an HR and payroll SaaS platform.',
    pts: ['Integrated more than 60 reports across HR modules using a micro-frontend architecture with shared component libraries',
      'Built schema-based form validation, keeping data integrity consistent across modules',
      'Built English, Bangla and Arabic support, including right-to-left layouts that leave left-to-right views intact'] },
  { id: 'circle', track: 'eng', year: 2024.71, within: 'l1', minor: true, label: 'Circle', when: 'Project · Vivasoft (SE L-1) · Jul–Nov 2024',
    text: 'A location-based social media platform built around collections.',
    pts: ['Built account management, including the account deletion flow',
      'Built the support, policy and child-safety pages, and a report-account form with validation',
      'Built with Next.js and Tailwind CSS'] },
  { id: 'piutil', track: 'eng', year: 2024.96, within: 'l1', minor: true, label: 'Pi-Utilities', when: 'Project · Vivasoft (SE L-1) · Nov 2024–Feb 2025',
    text: 'An office management system for meal services and workplace allocation.',
    pts: ['Refactored the meal management module, improving rendering performance by 25%',
      'Built a floor management module with Leaflet.js covering building locations, floorplans and seating',
      'Made seats and workspaces assignable directly on an interactive floorplan'] },
  { id: 'kothon', track: 'eng', year: 2025.25, within: 'l1', minor: true, label: 'Kothon AI', when: 'Project · Vivasoft (SE L-1) · Mar–Apr 2025',
    text: 'A platform that analyses customer service calls, detecting agent and customer sentiment from the recordings.',
    pts: ['Built a secure multi-file upload to AWS S3 that takes 100+ call recordings at once',
      'Built sentiment dashboards in Highcharts so managers can spot trends and training needs',
      'Built customizable PDF reports of sentiment metrics and call summaries with react-pdf'] },
  { id: 'xsolla', track: 'eng', year: 2025.37, within: 'l1', minor: true, label: 'Xsolla', when: 'Project · Vivasoft (SE L-1) · May 2025',
    text: 'Web pages for Xsolla, a global platform for game monetization and distribution.',
    pts: ['Built responsive, pixel-perfect pages from high-fidelity designs',
      'Integrated the Strapi CMS so pages are driven by content editors',
      'Helped supervise releases for smooth deployments and quick fixes'] },
  { id: 'netcap', track: 'eng', year: 2025.65, within: 'l1', label: 'NetCapital', when: 'Project · Vivasoft (SE L-1) · Aug 2025–Mar 2026',
    text: 'Front-end architecture for NetCapital, Azerion’s in-house multi-tenant invoice financing platform. I led the front-end team of 2 junior developers from Sep 2025.',
    pts: ['Built the financing order lifecycle, application approval, multi-account management and settlement workflows on double-entry accounting',
      'Connected the interface to an AI model pipeline that renders predictive outputs on real-time data, and built reusable geospatial visualization modules',
      'Led code reviews, technical mentoring and deployment management for the team'] },
  { id: 'imp', track: 'eng', year: 2026.25, within: 'l1', label: 'Improve Digital', when: 'Project · Vivasoft (SE L-1) · Apr 2026–present',
    text: 'Leading the front-end modernization of an ad tech platform’s Console, Publisher and Marketplace products.',
    pts: ['Migrated Webpack to Vite and npm to Bun, cutting build time by 75%, and moved styling from Bootstrap to a prefixed Tailwind system across 2 platforms',
      'Authored 49 shared React building blocks, including a data table that replaced jQuery DataTables in 15+ modules, and started a component library now shared by 3 platforms',
      'Built a design system whose tokens enforce themselves in code, checked by 13 automated accessibility and style tests'] },
  { id: 'wonbias', track: 'bias', year: 2025.3, label: 'WoNBias', when: 'Research · Bias & fairness · Published at GeBNLP 2025 (co-located with ACL 2025)',
    text: 'A dataset for classifying bias and prejudice against women in Bengali text, which grew out of my undergraduate thesis.',
    pts: ['Began as a thesis on gender bias detection with a fine-tuned BanglaBERT model; my team built the first 11,000+ entries',
      'After graduating, I mentored 2 junior students who extended it to 31,484 entries from social media, blogs, news, surveys and focus groups',
      'I led dataset design, model evaluation and manuscript drafting for the published paper'] },
  { id: 'bias', track: 'bias', year: 2026.55, label: 'Bias vs personalization', short: 'Bias vs personal.', when: 'Research · Bias & fairness · Ongoing',
    text: 'A study of how LLMs write Bangla bedtime stories when asked to personalize them, measured against a corpus of human-written stories built for it.',
    pts: ['Generates stories personalized by the parent’s role and the child’s gender',
      'Aims to separate legitimate personalization from stereotyped bias in the generated stories',
      'Built the human reference: a corpus of Bangla children’s stories (chotoder golpo), extracted with OCR from PDF books',
      'Builds on the bias work begun with WoNBias'] },
  { id: 'meme', track: 'multi', year: 2026.1, label: 'Meme clustering', short: 'Memes', when: 'Research · Multimodal · Submitted to a conference',
    text: 'An unsupervised method that groups memes by meaning, combining what an image shows with the text in and about it.',
    pts: ['Clustered 22,842 memes by fusing CLIP image features, generated captions and OCR-extracted text, then tested with K-Means and HDBSCAN',
      'Adding captions raised the K-Means silhouette score from 0.387 to 0.621, the strongest single improvement',
      'Weight experiments showed fusion helps only when balanced: too much OCR weight made the HDBSCAN clusters collapse'] },
  { id: 'hc3', track: 'auth', year: 2026.4, label: 'Human vs AI text', short: 'Human vs AI', when: 'Research · Authorship · 2026',
    text: 'A framework for choosing an AI-text detector by accuracy, deployment cost and explanation quality together.',
    pts: ['Compared Logistic Regression, Linear SVM, XGBoost and DistilBERT on HC3; DistilBERT was most accurate at 98.17%, but 55× slower and 285× larger than the smallest model',
      'TOPSIS and fuzzy TOPSIS both ranked Linear SVM first, and the ranking held across every quality/cost weighting',
      'Found and removed a label leak in the corpus, and tested LIME explanations for faithfulness and stability; the most confident model gave the least stable ones'] },
  { id: 'choto', track: 'auth', year: 2026.85, label: 'Chotogolpo: AI vs human', short: 'Chotogolpo', when: 'Research · Authorship · Ongoing',
    text: 'Telling AI-written Bangla short stories (chotogolpo) apart from human-written ones.',
    pts: ['Uses stylometric methods to find writing patterns that set LLM-generated stories apart from human ones',
      'Extends my English human vs AI text work to Bangla, a low-resource setting',
      'Focuses on literary short fiction rather than question-answer text'] },
]

/**
 * The time axis is not linear: each knot is [year, distance along the axis]. The quiet years 2018–2022 are
 * squeezed together (shown with a ≈ break); 2024, with the most engineering stops, gets the most room, then 2026,
 * the busiest research year.
 */
export const AXIS: [number, number][] = [[2017.9, 0], [2023, 0.6], [2024, 1.35], [2025, 3.0], [2026, 4.2], [2027.1, 5.5]]
export const AXIS_BREAK = 2021.4
export const TICKS = [2018, 2023, 2024, 2025, 2026]
