# Sector taxonomy

Open Skill Kit uses **20 broad sectors**, with specialized collections beneath them. This is a browsing layer over the portable folder-based catalog: every existing sector ID, skill slug and direct URL remains valid. No existing skill was moved or renamed. A skill may have many search tags, but its folder gives it exactly one primary collection and broad sector.

## Browse and availability

The marketplace sector directory groups canonical specialties under broad sectors. Home discovery shows broad groups rather than overlapping legacy categories. Catalog filters compose broad sector (`industry` in shareable URLs), collection (`sector` or the existing /sectors/:id route), search, sorting and trust filters. Browser history restores those parameters using the existing Phase 4 search synchronization. Search includes canonical collection and parent-sector terms. Legacy aliases remain readable direct URLs and resolve to the canonical browsing collection; their original packages stay at their original paths.

Available means there are actual validated, discoverable packages, including drafts. It does not mean published, reviewed, safe, compatible or agent-tested. Planned means zero actual skill packages; a registry entry or roadmap proposal does not create an available skill. Generated skillCount and availability are recomputed by the indexer, never accepted as authored promises. Counts aggregate canonical aliases once and aggregate children at the broad level. Root counts must not be added to their child counts.

## Broad sectors and boundaries

| Broad sector ID              | Display name                          | Scope and exclusion boundary                                                                                                             |
| ---------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `agriculture`                | Agriculture & Food Production         | Organize farm observations, seasonal records and harvest planning; excludes restaurant service and environmental certification.          |
| `business-operations`        | Business & Commercial Operations      | Plan ventures, sales and marketing operations across industries; store operations belong to Retail.                                      |
| `construction`               | Construction & Built Infrastructure   | Organize construction scope, project changes and site records; excludes engineering approval and occupied-property operations.           |
| `education`                  | Education & Learning                  | Design teaching, assessment and learner support; excludes workforce HR administration.                                                   |
| `environment-energy`         | Energy & Environment                  | Organize energy-asset work and environmental measurement records; excludes safety authorization or emissions certification.              |
| `finance`                    | Finance & Accounting                  | Reconcile financial records and plan budgets; excludes legal interpretation and investment recommendations.                              |
| `government-public-services` | Government & Civic Services           | Organize public administration, nonprofit governance and community-service records; excludes legal advice and political profiling.       |
| `healthcare`                 | Healthcare                            | Organize care administration and patient-provided information; clinical judgment belongs to qualified professionals.                     |
| `legal`                      | Legal Services                        | Organize legal documents, obligations and questions for counsel; excludes accounting and legal determinations.                           |
| `manufacturing`              | Manufacturing & Industrial Operations | Manage production quality, process records and maintenance planning; excludes transport fleet operations.                                |
| `media-creative`             | Media & Creative Work                 | Develop editorial, journalistic and visual production workflows; excludes product interface engineering and marketing campaign strategy. |
| `people-careers`             | People, HR & Careers                  | Organize employment processes, recruitment and professional development; excludes formal education assessment.                           |
| `personal-life-productivity` | Personal Productivity & Life          | Organize personal commitments, meetings and everyday decisions; excludes professional domain-specific judgment.                          |
| `real-estate`                | Real Estate & Property                | Manage property records, tenancy operations and maintenance coordination; excludes construction project delivery.                        |
| `retail-e-commerce`          | Retail & E-commerce                   | Operate stores, product inventory and customer orders; excludes general marketing strategy.                                              |
| `science-research`           | Science & Research                    | Organize research methods, evidence and reusable data; excludes production analytics engineering and invented scientific findings.       |
| `sports-fitness`             | Sports & Recreation                   | Coordinate recreation events, club operations and participant logistics; excludes medical treatment or exercise prescriptions.           |
| `technology`                 | Technology & Data                     | Build and operate software, AI, data systems and digital interfaces; excludes editorial media production.                                |
| `transportation-logistics`   | Transportation & Logistics            | Coordinate fleet movements, freight, warehouses and shipment exceptions; excludes production inventory decisions.                        |
| `travel-hospitality`         | Hospitality, Food & Travel            | Coordinate guest service, restaurant operations and travel logistics; excludes transport fleet dispatch.                                 |

## Specialized collections

This snapshot describes the current authored batch; runtime counts always come from generated data. Roots can retain legacy general-purpose packages directly. Planned specialties are navigable but have no download or placeholder skill card.

| Broad sector                          | Specialized collection ID       | Name                             | Availability          |
| ------------------------------------- | ------------------------------- | -------------------------------- | --------------------- |
| Agriculture & Food Production         | `farm-records`                  | Farm Records & Field Observation | 1 draft package       |
| Agriculture & Food Production         | `harvest-planning`              | Harvest & Post-harvest Planning  | Planned — no packages |
| Business & Commercial Operations      | `business-startups`             | Business & Startups              | 1 draft package       |
| Business & Commercial Operations      | `marketing-advertising`         | Marketing & Advertising          | 1 draft package       |
| Business & Commercial Operations      | `sales`                         | Sales                            | Planned — no packages |
| Construction & Built Infrastructure   | `construction-documentation`    | Construction Documentation       | Planned — no packages |
| Construction & Built Infrastructure   | `construction-project-controls` | Construction Project Controls    | 1 draft package       |
| Education & Learning                  | `assessment-design`             | Assessment Design                | 1 draft package       |
| Education & Learning                  | `education-teaching`            | Education & Teaching             | 1 draft package       |
| Energy & Environment                  | `energy-operations`             | Energy Asset Operations          | 1 draft package       |
| Energy & Environment                  | `environmental-management`      | Environmental Measurement        | 1 draft package       |
| Finance & Accounting                  | `accounting-operations`         | Accounting Operations            | 1 draft package       |
| Finance & Accounting                  | `financial-planning`            | Budget & Cash-flow Planning      | Planned — no packages |
| Government & Civic Services           | `nonprofits-social-impact`      | Nonprofits & Social Impact       | Planned — no packages |
| Government & Civic Services           | `public-administration`         | Public Administration            | 1 draft package       |
| Healthcare                            | `healthcare-administration`     | Care Administration              | 1 draft package       |
| Healthcare                            | `healthcare-research`           | Healthcare Evidence Organization | Planned — no packages |
| Legal Services                        | `contract-operations`           | Contract Operations              | 1 draft package       |
| Legal Services                        | `legal-research-support`        | Legal Research Support           | Planned — no packages |
| Manufacturing & Industrial Operations | `industrial-maintenance`        | Industrial Maintenance Planning  | Planned — no packages |
| Manufacturing & Industrial Operations | `production-quality`            | Production Quality               | 1 draft package       |
| Media & Creative Work                 | `creative-production`           | Creative Production              | Planned — no packages |
| Media & Creative Work                 | `media-journalism`              | Media & Journalism               | 1 draft package       |
| Media & Creative Work                 | `photography-video`             | Photography & Video              | Planned — no packages |
| Media & Creative Work                 | `social-media-creators`         | Social Media & Creators          | 1 draft package       |
| People, HR & Careers                  | `human-resources`               | Human Resources                  | Planned — no packages |
| People, HR & Careers                  | `recruitment-careers`           | Recruitment & Careers            | 2 draft packages      |
| Personal Productivity & Life          | `collaboration-records`         | Meeting & Collaboration Records  | 1 draft package       |
| Personal Productivity & Life          | `personal-organization`         | Personal Organization            | Planned — no packages |
| Real Estate & Property                | `property-analysis`             | Property Comparison              | Planned — no packages |
| Real Estate & Property                | `property-operations`           | Property Operations              | 1 draft package       |
| Retail & E-commerce                   | `customer-order-operations`     | Customer Order Operations        | Planned — no packages |
| Retail & E-commerce                   | `retail-inventory`              | Retail Inventory                 | 1 draft package       |
| Science & Research                    | `research-data-management`      | Research Data Management         | 1 draft package       |
| Science & Research                    | `research-methods`              | Research Methods & Evidence      | Planned — no packages |
| Sports & Recreation                   | `recreation-planning`           | Community Recreation             | Planned — no packages |
| Sports & Recreation                   | `sports-event-operations`       | Sports Event Operations          | 1 draft package       |
| Technology & Data                     | `ai-machine-learning`           | AI & Machine Learning            | 1 draft package       |
| Technology & Data                     | `cybersecurity`                 | Cybersecurity                    | 1 draft package       |
| Technology & Data                     | `data-analytics-bi`             | Data Analytics & BI              | 1 draft package       |
| Technology & Data                     | `software-development`          | Software Development             | 4 draft packages      |
| Technology & Data                     | `web-design-ux`                 | Web Design & UX                  | 3 draft packages      |
| Transportation & Logistics            | `fleet-operations`              | Fleet Operations                 | 1 draft package       |
| Transportation & Logistics            | `freight-logistics`             | Freight & Warehouse Logistics    | 1 draft package       |
| Hospitality, Food & Travel            | `food-restaurants`              | Food & Restaurants               | Planned — no packages |
| Hospitality, Food & Travel            | `guest-operations`              | Guest Operations                 | 1 draft package       |
| Hospitality, Food & Travel            | `travel-planning`               | Travel Planning                  | Planned — no packages |

## Retained aliases

| Existing ID and URL     | Canonical browsing collection | Meaning                                                                               |
| ----------------------- | ----------------------------- | ------------------------------------------------------------------------------------- |
| `design-ux`             | `web-design-ux`               | Existing files and skill URLs are unchanged; both source collections browse together. |
| `marketing`             | `marketing-advertising`       | Existing files and skill URLs are unchanged; both source collections browse together. |
| `personal-productivity` | `personal-life-productivity`  | Existing files and skill URLs are unchanged; both source collections browse together. |
| `software-engineering`  | `software-development`        | Existing files and skill URLs are unchanged; both source collections browse together. |

An alias is not a second independently maintained category. Author new packages under the canonical collection, not its alias. For example, old software-engineering packages remain discoverable with software-development packages. Design/UX interface engineering belongs under Technology; editorial/visual production belongs under Media. Property operations concern occupied properties; construction concerns delivery/change control. Farm scouting belongs under Agriculture; cross-site resource measurement belongs under Energy & Environment. Cross-industry sales/marketing belongs under Business; order and stock operations belong under Retail. Personal meeting organization is separate from an agency’s public-comment record workflow.

## Extending the registry

1. Choose an existing canonical specialty if its scope covers the task; use tags for synonyms and cross-cutting tools. Do not add a near-duplicate collection for each job title.
2. Add a specialized record in catalog/sectors.json only when its scope has a clear boundary. Required fields remain slug, title, description and aliases. parent optionally identifies a broad sector. aliasOf optionally retains a legacy identifier and must target a canonical collection in the same broad sector (including that broad sector itself).
3. Keep stable slugs; changing a display title does not change an ID or URL. No orphan parents, deeper chains, cycles, alias chains or cross-sector aliases are allowed. Flat registries remain readable for backward compatibility. Unknown source collections can still be derived for standalone CLI sources; maintainers should register official additions explicitly.
4. Create a complete portable package with the existing template/authoring contract. Keep status draft, testedPlatforms empty and lastVerified null unless actual evidence exists. Do not create placeholder packages for planned topics.
5. Run pnpm skills:index and the full validation suite. The indexer derives availability and counts from admitted skill entries; the same shared browser-safe membership helper powers filtering and navigation. React never contains a hardcoded sector or skill catalog.

Schema definitions and two-level hierarchy validation live in packages/skill-schema; canonical membership helpers are shared with the existing Node indexer and browser selectors. No parallel taxonomy service, migration system, backend or account is required. Static Pages preparation already emits every registered sector route, including aliases and planned specialties, from catalog data.

## Batch authoring and evidence

See the [50-skill expansion plan](skill-expansion-plan.md) for 19 authored drafts and 31 proposals. The new suites reuse [Phase 4 evaluation](skill-evaluation.md); no structural score or authored replay establishes actual assistant effectiveness. Old Phase 4 evidence remains intact and is not relabeled.

Sensitive workflows are deliberately scoped to supplied-record organization, with professional verification and escalation rather than clinical, legal, engineering or safety decisions. Authoring context was checked against [WHO handover communication resources](https://www.who.int/teams/integrated-health-services/patient-safety/research/patient-safety-solutions), [OSHA’s competent-person overview](https://www.osha.gov/competent-person), and [EPA waste-assessment resources](https://www.epa.gov/sustainable-management-food/resources-assessing-wasted-food) on 2026-11-10. These sources inform boundaries; they are not copied into packages as a certification, a complete protocol or jurisdiction-specific advice. Arithmetic examples use only explicit fictional assumptions. Independent domain review remains pending.
