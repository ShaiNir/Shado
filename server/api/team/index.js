'use strict';

var express = require('express');
var controller = require('./team.controller');
var auth = require('../../auth/auth.service');

var router = express.Router();

router.get('/', controller.index);
router.get('/:id', controller.show);
router.get('/:id/players', controller.players)
router.post('/', controller.create);
router.put('/:id', controller.update);
router.patch('/:id', controller.update);
router.delete('/:id', controller.destroy);
router.put('/:id/hire_user', auth.isAuthenticated(), controller.hire_user);
router.put('/:id/hire_user/:user_id', auth.isAuthenticated(), controller.hire_user);


module.exports = router;
