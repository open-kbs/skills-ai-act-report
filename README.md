# AI Act Compliance Report — OpenKBS Skill

Generate EU AI Act (Regulation 2024/1689) compliance reports for OpenKBS projects. Collects AI usage data, scans for compliance artifacts, classifies risk per Annex III, and produces a structured Markdown report.

## Install

```bash
npx skills add openkbs/skills-ai-act-report
```

## What it does

1. **Collects data** — Queries the OpenKBS AI Proxy for model usage (vendor, model, requests, tokens, cost) and scans the project for compliance artifacts (policies, disclosure components, oversight workflows)
2. **Classifies risk** — The AI agent analyzes the project code and determines which Annex III high-risk category (if any) each AI use case falls into
3. **Produces a report** — Structured Markdown document with: AI system inventory, risk classification, compliance checklist against Art. 4/5/12/14/26/50, and prioritized recommendations

## Output

`AI-ACT-COMPLIANCE-REPORT.md` — a document ready for regulators, auditors, or internal compliance review.

## Requirements

- OpenKBS Studio (OPENKBS_PROJECT_ID and OPENKBS_API_KEY are set automatically)
- Node.js 20+

## Regulation reference

- [Regulation (EU) 2024/1689](https://artificialintelligenceact.eu/) — EU Artificial Intelligence Act
- Key articles covered: Art. 4 (AI literacy), Art. 5 (prohibited practices), Art. 12 (logging), Art. 14 (human oversight), Art. 26 (deployer obligations), Art. 50 (transparency)
- Annex III high-risk categories: biometrics, critical infrastructure, education, employment, essential services, law enforcement, migration, justice

## License

MIT
