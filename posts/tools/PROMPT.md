Hello\! As your dual-persona assistant, here is the complete, updated prompt template that includes all of our recent additions, such as the new data requirements from `polygon.io` and `alphavantage`, the "Analyst Consensus" section, and the "Quarterly Trends" chart.

This prompt is now the master template for generating all future reports.

http://googleusercontent.com/immersive_entry_chip/0

[Optional: Provide any specific technical analysis or rating to prioritize, e.g., "Rating: Strong Buy", "Technicals: Bullish"]

**Your Task:**
Using the **user-provided JSON data**, generate:

1.  A **single, self-contained HTML file** (`[TICKER]_report.html`) for the main report.
2.  A **separate markdown file** (`[TICKER]_social.md`) for the social media post.

**All financial data (fundamentals, ratios, performance, competitor metrics) MUST be pulled *directly* from the user-provided JSON data block. Do not simulate or invent data.**

-----

### **PART 1: HTML REPORT REQUIREMENTS (`[TICKER]_report.html`)**

The HTML file must be structured with the following components:

#### **1. HTML Structure & Styling (Web Developer Persona)**

  * **HTML Shell:** A complete HTML5 document (`<!DOCTYPE html>`, `<html>`, `<head>`, `<body>`).
  * **Head Section:** Must include:
      * `<meta charset="UTF-8">`
      * `<meta name="viewport" content="width=device-width, initial-scale=1.0">`
      * `<title>[TICKER] Financial Analysis Report</title>`
      * **SEO & Social Meta Tags:**
          * `<meta name="description" content="A comprehensive financial analysis of [Company Name] ([TICKER]) as of [asOfDate], covering fundamentals, analyst consensus, and key growth drivers.">`
          * \`\<meta property="og:title" content="Equity Research: [Company Name] ([TICKER]) Analysis"\>
          * `<meta property="og:description" content="In-depth financial report on [Company Name] ([TICKER]), detailing its [Key Theme, e.g., AI strategy/cloud growth], fundamental health, analyst consensus, and competitor comparison.">`
          * \`\<meta property="og:type" content="article"\>
          * `<meta property="og:url" content="https://tonynahra.github.io/posts/[TICKER]_[YYMMDD].html">`
          * \`\<meta name="twitter:card" content="summary\_large\_image"\>
          * \`\<meta name="twitter:title" content="Equity Research: [Company Name] ([TICKER]) Analysis"\>
          * `<meta name="twitter:description" content="In-depth financial report on [Company Name] ([TICKER]), detailing its [Key Theme], fundamental health, analyst consensus, and competitor comparison.">`
      * **CDNs and External Files:**
          * Tailwind CSS CDN: `<script src="https://cdn.tailwindcss.com"></script>`
          * Plotly.js CDN: `<script src="https://cdn.plot.ly/plotly-latest.min.js"></script>`
          * Chart.js CDN: `<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>`
          * **External Stylesheet:** `<link rel="stylesheet" href="common/finance-style.css">`
      * **CRITICAL:** The Tailwind `tw-` prefix configuration script:
        ```html
        <script>
          tailwind.config = {
            prefix: 'tw-',
          }
        </script>
        * **Layout:**
        ```
      * Use a modern, two-column flexbox layout (sticky sidebar + main content area).
      * Apply clean, professional styling (e.g., `tw-bg-gray-100`, `tw-font-sans`). Use `tw-max-w-7xl` for the main content block.
  * **Navigation (`<aside>`):**
      * Create an `<aside>` element that is **sticky** on the left side (`tw-sticky tw-top-0 tw-h-screen`).
      * This `<aside>` must contain a navigation menu (a `<ul>`) with links that use anchor tags to jump to the corresponding `<section>` IDs.
      * **Navigation Links:**
          * Executive Summary (`#summary`)
          * Company Overview (`#overview`)
          * Analyst Consensus (`#consensus`)
          * Quarterly Trends (`#quarterly`)
          * Fundamental Analysis (`#fundamental`)
          * Analysis & Interpretation (`#interpretation`)
          * SWOT Analysis (`#swot`)
          * Market & Competitor Analysis (`#market`)
          * Benchmark Comparison (`#benchmark`)
          * Price Chart (`#chart`)
          * Disclaimer (`#disclaimer`)
      * **External Link:** After the main navigation `<ul>`, add a separator (`<hr>`) and a new `<ul>` containing an "About the Author" link pointing to `https://tonynahra.github.io/`. This link must open in a new tab.
  * **JavaScript (in `<body>`):**
      * **Ticker-Specific Chart Script:** Include an *inline* `<script>` tag at the end of the `<body>` (before the common script). This script must:
        1.  Store the `analystConsensus` and `quarterlyFinancials` data from the JSON directly into a `const FUNDAMENTAL_DATA`.
        2.  On `DOMContentLoaded`, render the Chart.js charts for `#analystChart` and `#quarterlyChart` using this `FUNDAMENTAL_DATA`.
        3.  Contain the `async function createPlotlyChart()` to fetch and render the Plotly.js chart.
      * **Common Script:** At the *very* end of the `<body>`, include the external script: `<script src="common/finance-script.js" defer></script>`.

#### **2. Report Content (Financial Analyst Persona)**

The main content area must contain the following sections, populated **exclusively** from the provided JSON.

  * **Hyperlinks:** Where appropriate (e.g., for key products, competitors, or index funds mentioned), add external hyperlinks (`<a href="..." target="_blank" rel="noopener noreferrer">...</a>`) to support claims and provide further reading.
  * **Formatting:** Ensure all text is formatted for HTML (e.g., use `<strong>` tags instead of markdown `**`). All numbers must be formatted for readability (e.g., `1234567890` -\> `$1.23B` or `1.23B`, `0.152` -\> `15.2%`, `35.1` -\> `35.1x`).
  * **Section 1: Executive Summary (`id="summary"`)**
      * A concise, 3-5 bullet point overview of the key findings (based on the JSON data, including analyst consensus).
      * A final, clear **Recommendation** (e.g., Buy, Hold, Sell) with a one-sentence justification.
      * **CRITICAL:** This recommendation must be weighted to prioritize any specific user-provided analysis (e.g., "Technical Analysis: Strong Buy", "Rating: Buy"). If the user provides a rating, use it.
  * **Section 2: Company Overview (`id="overview"`)**
      * **Business Model:** (Must be AI-generated, as this is not in the JSON).
      * **Leadership:** Use `mainTicker.ceo`. (AI-generate a sentence about them).
      * **Company Info:** Use `mainTicker.marketCap`, `mainTicker.sector`, `mainTicker.industry`, `mainTicker.hqLocation`.
  * **Section 3: Analyst Consensus (`id="consensus"`)**
      * Display `mainTicker.analystConsensus` data.
      * Create a 2-col layout:
          * **Left:** Key metric cards for "Mean Target" (`targetMean`), "High Target" (`targetHigh`), and "Low Target" (`targetLow`).
          * **Right:** A Chart.js Doughnut chart (using `<canvas id="analystChart">`) visualizing the ratings: `strongBuy`, `buy`, `hold`, `sell`, `strongSell`.
  * **Section 4: Quarterly Trends (`id="quarterly"`)**
      * Display `mainTicker.quarterlyFinancials` data.
      * Use a Chart.js Bar chart (using `<canvas id="quarterlyChart">`) to show `revenue` and `netIncome` over time. The x-axis should use the `dates` array.
  * **Section 5: Fundamental Analysis (`id="fundamental"`)**
      * Display data from the JSON in clean, Tailwind-styled tables or cards.
      * **Key Financials (TTM):** `mainTicker.revenueTTM`, `mainTicker.netIncomeTTM`, `mainTicker.epsTTM`, `mainTicker.operatingCashflowTTM`, `mainTicker.freeCashflowTTM`.
      * **Key Ratios:** `mainTicker.peTTM`, `mainTicker.psTTM`, `mainTicker.pbTTM`, `mainTicker.profitMargin`, `mainTicker.roa`, `mainTicker.roe`.
      * **Balance Sheet:** `mainTicker.debtToEquity`, `mainTicker.currentRatio`.
      * **Dividend Information:** `mainTicker.dividendYield`, `mainTicker.payoutRatio`.
  * **Section 6: Analysis & Interpretation (`id="interpretation"`)**
      * Provide technical, plain-English explanations for the key ratios from Section 5.
      * Explain the *meaning* (what it measures) and the *significance* (is this good/bad/neutral for the company and why) for at least P/E, Profit Margin, Current Ratio, ROE, and Debt-to-Equity, using the *actual values* from the JSON.
  * **Section 7: SWOT Analysis (`id="swot"`)**
      * (Must be AI-generated, as this is not in the JSON).
      * Create a 4-quadrant layout (`tw-grid tw-grid-cols-2`).
  * **Section 8: Market & Competitor Analysis (`id="market"`)**
      * **Sector Performance:** (Must be AI-generated, as this is not in the JSON).
      * **Direct Competitor Comparison:** Use the `competitors` object from the JSON. Create a table comparing the main ticker and its competitors on `marketCap`, `peTTM`, `revenueGrowthYoY`, and `profitMargin`.
      * **Table Styling:** In the competitor table, ensure all data cells are right-aligned (`tw-text-right`).
  * **Section 9: Benchmark Comparison (`id="benchmark"`)**
      * **Performance Metrics (Table):** Use `mainTicker.ytdReturn`, `mainTicker.oneYearReturn`, `mainTicker.threeYearReturn`. Compare against `benchmark.ytdReturn`, `benchmark.oneYearReturn`, `benchmark.threeYearReturn`.
      * **Volatility (Card):** Use `mainTicker.beta`.
      * **Visual Chart:** (AI-generate this simple HTML/Tailwind bar chart).
  * **Section 10: Price Chart (`id="chart"`)**
      * Include a `div` with `id="priceChartDiv"`.
      * The inline script (defined in Body) will fetch `charts/[TICKER]_[YYMMDD].json` and render the Plotly chart here.
  * **Section 11: Disclaimer (`id="disclaimer"`)**
      * Include *only* the standard disclaimer text.

-----

### **PART 2: SOCIAL MEDIA SUMMARY (`[TICKER]_social.md`)**

  * Create a separate markdown file.
  * Provide a catchy 2-3 sentence summary of the report's conclusion, suitable for a social media post (e.g., LinkedIn, Blogger).
  * Include a list of relevant hashtags.
  * Include the full link to the report: `https://tonynahra.github.io/posts/[TICKER]_[YYMMDD].html`.
