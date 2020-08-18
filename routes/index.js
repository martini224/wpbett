var express = require('express');
var renderer = require('../views/_htmlRenderer');
var router = express.Router();

module.exports = router;

/* GET home page. */
router.get('/', function(req, res, next) {
  renderer(req, res, __dirname, 'index');
});
