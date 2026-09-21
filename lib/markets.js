// The markets Aho Farms serves, and the regions used for routing and the
// consumer form. Also the request-access country list (lib/portals.js
// re-exports COUNTRIES from here).
export const COUNTRIES = ['New Zealand', 'Australia', 'Germany', 'United Kingdom'];

export const REGIONS = {
  'New Zealand': ['Northland', 'Auckland', 'Waikato', 'Bay of Plenty', 'Gisborne', "Hawke's Bay", 'Taranaki', 'Manawatū-Whanganui', 'Wellington', 'Tasman', 'Nelson', 'Marlborough', 'West Coast', 'Canterbury', 'Otago', 'Southland'],
  'Australia': ['New South Wales', 'Victoria', 'Queensland', 'Western Australia', 'South Australia', 'Tasmania', 'Australian Capital Territory', 'Northern Territory'],
  'Germany': ['Baden-Württemberg', 'Bavaria', 'Berlin', 'Brandenburg', 'Bremen', 'Hamburg', 'Hesse', 'Lower Saxony', 'Mecklenburg-Vorpommern', 'North Rhine-Westphalia', 'Rhineland-Palatinate', 'Saarland', 'Saxony', 'Saxony-Anhalt', 'Schleswig-Holstein', 'Thuringia'],
  'United Kingdom': ['London', 'South East', 'South West', 'East of England', 'East Midlands', 'West Midlands', 'Yorkshire and the Humber', 'North West', 'North East', 'Scotland', 'Wales', 'Northern Ireland'],
};

export const CONTACT_METHODS = ['Email', 'Phone', 'Either'];
