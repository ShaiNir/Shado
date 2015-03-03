'use strict';

var express = require('express');
var controller = require('./insight.controller');
var config = require('../../config/environment');
var auth = require('../../auth/auth.service');

var router = express.Router();

router.get('/', controller.index);
router.put('/', controller.body);
router.post('/', controller.body);

module.exports = router;
