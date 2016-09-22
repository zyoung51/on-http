// Copyright 2016, EMC, Inc.

'use strict';

var di = require('di');
var OnTaskClient = require('on_task_client');
var apiInstance = new OnTaskClient.WorkflowsApi();
var apiTasks = new OnTaskClient.TasksApi();
var apiGraphs = new OnTaskClient.GraphsApi();

module.exports = workflowApiServiceFactory;
di.annotate(workflowApiServiceFactory, new di.Provide('Http.Services.Api.Workflows'));
di.annotate(workflowApiServiceFactory,
    new di.Inject(
        'Services.Waterline',
        'Logger',
        'Errors',
        'Promise',
        'Constants',
        '_',
        'Services.Environment',
        'Services.Lookup'
    )
);

function workflowApiServiceFactory(
    waterline,
    Logger,
    Errors,
    Promise,
    Constants,
    _,
    env,
    lookupService
) {
    var logger = Logger.initialize(workflowApiServiceFactory);

    function WorkflowApiService() {
        Promise.promisifyAll(apiInstance);
        Promise.promisifyAll(apiTasks);
        Promise.promisifyAll(apiGraphs);
    }

    WorkflowApiService.prototype.createAndRunGraph = function (configuration, nodeId) {
        var self = this;
        var opts = {
            'body': configuration,
            'nodeId': nodeId
        };
        return Promise.try(function () {
            if (!configuration.name || !_.isString(configuration.name)) {
                throw new Errors.BadRequestError('Graph name is missing or in wrong format');
            }
        })
        .then(function () {
            return apiInstance.workflowsPostAsync(opts);
        });

    };

    WorkflowApiService.prototype.findGraphDefinitionByName = function (graphName) {
        return apiInstance.workflowsGetByInstanceIdAsync(graphName)
        .then(function (graph) {
            if (_.isEmpty(graph)) {
                throw new Errors.NotFoundError('Graph definition not found for ' + graphName);
            } else {
                return graph[0];
            }
        });
    };

    WorkflowApiService.prototype.cancelTaskGraph = function (graphId) {
        var action = {
            command: 'cancel',
            options: {}
        };
        return apiInstance.workflowsActionAs(graphId, action);
    };

    WorkflowApiService.prototype.deleteTaskGraph = function (graphId) {
        // Taskgraph deletion sequence:
        // 1) Get the graph object by ID
        // 2) Check if the returned workflow is running.
        // 3) If it is running, throw an error. Otherwise go on to step 4.
        // 4) Delete the graph object from the task graph store.
        return apiInstance.workflowsDeleteByInstanceIdAsync(graphId);
    };

    WorkflowApiService.prototype.defineTaskGraph = function (definition) {
        // Do validation before persisting a definition
        var opts = {
            body: definition
        };
        return apiGraphs.workflowsPutGraphsAsync(opts);
    };

    WorkflowApiService.prototype.defineTask = function (definition) {
        var opts = {
            body: definition
        };
        return apiTasks.workflowsPutTaskAsync(definition);
    };

    WorkflowApiService.prototype.getWorkflowsTasksByName = function (injectableName) {
        return apiTasks.workflowsGetTasksByNameAsync(injectableName)
        .then(function (data) {
            return data[0];
        });
    };

    WorkflowApiService.prototype.deleteWorkflowsTasksByName = function (injectableName) {
        return apiTasks.workflowsDeleteTasksByNameAsync(injectableName);
    };

    WorkflowApiService.prototype.getGraphDefinitions = function (injectableName) {
        return Promise.try(function () {
            if (injectableName != undefined) {
                return apiGraphs.workflowsGetGraphsByNameAsync(injectableName);
            } else {
                return apiGraphs.workflowsGetGraphsAsync();
            }
        })
        .then(function (data) {
            return data[0];
        });
    };

    WorkflowApiService.prototype.getTaskDefinitions = function () {
        return apiTasks.workflowsGetAllTasksAsync()
        .then(function (data) {
            return data[0];
        });
    };

    WorkflowApiService.prototype.findActiveGraphForTarget = function (target) {
        return waterline.graphobjects.findOne({
            node: target,
            _status: Constants.Task.ActiveStates
        });
    };

    WorkflowApiService.prototype.getWorkflowsByNodeId = function (id, query) {
        var nodeId = ({ node: id });
        var mergedQuery = _.merge({}, nodeId, query);
        return waterline.graphobjects.find(mergedQuery);
    };

    WorkflowApiService.prototype.getAllWorkflows = function (query, options) {
        options = options || {};

        return Promise.try(function () {
            query = waterline.graphobjects.find(query);

            if (options.skip) query.skip(options.skip);
            if (options.limit) query.limit(options.limit);

            return query;
        });
    };

    WorkflowApiService.prototype.getWorkflowByInstanceId = function (instanceId) {
        return waterline.graphobjects.needOne({ instanceId: instanceId });
    };

    WorkflowApiService.prototype.destroyGraphDefinition = function (injectableName) {
        return apiGraphs.workflowsDeleteGraphsByNameAsync(injectableName);
    };

    return new WorkflowApiService();
}
