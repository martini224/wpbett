var express = require('express');
var renderer = require('../../views/_htmlRenderer');
var router = express.Router();

module.exports = router;

router.get('/', function(req, res, next) {
  renderer(req, res, __dirname, 'test');
});
