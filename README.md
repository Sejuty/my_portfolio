# Hi, I'm Nishat Tafannum 👋

**Front-End Engineer (Software Engineer L-2) at Vivasoft Limited** · Dhaka, Bangladesh

I build responsive, high-performance web applications with **React, Next.js and TypeScript**, and have done so for 3+ years for AdTech, FinTech and B2B SaaS clients. I lead design systems and shared component libraries used across multiple platforms, with automated quality checks and an AI-assisted delivery workflow. I work directly with international clients and teams in fully remote settings. Alongside engineering, I research how language models handle Bangla.

🌐 [Portfolio](https://sejuty.github.io/sejuty/) · 📄 [Résumé](https://sejuty.github.io/sejuty/cv.pdf) · 💼 [LinkedIn](https://linkedin.com/in/nishat-tafannum) · ✉️ [sejuty87@gmail.com](mailto:sejuty87@gmail.com)

---

## 🛠️ Tech stack

| | |
|---|---|
| **Languages** | JavaScript (ES6+), TypeScript, HTML5, CSS3, PHP (Laravel) |
| **Frontend** | React.js, Next.js, Tailwind CSS, Sass, Ant Design, shadcn/ui |
| **State & data** | Redux Toolkit, RTK Query, React Query |
| **Charts** | ApexCharts, Highcharts |
| **Forms & validation** | Zod, Formik, JSON Schema (Ajv) |
| **Build & release** | Vite, Bun, Webpack, tsup, GitLab CI, private npm registry |
| **Quality** | ESLint, Biome, WCAG AA accessibility |
| **Architecture** | Design systems, component libraries, micro-frontends, RBAC |
| **Auth** | NextAuth.js, Keycloak |
| **Tools** | Git, Docker, Claude Code |

## 💼 Experience

**Vivasoft Limited**, Dhaka (remote client delivery for international teams)

- **Software Engineer L-2** · Mar 2026 – Present. Promoted from L-1 after two years. I lead the front-end modernization of Azerion's Improve Digital ad tech platforms and the shared component libraries, design systems and build-tool migrations across client projects. I also review code and mentor junior developers.
- **Software Engineer L-1** · Mar 2024 – Feb 2026. Delivered React, Next.js and TypeScript apps for AdTech and FinTech clients, including RBAC, multi-step workflows and interactive data visualizations. Improved component rendering performance by 25%, and led a front-end team of 2 junior developers on NetCapital.
- **Associate Software Engineer** · Feb 2023 – Jul 2023. Built about 60% of a platform's shared React component library.

## 🚀 Selected projects

- **Improve Digital: Console, Publisher & Marketplace** (Azerion). Migrated Webpack to Vite and npm/Yarn to Bun, cutting build time by **75%**. Authored **49 shared React building blocks**, including a data table that replaced jQuery DataTables in 15+ modules. Built self-enforcing design tokens with automated WCAG AA contrast tests. Started and still lead a shared UI library (Bun monorepo, tsup, private npm) used by 3 platforms.
- **NetCapital** (Azerion's invoice-financing platform). Frontend architecture for a multi-tenant financial operations platform built with Next.js 15, RTK Query, Highcharts and Keycloak. It covers financing order lifecycles, approvals, settlement and double-entry accounting.
- **PiHR** (HR & payroll SaaS). Integrated 60+ reports with a micro-frontend architecture. Added multilingual English, Bangla and Arabic support, including right-to-left layouts.
- **[VivaKits](https://www.npmjs.com/package/vivakit)** (React component library on npm). Accessible Input, Select, OTP, Skeleton and Switch components, with full API docs.
- **Klikit** (restaurant & food delivery management). Built the Menu v2 time-slot scheduling feature, and service workers for cross-device performance.

## 🎓 Education

**B.Sc. in Software Engineering**, Shahjalal University of Science and Technology · 2019 – 2024

---

<details>
<summary><b>About this repo</b>: source for my portfolio site</summary>

A static site built with Vite and TypeScript (no framework), served at https://sejuty.github.io/sejuty/.

```sh
npm install
npm run dev       # http://localhost:5173
npm run build     # typecheck + production build to dist/
npm run preview   # serve dist/ locally
npm run cv        # rebuild public/cv.pdf from resume/cv.html
```

- Prose sections (publications, skills, contact…): `index.html`
- Path map: `src/data.ts`. `TRACKS` are the lines, `SPANS` the job roles, `NODES` the project stations
- Styles and colour tokens: `src/styles.css`
- Résumé source: `resume/cv.html` (printed to `public/cv.pdf`)
- Every push to `main` deploys through `.github/workflows/deploy.yml` (Pages source: GitHub Actions)

</details>
