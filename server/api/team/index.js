'use strict';

var express = require('express');
var controller = require('./team.controller');

var router = express.Router();

router.get('/', controller.index);
router.get('/:id', controller.show);
router.get('/:id/players', controller.players)
router.post('/', controller.create);
router.post('/fill', controller.fill);
router.put('/:id', controller.update);
router.patch('/:id', controller.update);
router.delete('/:id', controller.destroy);



module.exports = router;
