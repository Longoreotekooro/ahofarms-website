// The dashboard framework for each portal: the sections it will carry and
// the resources inside them. Served only through /api/portal/home after
// the session and role have been verified, so nothing here reaches an
// unauthenticated browser. Every resource is a placeholder today
// (status 'coming'); as real material is added, give it a status of
// 'available' and an href (a protected file under /portal/<id>/files/ or
// an API route) and it appears in the dashboard without any redesign.
//
// Shape: { sections: [{ id, nav, eyebrow, title, lead, items: [{ title, note, status, href?, kind?, meta?, specs?, action? }] }] }
// kind hints the card icon: 'product' | 'document' | 'data' | 'guide' | 'update' | 'contact'.
// meta: one short line under the title (e.g. "Indica-dominant hybrid · Dried flower · 10 g").
// specs: [[label, value], ...] rendered as a compact spec list on the card.
// action: label for the card's link (default "Open").
// Files live under /portal/<id>/files/ so middleware.js protects them like any portal page.

const coming = (title, note, kind = 'document') => ({ title, note, status: 'coming', kind });
const live = (title, note, href, extra = {}) => ({ title, note, status: 'available', href, kind: 'document', ...extra });

// The 2026 flower range (range sheet supplied 2026-09-22): three
// indica-dominant dried-flower cultivars, all positioned at the evening /
// restorative end of the Aho day-night scale. Values are nominal label
// claims; terpene values are batch-specific; the batch Certificate of
// Analysis carries verified results. Profile and matrix ratings are the
// sheet's guidance on cannabinoid and terpene content, not clinical
// indications. ●●● strong · ●●○ moderate · ●○○ mild
const RANGE_PDF = id => `/portal/${id}/files/aho-flower-range-2026.pdf`;
const RANGE = [
  { key: 'wake-n-cake', name: 'Wake N Cake', line: 'SOURCE · New Zealand', genetics: 'Indica-dominant', thc: '22%', cbd: '<1%',
    format: 'Dried flower, indoor', unit: '15 g', rrp: '$99 RRP per unit', perG: '$6.60 per g',
    summary: 'Best suited for patients requiring strong evening analgesia with sleep support.',
    time: 'Evening', cls: 'Balanced', sedation: 'High ●●●',
    profile: 'Pain ●●● · Sleep ●●● · Anxiety ●●○ · Inflammation ●●○', matrix: 'Functional ●○○ · Pain ●●● · Sleep ●●● · Anxiety ●●○',
    terpenes: 'β-Myrcene 7.1 · δ-Limonene 5.8 · β-Caryophyllene 5.0 · α-Humulene 2.2 · β-Pinene 0.6',
    origin: 'Cultivated by Helius Therapeutics, NZ; reintroduced under Aho Farms with full traceability retained',
    cultivation: 'Indoor, Total Controlled Environment Agriculture; irradiated; GMP and GACP', sheet: 'source-wake-n-cake-product-sheet.pdf' },
  { key: 'wedding-cake', name: 'Wedding Cake', line: 'SOURCE · New Zealand', genetics: 'Indica-dominant', thc: '24%', cbd: '<1%',
    format: 'Dried flower, indoor', unit: '15 g', rrp: '$99 RRP per unit', perG: '$6.60 per g',
    summary: 'Balanced evening cultivar supporting pain relief while maintaining mood.',
    time: 'Evening', cls: 'Restorative', sedation: 'Medium ●●○',
    profile: 'Pain ●●● · Sleep ●●○ · Anxiety ●●● · Inflammation ●●○', matrix: 'Functional ●●○ · Pain ●●● · Sleep ●●○ · Anxiety ●●●',
    terpenes: 'β-Myrcene 7.8 · δ-Limonene 6.0 · β-Caryophyllene 5.4 · α-Humulene 2.5 · β-Pinene 0.9',
    origin: 'Cultivated by Helius Therapeutics, NZ; reintroduced under Aho Farms with full traceability retained',
    cultivation: 'Indoor, Total Controlled Environment Agriculture; irradiated; GMP and GACP', sheet: 'source-wedding-cake-product-sheet.pdf' },
  { key: 'oreo', name: 'Oreo', line: 'RĀ · Sun dried', genetics: 'Indica-dominant', thc: '20%', cbd: '<1%',
    format: 'Dried flower, greenhouse', unit: '10 g', rrp: '$89 RRP per unit', perG: '$8.90 per g',
    summary: 'Calming cultivar suited to inflammatory pain and evening anxiety.',
    time: 'Evening', cls: 'Restorative', sedation: 'High ●●●',
    profile: 'Pain ●●○ · Sleep ●●○ · Anxiety ●●● · Inflammation ●●●', matrix: 'Functional ●○○ · Pain ●●○ · Sleep ●●○ · Anxiety ●●●',
    terpenes: 'β-Caryophyllene 3.2 · δ-Limonene 2.4 · α-Humulene 1.1 · Guaiol 0.8 · Linalool 0.7',
    origin: 'Estate-grown by Aho Farms, Hawke\'s Bay, in living soil', cultivation: 'Greenhouse, sun dried; GMP-aligned with full batch traceability',
    sheet: 'ra-oreo-product-sheet.pdf' },
];
// Clinical view (prescribers): profile, positioning and terpenes, no pricing.
const SHEET = (portalId, r) => `/portal/${portalId}/files/${r.sheet}`;
const clinicalCard = (portalId, r) => ({
  title: `${r.line.split(' · ')[0]} · ${r.name}`, kind: 'product', status: 'available', href: SHEET(portalId, r), action: 'Cultivar sheet (PDF)',
  meta: `${r.genetics} · ${r.format} · ${r.unit}`, note: r.summary,
  specs: [['THC / CBD', `${r.thc} / ${r.cbd}`], ['Time of day', `${r.time} · ${r.cls}`], ['Sedation', r.sedation], ['Clinical profile', r.profile],
          ['Prescribing matrix', r.matrix], ['Dominant terpenes (mg/g)', r.terpenes], ['Origin', r.origin], ['Cultivation', r.cultivation]],
});
// Commercial view (pharmacies): format, pack, pricing and positioning.
const commercialCard = (portalId, r) => ({
  title: `${r.line.split(' · ')[0]} · ${r.name}`, kind: 'product', status: 'available', href: SHEET(portalId, r), action: 'Product sheet (PDF)',
  meta: `${r.genetics} · ${r.format} · ${r.unit}`, note: r.summary,
  specs: [['THC / CBD', `${r.thc} / ${r.cbd}`], ['Unit size', r.unit], ['Pricing', `${r.rrp} · ${r.perG}`], ['Positioning', `${r.time} · ${r.cls}`],
          ['Dominant terpenes (mg/g)', r.terpenes], ['Origin', r.origin], ['Storage', 'Below 25°C in original packaging, away from light and moisture']],
});
const sheetDoc = (portalId, r, note) => live(`${r.line.split(' · ')[0]} · ${r.name} product sheet`, note, SHEET(portalId, r), { action: 'Open PDF' });

export const CONTENT = {
  prescriber: {
    headline: 'Prescribing resources, in one place.',
    lead: 'Product specifications, Certificates of Analysis and prescriber guides for the current Aho Farms range. Everything a clinician needs to prescribe with confidence, easy to find.',
    sections: [
      { id: 'products', nav: 'Products', eyebrow: '01 · Products', title: 'Current Aho Farms medicinal cannabis products', lead: 'The range available to prescribe today, with detailed specifications for each product.',
        items: [
          ...RANGE.map(r => clinicalCard('prescriber', r)),
          live('Day / night product positioning', 'All three 2026 cultivars sit at the evening / restorative end of the Aho scale: Wake N Cake balanced with high sedation, Wedding Cake restorative with medium sedation, Oreo restorative with high sedation. The range sheet shows the scale and the clinical interpretation guide.', RANGE_PDF('prescriber'), { kind: 'guide', action: 'Range sheet (PDF)' }),
          coming('Detailed product specifications', 'Format, strength, packaging, storage and shelf life for every product.', 'document'),
        ] },
      { id: 'analysis', nav: 'Analysis', eyebrow: '02 · Analysis', title: 'Certificates and profiles', lead: 'Batch-level laboratory results, and the cannabinoid and terpene profiles behind each product.',
        items: [
          coming('Certificates of Analysis', 'Independent laboratory certificates by batch, downloadable as PDF.', 'document'),
          coming('Cannabinoid profiles', 'THC, CBD and minor cannabinoid content by product and batch.', 'data'),
          coming('Terpene profiles', 'Dominant terpenes and full profiles by product and batch.', 'data'),
        ] },
      { id: 'guides', nav: 'Prescribing', eyebrow: '03 · Prescribing', title: 'Prescriber guides and clinical resources', lead: 'Practical guidance for prescribing Aho Farms products under the New Zealand Medicinal Cannabis Scheme.',
        items: [
          live('Flower range sheet 2026', 'Clinical summaries, primary clinical profiles, the clinical interpretation guide (functional · balanced · restorative) and the prescribing matrix for the three cultivars. Prescriber information only; not for patient distribution.', RANGE_PDF('prescriber'), { kind: 'guide', action: 'Open PDF' }),
          sheetDoc('prescriber', RANGE[0], 'Cultivar sheet: characteristics, reported profile and evidence basis, cultivation and quality, preparation, storage, testing.'),
          sheetDoc('prescriber', RANGE[1], 'Cultivar sheet: characteristics, reported profile and evidence basis, cultivation and quality, preparation, storage, testing.'),
          sheetDoc('prescriber', RANGE[2], 'Two-page cultivar sheet: characteristics, patient use, preparation, storage, testing and batch traceability.'),
          coming('Prescriber product guides', 'One guide per product: indications, starting points, titration and counselling notes.', 'guide'),
          coming('Clinical and educational resources', 'Evidence summaries, interaction considerations and patient education material.', 'guide'),
          coming('Downloadable practitioner resources', 'Printable patient handouts, dosing diaries and reference cards.', 'document'),
        ] },
      { id: 'quality', nav: 'Quality', eyebrow: '04 · Quality', title: 'Quality and cultivation information', lead: 'How the products are grown, tested and released, from the whenua to the dispensary.',
        items: [
          coming('Quality system overview', 'GMP-aligned production, testing regime and release criteria.', 'document'),
          coming('Cultivation information', 'Estate cultivation at Raupunga: environment, practice and traceability.', 'guide'),
        ] },
      { id: 'updates', nav: 'Updates', eyebrow: '05 · Updates', title: 'Product updates', lead: 'New batches, presentation changes and scheme updates as they happen.',
        items: [ coming('Product update log', 'A dated record of every change to the range.', 'update') ] },
    ],
  },
  pharmacy: {
    headline: 'Supply and product information, without the detour.',
    lead: 'Range, specifications, availability, wholesale and ordering information for pharmacy teams. Commercial information first, documentation a click away.',
    sections: [
      { id: 'range', nav: 'Range', eyebrow: '01 · Range', title: 'Current product range and availability', lead: 'What is available to order now, what is coming, and the specification for each line.',
        items: [
          ...RANGE.map(r => commercialCard('pharmacy', r)),
          coming('Product range and availability', 'Live availability by product and batch, with lead times.', 'product'),
          coming('Product specifications', 'Format, strength, pack size, storage and shelf life.', 'document'),
          coming('Packaging information', 'Unit and outer packaging, labelling and barcodes.', 'document'),
        ] },
      { id: 'commercial', nav: 'Commercial', eyebrow: '02 · Commercial', title: 'Wholesale, pricing and ordering', lead: 'Terms and pricing for approved pharmacy accounts, and how to place an order.',
        items: [
          coming('Wholesale information', 'Account terms, minimum quantities and delivery.', 'document'),
          live('Recommended retail pricing', 'Wake N Cake and Wedding Cake (SOURCE, 15 g): $99 RRP per unit, $6.60 per g. Oreo (RĀ, 10 g): $89 RRP per unit, $8.90 per g. Wholesale terms for your account will be listed here.', RANGE_PDF('pharmacy'), { kind: 'data', action: 'Range sheet (PDF)' }),
          coming('Ordering information', 'How to order, order cut-offs and dispatch schedule.', 'guide'),
          coming('Distribution information', 'Distribution partners and coverage by region.', 'guide'),
        ] },
      { id: 'documents', nav: 'Documents', eyebrow: '03 · Documentation', title: 'Certificates and product documentation', lead: 'Batch documentation for dispensing and record-keeping.',
        items: [
          coming('Certificates of Analysis', 'Independent laboratory certificates by batch, downloadable as PDF.', 'document'),
          live('Flower range sheet 2026', 'One-page range overview: the three cultivars, format, unit size, pricing, clinical profiles and dominant terpenes. Healthcare professional use only.', RANGE_PDF('pharmacy'), { action: 'Open PDF' }),
          sheetDoc('pharmacy', RANGE[0], 'Cultivar sheet: specification, cultivation and quality, preparation, storage and testing.'),
          sheetDoc('pharmacy', RANGE[1], 'Cultivar sheet: specification, cultivation and quality, preparation, storage and testing.'),
          sheetDoc('pharmacy', RANGE[2], 'Two-page cultivar sheet: specification, terpene profile, preparation, storage, testing and batch traceability.'),
          coming('Product documentation', 'Product information leaflets and dispensing guidance.', 'document'),
          coming('Downloadable pharmacy resources', 'Counter reference cards and patient handouts.', 'document'),
        ] },
      { id: 'updates', nav: 'Updates', eyebrow: '04 · Updates', title: 'Supply updates', lead: 'Batch releases, stock movements and any change to supply.',
        items: [ coming('Supply update log', 'A dated record of releases and supply notices.', 'update') ] },
    ],
  },
  'export-partner': {
    headline: 'Capability, catalogue and due diligence.',
    lead: 'A commercial data room for qualified international partners: what Aho Farms grows, how it is produced and tested, what capacity exists, and the documentation behind it.',
    sections: [
      { id: 'catalogue', nav: 'Catalogue', eyebrow: '01 · Catalogue', title: 'Export product catalogue', lead: 'Cultivars, formats and bulk specifications available for international supply.',
        items: [
          coming('Export product catalogue', 'Products and formats available for export, by market.', 'product'),
          coming('Available strains and cultivars', 'Cultivar profiles with cannabinoid and terpene ranges.', 'product'),
          coming('Bulk product specifications', 'Bulk flower and intermediate specifications.', 'document'),
          coming('Cannabinoid and terpene profiles', 'Profile data by cultivar and batch.', 'data'),
        ] },
      { id: 'production', nav: 'Production', eyebrow: '02 · Production', title: 'Current and upcoming production', lead: 'What is in the ground, what is in the glasshouse, and when it lands.',
        items: [
          coming('Production schedule', 'Current and forecast harvests by cultivar and format.', 'data'),
          coming('Supply capacity', 'Annual capacity and scalable volume.', 'data'),
          coming('Minimum order information', 'Minimum quantities, lead times and incoterms.', 'document'),
        ] },
      { id: 'capability', nav: 'Capability', eyebrow: '03 · Capability', title: 'Cultivation, processing and packaging', lead: 'How the product is grown and prepared, and what can be done to order.',
        items: [
          coming('Cultivation information', 'Estate cultivation at Raupunga, Hawke\'s Bay: environment, practice and traceability.', 'guide'),
          coming('Processing capabilities', 'Drying, curing, trimming and intermediate processing.', 'guide'),
          coming('Packaging capabilities', 'Bulk and retail-ready packaging options.', 'guide'),
        ] },
      { id: 'compliance', nav: 'Due diligence', eyebrow: '04 · Due diligence', title: 'Quality, compliance and licences', lead: 'The documentation a partner needs to complete due diligence.',
        items: [
          coming('Quality documentation', 'Quality system, testing regime and release process.', 'document'),
          coming('Compliance documentation', 'Regulatory standing and scheme compliance.', 'document'),
          coming('Export-related licences and supporting documents', 'Licences and permits where appropriate to share.', 'document'),
          coming('Certificates of Analysis', 'Independent laboratory certificates by batch.', 'document'),
          coming('Downloadable technical documentation', 'Technical dossiers and specifications as PDF.', 'document'),
        ] },
      { id: 'markets', nav: 'Markets', eyebrow: '05 · Markets', title: 'International market information', lead: 'Markets Aho Farms can supply, and the pathway into each.',
        items: [ coming('Market information', 'Permitted markets, import requirements and current partners.', 'guide') ] },
    ],
  },
};

export function contentFor(portalId) { return CONTENT[portalId] || null; }
