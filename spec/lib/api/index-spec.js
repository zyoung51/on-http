// Copyright 2015, EMC, Inc.
/* jshint node:true */

'use strict';

var ws = require('ws');

describe('common-api-router', function () {

    helper.before(function () {
        return [
            helper.require('/lib/api/index.js'),
            helper.requireGlob('/lib/**/*.js'),
            dihelper.simpleWrapper({}, 'Task.Services.OBM'),
            dihelper.simpleWrapper({}, 'ipmi-obm-service'),
            dihelper.simpleWrapper(ws.Server, 'WebSocketServer'),
            dihelper.requireWrapper('rimraf', 'rimraf'),
            dihelper.requireWrapper('os-tmpdir', 'osTmpdir')
        ];
    });

    helper.after();

    it('should add routes', function () {
        var router = helper.injector.get('common-api-router');
        var app = require('express')();
        app.use(router);
    });
});
