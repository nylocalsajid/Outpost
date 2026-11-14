/**
 * sites.js
 * -----------------------------------------------------------------------------
 * The two outpost sites, with their environment driven by REAL measurements
 * imported from data/nasa-sources.js.
 *
 * Choosing a site is the first real trade-off in the game, and the asymmetry is
 * not invented -- it falls straight out of the measurements:
 *
 *   MOON (Shackleton rim)   1.369 mSv/day, instant comms, steady sunlight
 *   MARS (Jezero crater)    0.64  mSv/sol, 4-24 min comms, dust kills power
 *
 * So the Moon is a radiation problem with good communication, and Mars is a
 * communication and power problem with gentler radiation. Players discover that
 * "harder" depends on which problem they are worse at.
 */

import { MEASURED } from '../data/nasa-sources.js';

export const SITES = {
  moon: {
    id: 'moon',
    name: 'Shackleton Rim',
    body: 'Moon',
    flag: '●',
    dayWord: 'day',
    dayWordPlural: 'days',

    /* --- real environment ------------------------------------------------ */
    baseDoseMsvPerDay: MEASURED.MOON_DOSE_EQ_MSV_PER_DAY.value, // 1.369
    doseSourceKey: 'MOON_DOSE_EQ_MSV_PER_DAY',
    dayLengthLabel: '24 h (Earth day)',
    commsOneWay: '1.3 seconds',
    commsSourceKey: 'MOON_OWLT_SECONDS',
    /** Mission control can answer within the same day. */
    adviceDelayDays: 0,

    blurb:
      'A ridge on the rim of Shackleton crater, right at the Moon’s south pole. The Sun skims the horizon and almost never sets, so your solar panels nearly always work. But there is no air and no magnetic field, so radiation is more than twice what it is on Mars.',

    realFacts: [
      'SHACKLETON_ILLUMINATION_FRACTION',
      'MOON_AXIAL_TILT_DEG',
      'MOON_DOSE_EQ_USV_PER_HOUR',
      'SHACKLETON_DIAMETER_KM',
    ],

    /* --- site-specific hazards ------------------------------------------- */
    hazard: {
      /** Rim sites lose the Sun for a small fraction of the cycle. */
      shadowChance: 0.12,
      shadowLabel: 'Horizon shadow',
      shadowDetail:
        'A ridge has slipped between your panels and the Sun. Shackleton’s rim is lit about 90% of the year — this is part of the other 10%.',
      dustGrowthPerDay: 0, // no atmosphere, so no airborne dust
    },

    /**
     * Science targets. Site-specific because the sites do not offer the same
     * power budget: Shackleton's rim is lit almost constantly, so the Moon can
     * support more research than a dust-covered Mars outpost. Real mission
     * objectives are scaled to what a site can actually sustain too.
     * Calibrated against simulated playthroughs (see tests/simulation.test.mjs).
     */
    scienceSuccess: 110,
    scienceFlagship: 175,

    /** Water ice in the permanently shadowed crater floor nearby. */
    waterBonus: true,
    waterBonusNote:
      'The crater floor below you has never seen sunlight, and there is water ice down there. Your oxygen recycler gets a small top-up.',
  },

  mars: {
    id: 'mars',
    name: 'Jezero Crater',
    body: 'Mars',
    flag: '●',
    dayWord: 'sol',
    dayWordPlural: 'sols',

    /* --- real environment ------------------------------------------------ */
    baseDoseMsvPerDay: MEASURED.MARS_DOSE_EQ_MSV_PER_SOL.value, // 0.64
    doseSourceKey: 'MARS_DOSE_EQ_MSV_PER_SOL',
    dayLengthLabel: MEASURED.SOL_LENGTH.value, // 24 h 39 min
    commsOneWay: '4 to 24 minutes',
    commsSourceKey: 'MARS_OWLT_MINUTES',
    /** Too far for a conversation: an answer arrives the following sol. */
    adviceDelayDays: 1,

    blurb:
      'An old river delta in Jezero crater, where Perseverance is working. Mars has a thin atmosphere, and that thin air plus the ground blocks enough radiation to roughly halve your dose. The catch: dust coats your solar panels, and Earth is minutes away by radio, so nobody can help you in an emergency.',

    realFacts: [
      'MARS_DOSE_EQ_MSV_PER_SOL',
      'MARS_ABSORBED_DOSE_MGY_PER_SOL',
      'SOL_LENGTH',
      'MARS_OWLT_MINUTES',
    ],

    /* --- site-specific hazards ------------------------------------------- */
    hazard: {
      shadowChance: 0,
      shadowLabel: null,
      shadowDetail: null,
      /** Dust settles steadily and must be cleaned off. */
      dustGrowthPerDay: 0.025,
      dustStormChance: 0.14,
      dustStormLabel: 'Dust storm',
      dustStormDetail:
        'Dust has filled the sky and blocked the Sun. Real Mars landers have been crippled this way — the InSight lander ran out of power as dust built up on its panels.',
    },

    /** Lower than the Moon's: dust on the panels steadily cuts the power
     *  available for research, so the mission asks for less. */
    scienceSuccess: 95,
    scienceFlagship: 150,

    waterBonus: false,
    waterBonusNote: null,
  },
};

export const SITE_LIST = [SITES.moon, SITES.mars];

export function getSite(id) {
  const site = SITES[id];
  if (!site) throw new Error(`Unknown site: ${id}`);
  return site;
}
