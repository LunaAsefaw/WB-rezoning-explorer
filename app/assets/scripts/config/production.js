'use strict';

export default {
  environment: 'production',
  appTitle: 'REZoning Web',
  appDescription:
    'Identify and explore high potential project areas for solar, onshore wind and offshore wind development',
  appShortTitle: 'REZ',
  mbToken:
    'pk.eyJ1Ijoid2JnLWNkcnAiLCJhIjoiY2l1Z3pxZDVwMDBxcDMzcDJjYmRpYnBicSJ9.hjlLP5TEVhqbTwzhFA1rZw',
  apiEndpoint: 'https://d2b8erzy6y494p.cloudfront.net/v1',
  githubIssuesApi: 'https://d2b8erzy6y494p.cloudfront.net/v1/feedback',
  rawDataDownloadTimeout: 300000, // 5 min
  rawDataDownloadCheckInterval: 2000, // 2 sec
  indicatorsDecimals: {
    zone_score: 3,
    lcoe: 2,
    zone_output_density: 5,
    cf: 3
  }
};
