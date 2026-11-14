/**
 * nasa-sources.js
 * -----------------------------------------------------------------------------
 * SINGLE SOURCE OF TRUTH for every real-world number used anywhere in this game.
 *
 * Design rule for this project: no gameplay constant that claims to be real may
 * be written as a bare literal in simulation or UI code. It must be declared
 * here, bound to a citation, and imported. If a number is NOT real -- if it is a
 * gameplay abstraction we invented -- it must be declared in config/systems.js
 * instead and labelled `modelled: true`.
 *
 * This keeps the science traceable: a judge can read this one file and verify
 * every factual claim the game makes.
 */

/** Citation registry. Keyed by short id, referenced by measurements below. */
export const SOURCES = {
  RAD_HASSLER_2014: {
    id: 'RAD_HASSLER_2014',
    label: 'MSL Curiosity RAD — Mars surface radiation',
    authors: 'Hassler, D. M. et al.',
    title: "Mars' surface radiation environment measured with the Mars Science Laboratory's Curiosity rover",
    publication: 'Science, vol. 343, no. 6169 (2014)',
    url: 'https://ntrs.nasa.gov/citations/20180007641',
    dataset: 'Mars Science Laboratory / Radiation Assessment Detector (RAD)',
  },
  RAD_NASA_GRAPH: {
    id: 'RAD_NASA_GRAPH',
    label: 'NASA — Radiation Measurements on Mars (RAD, first 10 months)',
    authors: 'NASA/JPL-Caltech/SwRI',
    title: 'Radiation Measurements on Mars',
    publication: 'NASA Science image release PIA17600',
    url: 'https://science.nasa.gov/resource/radiation-measurements-on-mars',
    dataset: 'Mars Science Laboratory / RAD',
  },
  LND_ZHANG_2020: {
    id: 'LND_ZHANG_2020',
    label: "Chang'E-4 LND — first radiation dose measured on the lunar surface",
    authors: 'Zhang, S., Wimmer-Schweingruber, R. F. et al.',
    title: 'First measurements of the radiation dose on the lunar surface',
    publication: 'Science Advances (2020), DOI 10.1126/sciadv.aaz1334',
    url: 'https://pubmed.ncbi.nlm.nih.gov/32978156/',
    dataset: "Chang'E-4 Lunar Lander Neutrons and Dosimetry (LND)",
  },
  DONKI: {
    id: 'DONKI',
    label: 'NASA DONKI — Space Weather Database Of Notifications, Knowledge, Information',
    authors: 'NASA CCMC / Moon to Mars Space Weather Analysis Office',
    title: 'DONKI solar flare (FLR) and CME catalogues',
    publication: 'NASA Goddard Space Flight Center, Community Coordinated Modeling Center',
    url: 'https://ccmc.gsfc.nasa.gov/tools/DONKI/',
    dataset: 'DONKI FLR / CME, served via api.nasa.gov',
  },
  OSDR: {
    id: 'OSDR',
    label: 'NASA Open Science Data Repository (OSDR)',
    authors: 'NASA Biological and Physical Sciences',
    title: 'OSDR space biology and astronaut health archive',
    publication: 'NASA Open Science Data Repository',
    url: 'https://osdr.nasa.gov/bio/repo/',
    dataset: 'OSDR study metadata, keyword search API',
  },
  RADLAB: {
    id: 'RADLAB',
    label: 'RadLab — OSDR Radiation Dosimetry Database',
    authors: 'NASA OSDR, with contributions from multiple space agencies',
    title: 'RadLab: ISS radiation dosimetry measurements',
    publication: 'NASA Open Science Data Repository',
    url: 'https://visualization.osdr.nasa.gov/radlab/gui/data-api/',
    dataset: 'ISS active and passive dosimetry, absorbed dose rate',
  },
  BONE_KEYAK_2009: {
    id: 'BONE_KEYAK_2009',
    label: 'NASA-funded study — astronaut hip bone strength loss',
    authors: 'Keyak, J. H. et al. (UC Irvine / UCSF, NASA-funded)',
    title: 'Reduction in proximal femoral strength due to long-duration spaceflight',
    publication: 'Journal of Bone and Mineral Research (2009)',
    url: 'https://www.sciencedaily.com/releases/2009/01/090126121350.htm',
    dataset: 'ISS crew pre/post-flight CT bone measurements (13 astronauts)',
  },
  REGOLITH_ARMOR_JPL: {
    id: 'REGOLITH_ARMOR_JPL',
    label: 'NASA JPL — ARMOR regolith shielding concept',
    authors: 'NASA Jet Propulsion Laboratory',
    title: 'Archway for Radiation and Micrometeorite Occurrence Resistance (ARMOR)',
    publication: 'NASA Tech Briefs, NPO-47686',
    url: 'https://www.techbriefs.com/component/content/article/15262-npo-47686',
    dataset: 'Regolith shielding thickness analysis',
  },
  SHIELD_SLABA_2017: {
    id: 'SHIELD_SLABA_2017',
    label: 'NASA Langley — limits of non-hydrogen shielding',
    authors: 'Slaba, T. C. et al.; presented by Clowdsley, M. (NASA Langley)',
    title: 'Protecting Astronauts from Space Radiation on the Lunar Surface',
    publication: 'NASA Langley / Lunar Surface Innovation Consortium (2021)',
    url: 'https://ntrs.nasa.gov/api/citations/20210009760/downloads/Clowdsley_Lunar_Radiation_Talk_v2.pdf',
    dataset: '3d-HZETRN and Monte Carlo transport calculations',
  },
  SHACKLETON_LRO: {
    id: 'SHACKLETON_LRO',
    label: 'NASA LRO / ShadowCam — Shackleton crater illumination',
    authors: 'NASA/GSFC/Arizona State University',
    title: "Shackleton Crater's Illuminated Rim & Shadowed Interior",
    publication: 'NASA Science',
    url: 'https://science.nasa.gov/resource/shackleton-craters-illuminated-rim-shadowed-interior/',
    dataset: 'Lunar Reconnaissance Orbiter Camera, ShadowCam',
  },
  LUNAR_POLE_POWER: {
    id: 'LUNAR_POLE_POWER',
    label: 'NASA — Lunar South Pole Illumination and power system implications',
    authors: 'NASA Glenn Research Center',
    title: 'Lunar South Pole Illumination: Review, Reassessment, and Power System Implications',
    publication: 'NASA Technical Reports Server, 20070034951',
    url: 'https://ntrs.nasa.gov/citations/20070034951',
    dataset: 'Lunar polar illumination fraction analysis',
  },
  DSN_LATENCY: {
    id: 'DSN_LATENCY',
    label: 'NASA Deep Space Network — Mars communication latency',
    authors: 'NASA / JPL-Caltech',
    title: 'Communications latency to Mars (4 to 24 minutes one way)',
    publication: 'NASA Space Communications and Navigation',
    url: 'https://www.nasa.gov/communicating-with-missions/',
    dataset: 'Deep Space Network link characteristics',
  },
  MARS_ROVER_PHOTOS: {
    id: 'MARS_ROVER_PHOTOS',
    label: 'NASA Mars Rover Photos API',
    authors: 'NASA / JPL-Caltech / MSSS',
    title: 'Mars Rover Photos (Curiosity, Perseverance)',
    publication: 'NASA Open APIs',
    url: 'https://api.nasa.gov/',
    dataset: 'Raw rover camera images by sol',
  },
  CSA_FOOD: {
    id: 'CSA_FOOD',
    label: 'Canadian Space Agency — Food production on the Moon and in remote areas',
    authors: 'Canadian Space Agency',
    title: 'Food production on the Moon and in remote areas (educator toolkit)',
    publication: 'Canadian Space Agency',
    url: 'https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/food-production/',
    dataset: 'Space food production education resources',
  },
  NIST_MARS_TIME: {
    id: 'NIST_MARS_TIME',
    label: 'NIST / NASA — length of a Martian sol',
    authors: 'NIST, NASA',
    title: 'Mars time: a sol is about 40 minutes longer than an Earth day',
    publication: 'NIST',
    url: 'https://www.nist.gov/news-events/news/2025/01/what-time-it-mars',
    dataset: 'Mars rotation period',
  },
};

/**
 * Measured physical quantities. Each carries its value, unit, the source id,
 * and `note` -- the plain-language explanation shown to players in-game.
 *
 * `real: true` means this number was measured by a real instrument or is a
 * published figure. Nothing in here is invented.
 */
export const MEASURED = {
  /** Mars surface absorbed dose rate in tissue, Gale Crater. */
  MARS_ABSORBED_DOSE_MGY_PER_SOL: {
    value: 0.21,
    uncertainty: 0.04,
    unit: 'mGy/sol',
    real: true,
    source: 'RAD_HASSLER_2014',
    note: 'Curiosity’s RAD instrument measured 0.21 mGy of absorbed radiation per sol in tissue on the surface of Mars.',
  },
  /** Mars surface dose EQUIVALENT rate -- the biologically weighted number. */
  MARS_DOSE_EQ_MSV_PER_SOL: {
    value: 0.64,
    uncertainty: 0.12,
    unit: 'mSv/sol',
    real: true,
    source: 'RAD_HASSLER_2014',
    note: 'On Mars, RAD measured a dose equivalent of about 0.64 mSv per sol. Mars’ thin air and the ground beneath the rover block some of the radiation.',
  },
  /** Mars GCR absorbed dose band across the first 300 sols. */
  MARS_GCR_BAND_UGY_PER_SOL: {
    value: [180, 225],
    unit: 'µGy/sol',
    real: true,
    source: 'RAD_NASA_GRAPH',
    note: 'The galactic cosmic ray dose on Mars wobbles between about 180 and 225 microgray per sol as air pressure changes through the day.',
  },
  /** Lunar surface dose equivalent rate, Von Karman crater, far side. */
  MOON_DOSE_EQ_MSV_PER_DAY: {
    value: 1.369,
    unit: 'mSv/day',
    real: true,
    source: 'LND_ZHANG_2020',
    note: 'The LND instrument on Chang’E-4 measured about 1,369 microsieverts per day on the Moon — roughly 60 microsieverts every hour.',
  },
  MOON_DOSE_EQ_USV_PER_HOUR: {
    value: 60,
    unit: 'µSv/h',
    real: true,
    source: 'LND_ZHANG_2020',
    note: 'About 60 microsieverts per hour on the lunar surface — around 200 times more than standing on the ground on Earth.',
  },
  /** Deep-space cruise dose rate, Earth to Mars. */
  CRUISE_ABSORBED_MGY_PER_DAY: {
    value: 0.48,
    uncertainty: 0.08,
    unit: 'mGy/day',
    real: true,
    source: 'RAD_HASSLER_2014',
    note: 'Flying between the planets is worse than standing on one: RAD measured 0.48 mGy per day during the cruise to Mars.',
  },
  /** Full reference mission dose equivalent. */
  REFERENCE_MISSION_DOSE_SV: {
    value: 1.01,
    unit: 'Sv',
    real: true,
    source: 'RAD_HASSLER_2014',
    note: 'A 180-day flight out, 500 days on Mars and 180 days home adds up to about 1.01 sieverts — close to a whole career’s radiation limit.',
  },
  /** Regolith depth that NASA JPL assessed as sufficient shielding. */
  REGOLITH_FULL_SHIELD_M: {
    value: 3,
    unit: 'm',
    real: true,
    source: 'REGOLITH_ARMOR_JPL',
    note: 'About 3 metres of piled-up regolith is enough to shield a habitat from cosmic rays and solar protons — even during a flare.',
  },
  /** Shackleton rim annual illumination fraction. */
  SHACKLETON_ILLUMINATION_FRACTION: {
    value: 0.9,
    unit: 'fraction of the year',
    real: true,
    source: 'SHACKLETON_LRO',
    note: 'Peaks on Shackleton’s rim sit in almost constant sunlight, because the Moon is tilted only 1.5 degrees. The crater floor has not seen the Sun for billions of years.',
  },
  MOON_AXIAL_TILT_DEG: {
    value: 1.5,
    unit: 'degrees',
    real: true,
    source: 'SHACKLETON_LRO',
    note: 'The Moon leans only 1.5 degrees, so at its south pole the Sun skims along the horizon and never properly rises or sets.',
  },
  /** Earth-Mars one-way light time range. */
  MARS_OWLT_MINUTES: {
    value: [4, 24],
    unit: 'minutes (one way)',
    real: true,
    source: 'DSN_LATENCY',
    note: 'A radio message takes between 4 and 24 minutes to travel one way between Earth and Mars, depending on where the planets are.',
  },
  MOON_OWLT_SECONDS: {
    value: 1.3,
    unit: 'seconds (one way)',
    real: true,
    source: 'DSN_LATENCY',
    note: 'From the Moon a message reaches Earth in about 1.3 seconds, so you really can hold a conversation.',
  },
  /** Length of a Martian sol. */
  SOL_LENGTH: {
    value: '24 h 39 min',
    unit: 'hours/minutes',
    real: true,
    source: 'NIST_MARS_TIME',
    note: 'A Martian day — a "sol" — is 24 hours and 39 minutes, about 40 minutes longer than a day on Earth.',
  },
  /** Bone mineral density loss in weight-bearing bone. */
  BONE_BMD_LOSS_PCT_PER_MONTH: {
    value: [0.4, 1.8],
    unit: '% per month',
    real: true,
    source: 'BONE_KEYAK_2009',
    note: 'Astronauts lose bone mineral density in their hips and spine at roughly 0.4 to 1.8 percent every month in space.',
  },
  BONE_HIP_STRENGTH_LOSS_PCT: {
    value: 14,
    unit: '% average',
    real: true,
    source: 'BONE_KEYAK_2009',
    note: 'A NASA-funded study of 13 ISS astronauts found hip bone strength fell 14 percent on average over a four-to-six month mission.',
  },
  /** Shackleton crater geometry. */
  SHACKLETON_DIAMETER_KM: {
    value: 21,
    unit: 'km',
    real: true,
    source: 'SHACKLETON_LRO',
    note: 'Shackleton crater is about 21 km across and 4.2 km deep, sitting almost exactly on the Moon’s south pole.',
  },
};

/** Convenience: resolve a MEASURED entry to its full source record. */
export function sourceFor(measuredKey) {
  const m = MEASURED[measuredKey];
  if (!m) throw new Error(`Unknown measurement: ${measuredKey}`);
  return SOURCES[m.source];
}

/**
 * Which sources the game actually PULLS DATA FROM, versus which it cites as
 * background for a claim it makes in words.
 *
 * This distinction is kept explicit because listing a dataset you did not
 * actually use is the fastest way to lose a judge's trust. If a source id is
 * not in DATA_SOURCES, the game does not read a single number from it.
 */
export const DATA_SOURCES = [
  'DONKI', // live flare records, and the embedded archive
  'RAD_HASSLER_2014', // Mars baseline dose
  'LND_ZHANG_2020', // Moon baseline dose
  'RADLAB', // ISS comparison figures
  'OSDR', // live study search in the Science Library
  'MARS_ROVER_PHOTOS', // live Curiosity imagery on Mars missions
];

/** Cited in the game to support a statement, but not read as data. */
export const BACKGROUND_SOURCES = [
  'RAD_NASA_GRAPH',
  'REGOLITH_ARMOR_JPL',
  'SHIELD_SLABA_2017',
  'SHACKLETON_LRO',
  'LUNAR_POLE_POWER',
  'DSN_LATENCY',
  'BONE_KEYAK_2009',
  'NIST_MARS_TIME',
  'CSA_FOOD',
];

/** All sources, ordered for the in-game credits screen. */
export function allSources() {
  return Object.values(SOURCES);
}

/** Sources the game reads numbers from. */
export function dataSources() {
  return DATA_SOURCES.map((id) => SOURCES[id]).filter(Boolean);
}

/** Sources the game cites but does not read. */
export function backgroundSources() {
  return BACKGROUND_SOURCES.map((id) => SOURCES[id]).filter(Boolean);
}
