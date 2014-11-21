'use strict';

// Development specific configuration
// ==================================
module.exports = {
  seedDB: true,
  // Change to 'true' only when testing scheduler functions lest your log be barraged with SQL query output
  schedulerOn: false // true
};
