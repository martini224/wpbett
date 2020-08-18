const path = require('path');

module.exports = _htmlRenderer
module.exports.ok = _renderOk
module.exports.error = _renderError

function _htmlRenderer(req, res, dir, file) {
    res.sendFile(path.join(__dirname + '/render/' + dirToRender(dir) + file + '.html'));
}

function _renderOk(res) {
    res.sendFile(path.join(__dirname + '/ok.html'));
}

function _renderError(res) {
    res.sendFile(path.join(__dirname + '/error.html'));
}

/*
 * PRIVATE HELPERS
 */

function dirToRender(dir) {
    dir = dir.replace(/\\/gi, '/');
    return dir.includes('/routes/') ? dir.split('/routes/')[1] + '/' : '';
}
