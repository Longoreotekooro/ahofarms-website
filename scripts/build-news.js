// Builds the four articles migrated from the current Aho Farms website.
// The published wording is intentionally preserved for compliance review.
const fs = require('fs');
const path = require('path');
const SITE = require('../site.json');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'news');
const esc = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const articles = [
  {
    slug: 'medicinal-cannabis-nz',
    title: 'Navigating the medicinal cannabis landscape in Aotearoa',
    description: 'Understanding New Zealand’s Medicinal Cannabis Scheme, access for patients, and the rigorous quality standards that ensure safety and efficacy.',
    category: 'Medicinal cannabis',
    date: '2024-02-12',
    displayDate: '12 February 2024',
    image: '/assets/aho-cultivation-hero-flower.jpg',
    imageAlt: 'Medicinal cannabis flower growing at Aho Farms',
    imageWidth: 1207,
    imageHeight: 957,
    body: `
      <p>Since the implementation of the Medicinal Cannabis Scheme in April 2020, New Zealand has taken significant strides in making medicinal cannabis accessible to patients who need it most.</p>
      <h2>The medicinal cannabis scheme</h2>
      <p>The Scheme’s primary goal is to improve access to quality medicinal cannabis products for patients. It establishes strict minimum quality standards that all products—whether imported or domestically produced—must meet. This ensures that patients receive products that are safe, consistent, and free from harmful contaminants.</p>
      <h2>Access for patients</h2>
      <p>In New Zealand, medicinal cannabis is a prescription-only medicine. Patients cannot purchase it over the counter but must consult with a registered medical practitioner—such as a GP or specialist.</p>
      <ol class="article-steps">
        <li><strong>Consultation</strong>A doctor assesses the patient's condition and history to determine suitability.</li>
        <li><strong>Prescription</strong>If appropriate, a prescription is issued for a specific product tailored to the needs.</li>
        <li><strong>Dispensing</strong>The product is dispensed via a pharmacy, ensuring full regulatory oversight.</li>
      </ol>
      <p>Common conditions prescribed for include chronic pain, anxiety, and sleep disorders, though the decision always rests with the medical professional.</p>
      <h2>Quality &amp; safety</h2>
      <p>One of the most critical aspects of the NZ regime is the focus on GMP (Good Manufacturing Practice). At Aho Farms, we adhere to these rigorous standards. Unlike the illicit market, medicinal cannabis products in NZ are tested for:</p>
      <ul>
        <li>Microbial contamination</li>
        <li>Heavy metals</li>
        <li>Pesticides</li>
        <li>Accurate cannabinoid content</li>
      </ul>
      <h2>Looking ahead</h2>
      <p>As the industry matures, we expect to see more New Zealand-grown products entering the market, potentially lowering costs and increasing variety for patients. Aho Farms is proud to be part of this future, cultivating premium flower right here in Hawke's Bay.</p>`,
  },
  {
    slug: 'kaitiakitanga-land-wellness',
    title: 'Kaitiakitanga: A Māori approach to land & wellness',
    description: 'How guardianship guides our cultivation practices, honoring the whenua for future generations.',
    category: 'Culture & heritage',
    date: '2024-02-10',
    displayDate: '10 February 2024',
    image: '/assets/aho-origin-hero-waharoa.jpg',
    imageAlt: 'Waharoa and whenua at Aho Farms in Hawke’s Bay',
    imageWidth: 1600,
    imageHeight: 1200,
    body: `
      <p>At Aho Farms, we don't just farm the land; we care for it. This philosophy is rooted in Kaitiakitanga, the Māori concept of guardianship and protection.</p>
      <h2>More than ownership</h2>
      <p>Kaitiakitanga goes beyond the Western concept of land ownership. It is a deep relationship between the people and the natural world. As descendants of Te Hapuku, we view the land (whenua) not as a commodity, but as an ancestor that sustains us. In return, we have a reciprocal obligation to nurture and protect it.</p>
      <h2>Applying Kaitiakitanga to modern cultivation</h2>
      <p>In the context of our medicinal cannabis operations, this means:</p>
      <ul class="article-features">
        <li><strong>Sustainable Practices</strong>We use methods that regenerate the soil rather than deplete it, ensuring long-term fertility.</li>
        <li><strong>Water Management</strong>Protecting our waterways and using water resources efficiently through smart irrigation.</li>
        <li><strong>Long-term Vision</strong>We make decisions based on their impact 100 years from now, not just the next financial quarter.</li>
      </ul>
      <h2>Whanaungatanga (connection)</h2>
      <p>Our approach also emphasizes Whanaungatanga—connection and relationship. This extends to our community in Hawke's Bay. By developing this land, we aim to provide employment and economic independence for our whānau, ensuring that the benefits of the land are shared.</p>
      <p>When you choose Aho Farms, you are supporting a model of business that values people and planet equally with profit. It is a modern expression of ancient wisdom, bringing the healing properties of the plant to the world while honoring the earth that grew it.</p>`,
  },
  {
    slug: 'sustainable-sun-grown',
    title: 'Why sun-grown cannabis matters: Sustainability & quality',
    description: 'Exploring the environmental benefits of outdoor cultivation and natural sunlight.',
    category: 'Sustainability',
    date: '2024-02-05',
    displayDate: '5 February 2024',
    image: '/assets/aho-products-rooted-coast.jpg',
    imageAlt: 'Sunlit Hawke’s Bay landscape where Aho Farms grows medicinal cannabis',
    imageWidth: 2200,
    imageHeight: 962,
    body: `
      <p>In an era where sustainability is paramount, methods of cultivation matter. At Aho Farms, we harness the power of the sun to grow our medicinal cannabis, a choice that benefits both the planet and the patient.</p>
      <h2>The carbon footprint problem</h2>
      <p>Indoor cannabis cultivation is notoriously energy-intensive. It relies on high-powered artificial lights, dehumidifiers, and climate control systems running 24/7.</p>
      <p>By contrast, sun-grown (or greenhouse) cannabis utilizes the earth's natural light source. This drastically reduces electricity consumption and environmental impact.</p>
      <h2>The full spectrum advantage</h2>
      <p>Beyond sustainability, the sun offers something no bulb can fully replicate: a complete, natural light spectrum.</p>
      <ul class="article-features">
        <li><strong>Terpene Development</strong>UV rays in natural sunlight stimulate richer, more complex profiles of terpenes as a natural defense.</li>
        <li><strong>Entourage Effect</strong>Natural complexity enhances therapeutic efficacy through the combined action of plant compounds.</li>
      </ul>
      <h2>Hawke's Bay: The perfect climate</h2>
      <p>Our location in Hawke's Bay provides an ideal microclimate for horticulture. High sunshine hours and fertile soil allow us to grow vigorous, healthy plants with minimal artificial intervention.</p>
      <p>Choosing sun-grown is a choice for a greener future. It proves that we can produce premium medicinal products without costing the earth.</p>`,
  },
  {
    slug: 'innovation-extraction',
    title: 'The future of extraction: Beyond solvent-based methods',
    description: 'Exploring the next generation of clean, solventless technologies and patient safety.',
    category: 'Innovation',
    date: '2024-01-28',
    displayDate: '28 January 2024',
    image: '/assets/aho-indoor-cultivation.jpg',
    imageAlt: 'Controlled medicinal cannabis cultivation at Aho Farms',
    imageWidth: 900,
    imageHeight: 1200,
    body: `
      <p>As the medicinal cannabis industry matures, the demand for pure, high-quality extracts is growing. At Aho Farms, we are exploring the next generation of extraction technologies.</p>
      <h2>Purity matters</h2>
      <p>Traditional extraction methods often use solvents like ethanol or butane. While effective, they require extensive post-processing to remove residual chemicals. We believe the future lies in cleaner, solventless methods that preserve the plant's natural profile.</p>
      <h2>Rosin and ice water extraction</h2>
      <p>Techniques such as ice water hash and rosin pressing use mechanical separation and heat to extract trichomes. This results in a product that is:</p>
      <ul class="article-features">
        <li><strong>Cleaner</strong>Zero chemical residues or solvent artifacts in the final medicine.</li>
        <li><strong>Fuller Spectrum</strong>Superior preservation of delicate, volatile terpenes often lost in solvent recovery.</li>
        <li><strong>True to Plant</strong>An accurate representation of the original flower's aromatic and therapeutic profile.</li>
      </ul>
      <h2>Our commitment to innovation</h2>
      <p>Aho Farms is committed to staying at the forefront of these developments. By combining our sun-grown flower with cutting-edge, clean extraction methods, we aim to produce medicinal products of unparalleled quality and safety for patients in New Zealand and beyond.</p>`,
  },
];

function page(article, index) {
  const url = `${SITE.url}/news/${article.slug}`;
  const previous = articles[index - 1];
  const next = articles[index + 1];
  const structured = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    datePublished: article.date,
    dateModified: article.date,
    image: SITE.url + article.image,
    mainEntityOfPage: url,
    author: { '@type': 'Organization', name: SITE.name, url: SITE.url + '/' },
    publisher: { '@type': 'Organization', name: SITE.name, url: SITE.url + '/' },
  };
  return `<!DOCTYPE html>
<html lang="en" class="aho-nav-solid">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(article.title)} | Aho Farms</title>
  <meta name="description" content="${esc(article.description)}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="Aho Farms">
  <meta property="og:title" content="${esc(article.title)}">
  <meta property="og:description" content="${esc(article.description)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${SITE.url + article.image}">
  <meta property="article:published_time" content="${article.date}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(article.title)}">
  <meta name="twitter:description" content="${esc(article.description)}">
  <meta name="twitter:image" content="${SITE.url + article.image}">
  <script type="application/ld+json">${JSON.stringify(structured).replace(/</g, '\\u003c')}</script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400;1,500&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <!-- AHO:CHROME:CSS:START - generated by scripts/propagate-chrome.js, do not edit by hand -->
  <!-- AHO:CHROME:CSS:END -->
  <link rel="stylesheet" href="../assets/aho-article.css">
</head>
<body>
<!-- AHO:NAV:START - generated by scripts/propagate-nav.js, do not edit by hand -->
<nav aria-label="Main"></nav>
<!-- AHO:NAV:END -->
<main id="main" class="article-main">
  <header class="article-hero">
    <div class="article-hero__inner">
      <a class="article-back" href="/news"><span aria-hidden="true">←</span> Back to news</a>
      <p class="article-meta"><span class="article-meta__category">${esc(article.category)}</span><time datetime="${article.date}">${article.displayDate}</time></p>
      <h1>${esc(article.title)}</h1>
    </div>
  </header>
  <figure class="article-figure"><img src="${article.image}" alt="${esc(article.imageAlt)}" width="${article.imageWidth}" height="${article.imageHeight}" loading="eager" fetchpriority="high"></figure>
  <div class="article-layout">
    <article class="article-body">
${article.body}
    </article>
    <nav class="article-nav" aria-label="Article navigation">
      ${previous ? `<a href="/news/${previous.slug}">← ${esc(previous.title)}</a>` : '<span></span>'}
      ${next ? `<a href="/news/${next.slug}">${esc(next.title)} →</a>` : '<a href="/news">All news →</a>'}
    </nav>
  </div>
</main>
<!-- AHO:FOOTER:START - generated by scripts/propagate-nav.js, do not edit by hand -->
<footer></footer>
<!-- AHO:FOOTER:END -->
<!-- AHO:CHROME:JS:START - generated by scripts/propagate-chrome.js, do not edit by hand -->
<!-- AHO:CHROME:JS:END -->
</body>
</html>
`;
}

fs.mkdirSync(OUT, { recursive: true });
articles.forEach((article, index) => fs.writeFileSync(path.join(OUT, article.slug + '.html'), page(article, index)));
console.log(`news: ${articles.length} migrated articles written`);
