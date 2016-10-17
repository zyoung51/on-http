// Copyright 2016, EMC, Inc.

'use strict';

var di = require('di');
var grpc = require('grpc');
var consul = require('consul');

module.exports = taskgraphApiServiceFactory;
di.annotate(taskgraphApiServiceFactory, new di.Provide('Http.Services.Api.Taskgraph.Scheduler'));
di.annotate(taskgraphApiServiceFactory,
    new di.Inject(
        'Protocol.Task',
        'Services.Waterline',
        'Errors',
        'Util',
        'Services.Configuration',
        'Services.Lookup',
        'Services.Environment',
        'Promise',
        'Templates',
        '_'
    )
);

function taskgraphApiServiceFactory(
    taskProtocol,
    waterline,
    Errors,
    util,
    configuration,
    lookupService,
    Env,
    Promise,
    templates,
    _
) {
    var protocol = grpc.load( __dirname + '/scheduler.proto').scheduler;
    var url = require('url');
    var urlObject = url.parse(configuration.get('consulUrl') || 'consul://127.0.0.1:8500');

    // Create a promisified Consul interface
    var consul = Promise.promisifyAll(require('consul')({
        host: urlObject.hostname,
        port: urlObject.port || 8500,
        promisify: function(fn) {
          return new Promise(function(resolve, reject) {
            try {
              return fn(function(err, data, res) {
                if (err) {
                  err.res = res;
                  return reject(err);
                }
                return resolve([data, res]);
              });
            } catch (err) {
              return reject(err);
            }
          });
        }
    }));

    var grpcClients = {};

    function getClient() {
        return consul.agent.service.list()
        .then(function(services) {
            var scheduler = _.reduce(services[0], function(result, value) {
                if(value.Service === 'taskgraph' && _.includes(value.Tags, 'scheduler')) {
                    result.push(value);
                }
                return result;
            }, []);

            if(_.isEmpty(scheduler)) {
                var err = new Errors.BaseError('No registered service found for taskgraph scheduler');
                err.status = 503;
                throw err;
            }

            // TODO: cool code to rotate/pick the service, but just pick the first one for now
            var host = scheduler[0].Address + ':' + scheduler[0].Port;
            var client = grpcClients[host] || new protocol.Scheduler(host, grpc.credentials.createInsecure());
            if(!grpcClients[host]) {
                grpcClients[host] = client;
            }
            return client;
        });
    }

    function runRpc(funcName) {
        var _arguments = Array.prototype.slice.call(arguments);
        var args = _arguments.slice(1);
        return getClient()
        .then(function(client) {
            return new Promise(function(resolve, reject) {
                args.push(function(err, response) {
                    if(err) {
                        return reject(err);
                    }
                    resolve(response);
                });
                client[funcName].apply(client, args);
            });
        })
        .then(function(response) {
            return JSON.parse(response.response);
        });
    }

    function TaskgraphApiService() {
    }

    TaskgraphApiService.prototype.getBootstrap = function() {
    };

    TaskgraphApiService.prototype.getTasksById = function(identifier) {
        return runRpc('getTasksById', {
            identifier: identifier
        });
    };

    TaskgraphApiService.prototype.postTaskById = function(identifier, body) {
    };

    TaskgraphApiService.prototype.workflowsGetGraphs = function() {
        return runRpc('workflowsGetGraphs', {});
    };

    TaskgraphApiService.prototype.workflowsGetGraphsByName = function(injectableName) {
        return runRpc('workflowsGetGraphsByName', {
            injectableName: injectableName
        });
    };

    TaskgraphApiService.prototype.workflowsPutGraphs = function(definition) {
        return runRpc('workflowsPutGraphs', {
            definition: JSON.stringify(definition)
        });
    };

    TaskgraphApiService.prototype.workflowsDeleteGraphsByName = function(injectableName) {
        return runRpc('workflowsDeleteGraphsByName', {
            nodeId: nodeId, 
            injectableName: injectableName
        });
    };

    TaskgraphApiService.prototype.workflowsGet = function(query) {
        return runRpc('workflowsGet', { 
            query: JSON.stringify(query) 
        });
    };

    TaskgraphApiService.prototype.workflowsPost = function(config, nodeId) {
        return runRpc('workflowsPost', {
            nodeId: nodeId, 
            configuration: JSON.stringify(config)
        });
    };

    TaskgraphApiService.prototype.workflowsGetByInstanceId = function(graphName) {
        return runRpc('workflowsGetByInstanceId', {
            graphName: graphName
        });
    };

    TaskgraphApiService.prototype.workflowsAction = function(graphId, command) {
        return runRpc('workflowsAction', {
            command: command, 
            graphId: graphId
        });
    };

    TaskgraphApiService.prototype.workflowsDeleteByInstanceId = function(graphId) {
        return runRpc('workflowsDeleteByInstanceId', {
            graphId: graphId
        });
    };

    TaskgraphApiService.prototype.workflowsPutTask = function(definition) {
        return runRpc('workflowsPutTask', {
            definition: JSON.stringify(definition)
        });
    };

    TaskgraphApiService.prototype.workflowsGetAllTasks = function() {
        return runRpc('workflowsGetAllTasks', {});
    };

    TaskgraphApiService.prototype.workflowsGetTasksByName = function(injectableName) {
        return runRpc('workflowsGetTasksByName', {
            injectableName: injectableName
        });
    };

    TaskgraphApiService.prototype.workflowsDeleteTasksByName = function(injectableName) {
        return runRpc('workflowsDeleteTasksByName', {
            injectableName: injectableName
        });
    };

    return new TaskgraphApiService();
}
