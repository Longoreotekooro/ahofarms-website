// The dashboard framework for each portal: the sections it will carry and
// the resources inside them. Served only through /api/portal/home after
// the session and role have been verified, so nothing here reaches an
// unauthenticated browser. Every resource is a placeholder today
// (status 'coming'); as real material is added, give it a status of
// 'available' and an href (a protected file under /portal/<id>/files/ or
// an API route) and it appears in the dashboard without any redesign.
//
// Shape: { sections: [{ id, nav, eyebrow, title, lead, items: [{ title, note, status, href?, kind? }] }] }
// kind hints the card icon: 'product' | 'document' | 'data' | 'guide' | 'update' | 'contact'.

const coming = (title, note, kind = 'document') => ({ title, note, status: 'coming', kind });

export const CONTENT = {
  prescriber: {
    headline: 'Prescribing resources, in one place.',
    lead: 'Product specifications, Certificates of Analysis and prescriber guides for the current Aho Farms range. Everything a clinician needs to prescribe with confidence, easy to find.',
    sections: [
      { id: 'products', nav: 'Products', eyebrow: '01 · Products', title: 'Current Aho Farms medicinal cannabis products', lead: 'The range available to prescribe today, with detailed specifications for each product.',
        items: [
          coming('RĀ · dried medicinal cannabis flower', 'Estate-grown by Aho Farms in Hawke\'s Bay. Specification, presentation and day / night positioning.', 'product'),
          coming('SOURCE · dried medicinal cannabis flower', 'Cultivated in New Zealand, reintroduced under Aho Farms. Specification and positioning.', 'product'),
          coming('Detailed product specifications', 'Format, strength, packaging, storage and shelf life for every product.', 'document'),
          coming('Day / night product positioning', 'How each product sits across the day for patient conversations.', 'guide'),
        ] },
      { id: 'analysis', nav: 'Analysis', eyebrow: '02 · Analysis', title: 'Certificates and profiles', lead: 'Batch-level laboratory results, and the cannabinoid and terpene profiles behind each product.',
        items: [
          coming('Certificates of Analysis', 'Independent laboratory certificates by batch, downloadable as PDF.', 'document'),
          coming('Cannabinoid profiles', 'THC, CBD and minor cannabinoid content by product and batch.', 'data'),
          coming('Terpene profiles', 'Dominant terpenes and full profiles by product and batch.', 'data'),
        ] },
      { id: 'guides', nav: 'Prescribing', eyebrow: '03 · Prescribing', title: 'Prescriber guides and clinical resources', lead: 'Practical guidance for prescribing Aho Farms products under the New Zealand Medicinal Cannabis Scheme.',
        items: [
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
          coming('Product range and availability', 'Live availability by product and batch, with lead times.', 'product'),
          coming('Product specifications', 'Format, strength, pack size, storage and shelf life.', 'document'),
          coming('Packaging information', 'Unit and outer packaging, labelling and barcodes.', 'document'),
        ] },
      { id: 'commercial', nav: 'Commercial', eyebrow: '02 · Commercial', title: 'Wholesale, pricing and ordering', lead: 'Terms and pricing for approved pharmacy accounts, and how to place an order.',
        items: [
          coming('Wholesale information', 'Account terms, minimum quantities and delivery.', 'document'),
          coming('Pharmacy pricing', 'Current wholesale pricing where applicable to your account.', 'data'),
          coming('Ordering information', 'How to order, order cut-offs and dispatch schedule.', 'guide'),
          coming('Distribution information', 'Distribution partners and coverage by region.', 'guide'),
        ] },
      { id: 'documents', nav: 'Documents', eyebrow: '03 · Documentation', title: 'Certificates and product documentation', lead: 'Batch documentation for dispensing and record-keeping.',
        items: [
          coming('Certificates of Analysis', 'Independent laboratory certificates by batch, downloadable as PDF.', 'document'),
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
