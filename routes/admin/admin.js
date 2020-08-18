var express = require('express');
const renderer = require("../../views/_htmlRenderer");
var router = express.Router();

var adminService = require('../../services/adminService');

module.exports = router;

router.get('/', function(req, res, next) {
    renderer(req, res, __dirname, 'admin');
});

router.get('/query/:query', function(req, res, next) {
    // http://localhost:3000/admin/query/page%20-c%20name%3D%2Ftest%2Ftest%20template%3Dtemplate1
    let query = decodeURI(req.params.query);
    let queries = query.split(' ');

    switch (queries[0]) {
        case 'page' :
            adminService.pageManagement(queries)
                .then(() => renderer.ok(res))
                .catch((err) => {console.log(err);renderer.error(res);});
            break;
        default :
            renderer.error(res);
    }
});

router.get('/render', function(req, res, next) {

    adminService.renderPages().then(() => {
        renderer.ok(res);
    }, reason => {
        console.log(reason);
        renderer.error(res);
    });
});
