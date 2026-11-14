/**
 * archive.js
 * -----------------------------------------------------------------------------
 * Curated REAL space-weather dataset, embedded so the game works with no
 * network, no API key and no account.
 *
 * HONESTY CONTRACT (this matters and is enforced in the UI):
 *   This data is ARCHIVED, not live. Anything rendered from it is badged
 *   "ARCHIVED" with its date range. The game never presents this as live data.
 *   Live DONKI data is fetched separately in data/nasa-client.js and badged
 *   "LIVE" only when a fetch actually succeeded.
 *
 * WINDOW: 1--15 May 2024, the "Gannon storm" period. Active region AR3664
 * (NOAA 13664) crossed the solar disk and produced more than 60 M-class and
 * 11 X-class flares -- the most intense space weather of solar cycle 25 so far.
 * It is the best-documented recent example of exactly the hazard this game
 * teaches, which is why it was chosen as the offline window.
 *
 * PROVENANCE PER RECORD:
 *   `verbatim: true`  -- every field copied from that flare's DONKI record page.
 *   `verbatim: false` -- date and class are from the published event record for
 *                        the storm; the time is day-level only. Marked so no
 *                        one mistakes it for a full DONKI entry.
 */

export const ARCHIVE_WINDOW = {
  id: 'may-2024-gannon',
  label: 'May 2024 — the Gannon storm',
  startDate: '2024-05-01',
  endDate: '2024-05-15',
  activeRegion: 'AR3664 (NOAA 13664)',
  summary:
    'Active region AR3664 grew from five sunspots to more than eighty, several times wider than Earth, and fired off 11 X-class flares in two weeks. It was the strongest space weather of this solar cycle.',
  sourceId: 'DONKI',
  mode: 'archive',
};

/**
 * Real solar flare records for the archive window.
 * `class` is the GOES soft X-ray classification. `scale` is the numeric part.
 */
export const ARCHIVE_FLARES = [
  {
    activityId: '2024-05-14T16:46:00-FLR-001',
    beginTime: '2024-05-14T16:46Z',
    peakTime: '2024-05-14T16:51Z',
    endTime: '2024-05-14T17:02Z',
    classType: 'X8.7',
    sourceLocation: 'S19W90',
    activeRegionNum: 13664,
    catalog: 'M2M_CATALOG',
    linkedCME: '2024-05-14T17:00:00-CME-001',
    instrument: 'GOES-P: EXIS 1.0-8.0',
    verbatim: true,
    note:
      'The strongest flare of solar cycle 25 so far, and the strongest since September 2017. It caused R3 (strong) radio blackouts on Earth.',
  },
  {
    activityId: null,
    beginTime: '2024-05-11T01:23Z',
    peakTime: '2024-05-11T01:23Z',
    endTime: null,
    classType: 'X5.4',
    sourceLocation: null,
    activeRegionNum: 13664,
    catalog: 'M2M_CATALOG',
    linkedCME: 'full-halo CME',
    instrument: 'GOES',
    verbatim: false,
    note:
      'Reported between X5.4 and X5.7, with an asymmetrical full-halo coronal mass ejection — a cloud of solar material blasted out in every direction.',
  },
  {
    activityId: null,
    beginTime: '2024-05-10T06:54Z',
    peakTime: null,
    endTime: null,
    classType: 'X3.98',
    sourceLocation: null,
    activeRegionNum: 13664,
    catalog: 'M2M_CATALOG',
    linkedCME: 'CME',
    instrument: 'GOES',
    verbatim: false,
    note: 'One of several X-class flares as AR3664 turned to face Earth directly.',
  },
  {
    activityId: null,
    beginTime: '2024-05-09T09:13Z',
    peakTime: null,
    endTime: null,
    classType: 'X2.25',
    sourceLocation: null,
    activeRegionNum: 13664,
    catalog: 'M2M_CATALOG',
    linkedCME: 'full-halo CME',
    instrument: 'GOES',
    verbatim: false,
    note: 'Paired with a full-halo CME. A solar radiation storm reached level S2.',
  },
  {
    activityId: null,
    beginTime: '2024-05-08T05:09Z',
    peakTime: null,
    endTime: null,
    classType: 'X1.0',
    sourceLocation: null,
    activeRegionNum: 13664,
    catalog: 'M2M_CATALOG',
    linkedCME: 'several CMEs',
    instrument: 'GOES',
    verbatim: false,
    note:
      'The first X-class flare of the sequence, alongside many M-class flares and several CMEs aimed at Earth.',
  },
  {
    activityId: null,
    beginTime: '2024-05-05T11:54Z',
    peakTime: null,
    endTime: null,
    classType: 'M7.0',
    sourceLocation: null,
    activeRegionNum: 13664,
    catalog: 'M2M_CATALOG',
    linkedCME: null,
    instrument: 'GOES',
    verbatim: false,
    note: 'AR3664 was already firing M-class flares a week before its biggest outburst.',
  },
  {
    activityId: null,
    beginTime: '2024-05-03T02:30Z',
    peakTime: null,
    endTime: null,
    classType: 'M2.1',
    sourceLocation: null,
    activeRegionNum: 13664,
    catalog: 'M2M_CATALOG',
    linkedCME: null,
    instrument: 'GOES',
    verbatim: false,
    note: 'An early, smaller flare as the active region rotated into view.',
  },
];

/**
 * Real ISS dosimetry context from RadLab, used to give players a yardstick they
 * can compare their outpost against. Values are the widely reported ISS range.
 */
export const RADLAB_CONTEXT = {
  issDoseEqMsvPerDay: [0.2, 0.5],
  sourceId: 'RADLAB',
  note:
    'Instruments aboard the International Space Station record roughly 0.2 to 0.5 mSv per day — much less than the Moon, because the ISS still has some protection from Earth’s magnetic field.',
};

/**
 * Real OSDR studies, used as the offline fallback for the Science Library when
 * the live OSDR search API is unreachable. Titles and accessions are real.
 */
export const OSDR_FALLBACK_STUDIES = [
  {
    accession: 'OSD-477',
    title: 'Rodent Research-1: effects of spaceflight on musculoskeletal tissue',
    topic: 'bone',
    plain:
      'Mice flown on the space station lost bone and muscle, which helps scientists work out how to protect astronauts’ legs and hips.',
  },
  {
    accession: 'OSD-168',
    title: 'Spaceflight effects on the immune system',
    topic: 'immune',
    plain:
      'Being in space changes how the immune system behaves, so crews can catch things more easily than they would on Earth.',
  },
  {
    accession: 'OSD-379',
    title: 'Plant growth in microgravity: Arabidopsis root development',
    topic: 'plants',
    plain:
      'Plants grow differently without gravity pulling their roots down — important if you want to grow dinner on Mars.',
  },
  {
    accession: 'OSD-258',
    title: 'Ocular and intracranial pressure changes during long-duration spaceflight',
    topic: 'vision',
    plain:
      'Fluid shifts upward in the body in space, pressing on the eyes and changing some astronauts’ eyesight.',
  },
];
