'use strict';

var express = require('express');
var controller = require('./message.controller.js');
var auth = require('../../auth/auth.service');

var router = express.Router();

router.post('/pm', auth.isAuthenticated(), controller.pm);

module.exports = router;
