'use strict';

// Production specific configuration
// =================================
module.exports = {
  // Server IP
  ip:       process.env.OPENSHIFT_NODEJS_IP ||
            process.env.IP ||
            undefined,

  // Server port
  port:     process.env.OPENSHIFT_NODEJS_PORT ||
            process.env.PORT ||
            8080,


  // How often the league events scheduler should tick (in milliseconds).
  schedulerFrequency: 1000 * 60 * 5, // 5 minutes

  schedulerOn: false
};