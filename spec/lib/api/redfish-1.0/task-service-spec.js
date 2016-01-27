// Copyright 2015, EMC, Inc.
/* jshint node:true */

'use strict';

describe('Redfish TaskService', function () {
    var configuration;
    var tv4;
    var validator;
    var waterline;
    var Promise;
    var taskProtocol;
    var template;
    var fs;

    // Skip reading the entry from Mongo and return the entry directly
    function redirectGet(entry) {
        return fs.readFileAsync(__dirname + '/../../../../data/templates/' + entry, 'utf-8')
            .then(function(contents) {
                return { contents: contents };
            });
    }

    before('start HTTP server', function () {
        this.timeout(5000);
        return helper.startServer([]).then(function () {
            template = helper.injector.get('Templates');
            sinon.stub(template, "get", redirectGet);

            validator = helper.injector.get('Http.Api.Services.Redfish');
            sinon.spy(validator, 'validate');
            sinon.spy(validator, 'render');

            waterline = helper.injector.get('Services.Waterline');
            sinon.stub(waterline.graphobjects);
            sinon.stub(waterline.nodes);

            Promise = helper.injector.get('Promise');

            var nodeFs = helper.injector.get('fs');
            fs = Promise.promisifyAll(nodeFs);
        });

    });

    beforeEach('set up mocks', function () {
        tv4 = require('tv4');
        sinon.spy(tv4, "validate");

        validator.validate.reset();
        validator.render.reset();

        function resetStubs(obj) {
            _(obj).methods().forEach(function (method) {
                if (obj[method] && obj[method].reset) {
                  obj[method].reset();
                }
            }).value();
        }

        resetStubs(waterline.graphobjects);
        resetStubs(waterline.nodes);
    });

    afterEach('tear down mocks', function () {
        tv4.validate.restore();
    });

    after('stop HTTP server', function () {
        validator.validate.restore();
        validator.render.restore();
        template.get.restore();
        
        function restoreStubs(obj) {
            _(obj).methods().forEach(function (method) {
                if (obj[method] && obj[method].restore) {
                  obj[method].restore();
                }
            }).value();
        }

        restoreStubs(waterline.graphobjects);
        restoreStubs(waterline.nodes);
        return helper.stopServer();
    });

    var graph = {
        id: '566afe8a7e7b8f3751b951a5',
        _status: 'valid',
        createdAt: '12/11/2015 11:49:14',
        updatedAt: '12/11/2015 11:49:15',
        name: 'isc-dhcp leases poller',
        node: 'abcdefg'
    };

    it('should return a valid task service root', function () {
        waterline.graphobjects.find.resolves([graph]);
        return helper.request().get('/redfish/v1/TaskService')
            .expect('Content-Type', /^application\/json/)
            .expect(200)
            .expect(function(res) {
                expect(tv4.validate.called).to.be.true;
                expect(validator.validate.called).to.be.true;
                expect(validator.render.called).to.be.true;
            });
    });

    it('should return a valid task collection', function () {
        waterline.graphobjects.find.resolves([graph]);
        return helper.request().get('/redfish/v1/TaskService/Tasks')
            .expect('Content-Type', /^application\/json/)
            .expect(200)
            .expect(function(res) {
                expect(tv4.validate.called).to.be.true;
                expect(validator.validate.called).to.be.true;
                expect(validator.render.called).to.be.true;
            });
    });

    it('should return a valid task from a collection', function () {
        waterline.graphobjects.find.resolves([graph]);
        return helper.request().get('/redfish/v1/TaskService/Tasks/' + graph.id)
            .expect('Content-Type', /^application\/json/)
            .expect(200)
            .expect(function(res) {
                expect(tv4.validate.called).to.be.true;
                expect(validator.validate.called).to.be.true;
                expect(validator.render.called).to.be.true;
            });
    });

    it('should 500 an invalid task', function () {
        waterline.graphobjects.find.resolves([graph]);
        return helper.request().get('/redfish/v1/TaskService/Tasks/' + graph.id + 'invalid')
            .expect(500);
    });

    it('should return a valid task from a system', function () {
        waterline.graphobjects.find.resolves([graph]);
        waterline.nodes.needByIdentifier.resolves();
        return helper.request().get('/redfish/v1/TaskService/Oem/Tasks/' + graph.node)
            .expect('Content-Type', /^application\/json/)
            .expect(200)
            .expect(function(res) {
                expect(tv4.validate.called).to.be.true;
                expect(validator.validate.called).to.be.true;
                expect(validator.render.called).to.be.true;
            });
    });

    it('should 500 an invalid system', function () {
        waterline.graphobjects.find.resolves([graph]);
        waterline.nodes.needByIdentifier.rejects();
        return helper.request().get('/redfish/v1/TaskService/Oem/Tasks/' + graph.node + 'invalid')
            .expect(500);
    });
});

