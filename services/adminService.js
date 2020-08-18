module.exports.renderPages = _renderPages
module.exports.pageManagement = _pageManagement

global.OPENING_TAG = '<**';
global.CLOSING_TAG = '**>';

global.OPENING_SEC_TAG = '<***';
global.CLOSING_SEC_TAG = '***>';

global.CREATE = 'CREATE';
global.MODIFY = 'MODIFY';
global.DELETE = 'DELETE'

global.NOT_EXISTING = 'NOT_EXISTING';
global.EXISTING = 'EXISTING';

var fs = require('fs');


function _renderPages() {
    return new Promise((resolve, reject) => {
        // Get the listing of all pages to render
        fs.readFile('./views/pages/pages', (err, data) => {
            //handling error
            if (err) {
                reject(err);
            }

            // Render the pages
            Promise.all(
                data.toString()
                    .split(/\r?\n/)
                    .filter(p => p)
                    .map(filename => renderHTML(filename, 'pages')))
            .then(() => {
                resolve();
            }, reason => {
                reject(reason);
            });
        });
    });
}

function getStatusFromQuery(queries) {
    switch (true) {
        case queries.includes('-c') :
            return CREATE;
        case queries.includes('-m') :
            return MODIFY;
        case queries.includes('-d') :
            return DELETE;
        default :
            return undefined;
    }
}

function getParamValueFromQuery(queries, param) {
    let gparam = queries.find(q => q.startsWith(param + '='));
    let splitted = gparam.split('=');

    if(splitted.length === 2) {
        return splitted[1];
    }

    return undefined;
}

/*
 * PAGES MANAGEMENT
 */

function _pageManagement(queries) {
    return new Promise((resolve, reject) => {
        let status = getStatusFromQuery(queries);
        let name = getParamValueFromQuery(queries, 'name');
        let template = getParamValueFromQuery(queries, 'template');

        findRoute(name).then(isExisting => {
            switch (status) {
                case CREATE :
                    if(isExisting) reject(EXISTING);
                    if(!name) reject();

                    createRoute(name, template)
                        .then(() => resolve())
                        .catch((err) => reject(err));
                    break;
                case MODIFY :
                    if(!isExisting) reject(NOT_EXISTING);

                    modifyRoute(name)
                        .then(() => resolve())
                        .catch((err) => reject(err));
                    break;
                case DELETE :
                    if(!isExisting) reject(NOT_EXISTING);

                    deleteRoute(name)
                        .then(() => resolve())
                        .catch((err) => reject(err));
                    break;
                default :
                    reject();
            }
        }).catch((err) => reject(err));
    });

}

function findRoute(route) {
    return new Promise((resolve, reject) => {
        fs.readFile('./routes/routes', (err, data) => {
            if (err) reject(err);

            resolve(data.toString().split(/\r?\n/).includes(route));
        });
    });
}

function createRoute(route, template) {
    return new Promise((resolve, reject) => {
        let route_path = route.substring(0, route.lastIndexOf('/') + 1);
        let route_page = route.endsWith('/') ? 'index' : route.substring(route.lastIndexOf('/') + 1);
        let last_path = route.substring(0, route.lastIndexOf('/'));
        last_path = last_path.substring(last_path.lastIndexOf('/') + 1)
        let filename = './routes' + route_path + last_path + '.js';

        try {

            if (fs.existsSync(filename)) {
                fs.appendFileSync(filename,
                    '\n\n' +
                    'router.get(\'/' + route_page + '\', function(req, res, next) {\n' +
                    '  renderer(req, res, __dirname, \'' + route_page + '\');\n' +
                    '});\n');
            } else {
                fs.mkdirSync('./routes' + route_path, {recursive: true});

                fs.writeFileSync(filename,
                    'var express = require(\'express\');\n' +
                    'var renderer = require(\'../../views/_htmlRenderer\');\n' +
                    'var router = express.Router();\n' +
                    '\n' +
                    'module.exports = router;\n' +
                    '\n' +
                    'router.get(\'/\', function(req, res, next) {\n' +
                    '  renderer(req, res, __dirname, \'' + route_page + '\');\n' +
                    '});\n');

                let app = fs.readFileSync('./app.js');

                if(!app) throw 'app.js file not readable.';

                app = app.toString().replace('// <** new routes **>',
                    'app.use(\'' + route_path.substring(0, route_path.length - 1) + '\', require(\'./routes' + route + '\'));\n// <** new routes **>');

                fs.writeFileSync('./app.js', app);

                fs.appendFileSync('./routes/routes', route_path.substring(0, route_path.length - 1) + '\n');
            }

            fs.mkdirSync('./views/pages' + route_path, {recursive: true});
            fs.mkdirSync('./views/render' + route_path, {recursive: true});

            fs.writeFileSync('./views/pages' + route_path + route_page + '.html',
                '<** template=' + template + ' **>\n\n<p>' + route_page + '</p>');

            fs.appendFileSync('./views/pages/pages', route_path.substring(1) + route_page + '.html' + '\n');


            resolve();
        } catch(exception) {
            reject(exception);
        }
    });
}

function modifyRoute(route) {

}

function deleteRoute(route) {

}

/*
 * PRIVATE HELPERS
 */

function renderHTML(filename, type) {
    return new Promise((resolve, reject) => {
        fs.readFile('./views/' + type + '/' + filename, (err, data) => {
            if (err) reject(err);

            renderFileAnnotations(data.toString())
                .then(content => {
                    if (type === 'pages') {
                        fs.writeFile('./views/render/' + filename, content, err => {
                            if (err) reject(err);

                            console.log(filename + ' rendered');

                            resolve();
                        });
                    } else {
                        resolve(content);
                    }
                }).catch((err) => reject(err));
        });
    });
}

async function renderFileAnnotations(content) {
    do {
        var begin = content.indexOf(OPENING_TAG + ' ');
        var end = content.indexOf(' ' + CLOSING_TAG);

        if (begin !== -1 && end !== -1) {
            let annotationString = content.substring(begin, end + 4);

            switch (true) {
                case annotationString.includes(OPENING_TAG + ' template=') :
                    let template = await renderHTML(getAnnotation(annotationString, ' template='), 'templates');

                    content = template.replace(OPENING_SEC_TAG + ' content ' + CLOSING_SEC_TAG, removeAnnotation(content, annotationString));
                    break;
                case annotationString.includes(OPENING_TAG + ' nav=') :
                    let nav = await renderHTML(getAnnotation(annotationString, ' nav='), 'navigations');

                    content = content.replace(annotationString, nav);
                    break;
                case annotationString.includes(OPENING_TAG + ' footer=') :
                    let footer = await renderHTML(getAnnotation(annotationString, ' footer='), 'footers');

                    content = content.replace(annotationString, footer);
                    break;
            }
        }
    } while(begin !== -1 && end !== -1);

    return content;
}

function getAnnotation(annotationString, key, isHTMLFilename) {
    isHTMLFilename = isHTMLFilename === undefined ? true : isHTMLFilename;
    return annotationString.split(key)[1].split(' ' + CLOSING_TAG)[0] + (isHTMLFilename ? '.html' : '');
}

function removeAnnotation(content, annotationString) {
    return content.replace(annotationString, '');
}
