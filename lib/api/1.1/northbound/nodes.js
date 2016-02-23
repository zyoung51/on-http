// Copyright 2015, EMC, Inc.

'use strict';

var di = require('di'),
    express = require('express');

module.exports = nodesRouterFactory;

di.annotate(nodesRouterFactory, new di.Provide('Http.Api.Nodes'));
di.annotate(nodesRouterFactory, new di.Inject(
        'Services.Waterline',
        'Protocol.TaskGraphRunner',
        'Http.Services.RestApi',
        'Http.Services.Api.Nodes',
        'Services.Configuration',
        'Task.Services.OBM',
        'Logger',
        '_'
    )
);

function nodesRouterFactory (
    waterline,
    taskGraphProtocol,
    rest,
    nodeApiService,
    configuration,
    ObmService,
    Logger,
    _
) {
    var router = express.Router();

    /**
     * @api {get} /api/1.1/nodes/ GET /
     * @apiVersion 1.1.0
     * @apiDescription get list of nodes
     * @apiName nodes-get
     * @apiGroup nodes
     * @apiSuccess {json} nodes List of all nodes or if there are none an empty object.
     */

    router.get('/nodes', rest(function (req) {
        return nodeApiService.getAllNodes(req.query);
    }, {
        serializer: 'Serializables.V1.Node',
        isArray: true
    }));


    /**
     * @api {post} /api/1.1/nodes POST /
     * @apiVersion 1.1.0
     * @apiDescription create a node
     * @apiName nodes-post
     * @apiParam {String} identifiers Mac addresses and unique aliases to
     *                                         identify the node by
     * @apiParam {String[]} identifiers Mac addresses and unique aliases to
     *                                         identify the node by
     * @apiParam {String} profile Default profile to set for the node
     * @apiGroup nodes
     * @apiSuccess {json} node the node that was created with the <code>identifiers</code>
     * @apiError E_VALIDATION <code>identifiers</code> expect a string or an array of strings.
     * @apiErrorExample E_VALIDATION:
     * {
     *      "error": "E_VALIDATION",
     *      "status": 400,
     *      "summary": "1 attribute is invalid",
     *      "model": "nodes",
     *      "invalidAttributes": {
     *         "name": [
     *           {
     *               "rule": "string",
     *               "message":
     *                   "`undefined` should be a string (instead of \"null\", which is a object)"
     *           },
     *           {
     *              "rule": "required",
     *               "message": "\"required\" validation rule failed for input: null"
     *           }
     *        ]
     *    }
     * }
     */

    router.post('/nodes', rest(function (req) {
        return nodeApiService.postNode(req.body);
    }, {
        deserializer: 'Serializables.V1.Node',
        renderOptions: { success: 201 }
    }));


    /**
     * @api {get} /api/1.1/nodes/:identifier GET /:id
     * @apiVersion 1.1.0
     * @apiDescription get specific node details
     * @apiName node-get
     * @apiGroup nodes
     * @apiParam {String} identifier node identifier
     * @apiSuccess {json} node the nodes that have the <code>identifier</code>
     * @apiError NotFound The node with the <code>identifier</code> was not found.
     * @apiErrorExample {json} Error-Response:
     *     HTTP/1.1 404 Not Found
     *     {
     *       "error": "Not Found"
     *      }
     */

    router.get('/nodes/:identifier', rest(function (req) {
        return nodeApiService.getNodeById(req.params.identifier);
    }, {
        serializer: 'Serializables.V1.Node',
    }));


    /**
     * @api {patch} /api/1.1/nodes/:identifier PATCH /:id
     * @apiVersion 1.1.0
     * @apiDescription patch specific node details
     * @apiName node-patch
     * @apiGroup nodes
     * @apiParam {String} identifier node identifier
     * @apiSuccess {json} node the node that has the <code>identifier</code> that was patched
     * @apiError NotFound The node with the <code>identifier</code> was not found.
     * @apiErrorExample {json} Error-Response:
     *     HTTP/1.1 404 Not Found
     *     {
     *       "error": "Not Found"
     *     }
     *     HTTP/1.1 400 Bad Request
     *     {
     *       "message": "Service xxx is not supported in current node"
     *     }
     */

    router.patch('/nodes/:identifier', rest(function (req) {
        return nodeApiService.patchNodeById(req.params.identifier, req.body);
    }, {
        deserializer: 'Serializables.V1.Node'
    }));



    /**
     * @api {delete} /api/1.1/nodes/:identifier DELETE /:id
     * @apiVersion 1.1.0
     * @apiDescription Delete specific node details.
     * @apiName node-delete
     * @apiGroup nodes
     * @apiParam {String} identifier node identifier
     * @apiSuccess {json} node the node that has the <code>identifier</code> that was patched
     * @apiError NotFound The node with the <code>identifier</code> was not found.
     * @apiErrorExample {json} Error-Response:
     *     HTTP/1.1 404 Not Found
     *     {
     *       "error": "Not Found"
     *      }
     */

    router.delete('/nodes/:identifier', rest(function (req) {
        return nodeApiService.delNodeById(req.params.identifier);
    }));

    /**
     * @api {get} /api/1.1/nodes/:identifier/obm GET /:id/obm
     * @apiVersion 1.1.0
     * @apiDescription Get obm settings for specified node.
     * @apiName node-obm-get
     * @apiGroup nodes
     * @apiParam {String} identifier node identifier
     * @apiSuccess {json} obmSettings The list of ObmSettings that the node with
     *                    <code>identifier</code> has.
     * @apiError NotFound1 The node with the <code>identifier</code> was not found.
     * @apiError NotFound2 The node with the <code>identifier</code> does not have any ObmSettings.
     * @apiErrorExample {json} Error-Response:
     *     HTTP/1.1 404 Not Found
     *     {
     *       "error": "Not Found"
     *      }
     */

    router.get('/nodes/:identifier/obm', rest(function (req) {
        return nodeApiService.getNodeObmById(req.params.identifier);
        }, {
        serializer: 'Serializables.V1.Obm',
        isArray: true
    }));


    /**
     * @api {post} /api/1.1/nodes/:identifier/obm POST /:id/obm
     * @apiVersion 1.1.0
     * @apiDescription Set obm settings for specified node.
     * @apiName node-obm-post
     * @apiGroup nodes
     * @apiParam {String} identifier node identifier
     * @apiSuccess {json} node The updated node with <code>identifier</code> with
     *                    the added ObmSetting.
     * @apiError NotFound The node with the <code>identifier</code> was not found.
     * @apiErrorExample {json} Error-Response:
     *     HTTP/1.1 404 Not Found
     *     {
     *       "error": "Not Found"
     *     }
     *     HTTP/1.1 400 Bad Request
     *     {
     *       "message": "Service xxx is not supported in current node"
     *     }
     */

    router.post('/nodes/:identifier/obm', rest(function (req) {
        return nodeApiService.postNodeObmById(req.params.identifier, req.body);
    }, {
        deserializer: 'Serializables.V1.Obm',
        renderOptions: { success: 201 }
    }));


    /**
     * @api {post} /api/1.1/nodes/:identifier/obm/identify POST /:id/obm/identify
     * @apiVersion 1.1.0
     * @apiDescription Enable or disable identify light on node through OBM (if supported)
     * @apiName node-obm-identify-post
     * @apiGroup nodes
     * @apiParam {String} identifier node identifier
     * @apiParam {boolean} posted object containing "value: true" or "value: false".
     * If not included, defaults to "false", which disables identify.
     * @apiError NotFound The node with the <code>identifier</code> was not found.
     * @apiErrorExample {json} Error-Response:
     *     HTTP/1.1 404 Not Found
     *     {
     *       "error": "Not Found"
     *      }
     */

    router.post('/nodes/:identifier/obm/identify', rest(function (req) {
        return nodeApiService.postNodeObmIdById(req.params.identifier, req.body);
    }));


    /**
     * @api {get} /api/1.1/nodes/:identifier/catalogs GET /:id/catalogs
     * @apiVersion 1.1.0
     * @apiDescription Get catalogs for specified node.
     * @apiName node-catalogs-get
     * @apiGroup nodes
     * @apiParam {String} identifier node identifier
     * @apiSuccess {json} catalogs all the catalogs or an empty obect if there are none.
     * @apiError NotFound The node with the <code>identifier</code> was not found.
     * @apiErrorExample {json} Error-Response:
     *     HTTP/1.1 404 Not Found
     *     {
     *       "error": "Not Found"
     *      }
     */

    router.get('/nodes/:identifier/catalogs', rest(function (req) {
        return nodeApiService.getNodeCatalogById(req.params.identifier);
    }));


    /**
     * @api {get} /api/1.1/nodes/:identifier/catalogs/:source GET /:id/catalogs/:source
     * @apiVersion 1.1.0
     * @apiDescription Get the latest catalogs for specified node.
     * @apiName node-catalogs-get-latest-source
     * @apiGroup nodes
     * @apiParam {String} identifier node identifier
     * @apiParam {String} source catalog source type
     * @apiSuccess {json} source The source information for the node with <code>identifier</code>.
     * @apiError NotFound1 The node with the <code>identifier</code> was not found.
     * @apiError NotFound2 The <code>source</code> was not found for the node.
     * @apiErrorExample {json} Error-Response:
     *     HTTP/1.1 404 Not Found
     *     {
     *       "error": "Not Found"
     *      }
     */

    router.get('/nodes/:identifier/catalogs/:source', rest(function (req) {
        return nodeApiService.getNodeCatalogSourceById(req.params.identifier, req.params.source);
    }));


    /**
     * @api {get} /api/1.1/nodes/:identifier/pollers GET /:id/pollers
     * @apiVersion 1.1.0
     * @apiDescription Get pollers for specified node.
     * @apiName node-pollers-get
     * @apiGroup nodes
     * @apiParam {String} identifier node identifier
     * @apiSuccess {json} pollers list the pollers or an empty object is there are none
     *                    for the node with <code>identifier</code>.
     * @apiError NotFound The node with the <code>identifier</code> was not found.
     * @apiErrorExample {json} Error-Response:
     *     HTTP/1.1 404 Not Found
     *     {
     *       "error": "Not Found"
     *      }
     */

    router.get('/nodes/:identifier/pollers', rest(function (req) {
        return nodeApiService.getPollersByNodeId(req.params.identifier);
    }));

    /**
     * @api {post} /api/1.1/nodes/:macaddress/dhcp/whitelist POST /:mac/dhcp/whitelist
     * @apiVersion 1.1.0
     * @apiDescription Post whitelist.
     * @apiName node-dhcp-whitelist-post
     * @apiGroup nodes
     * @apiParam {String} macaddress macaddress of node
     */

    router.post('/nodes/:macaddress/dhcp/whitelist', rest(function(req) {
        return nodeApiService.addToDhcpWhitelist(req.params.macaddress);
    }, { renderOptions: { success: 201 }}));

    /**

     * @api {delete} /api/1.1/nodes/:macaddress/dhcp/whitelist DELETE /:mac/dhcp/whitelist
     * @apiVersion 1.1.0
     * @apiDescription Remove a whitelist of specified mac address
     * @apiName node-dhcp-whitelist-delete
     * @apiGroup nodes
     * @apiParam {String} macaddress macaddress of node
     */

    router.delete('/nodes/:macaddress/dhcp/whitelist', rest(function(req) {
        return nodeApiService.delFromDhcpWhitelist(req.params.macaddress);
    }, { renderOptions: { success: 204 }}));

    /**
     * @api {get} /api/1.1/nodes/:identifier/workflows GET /:id/workflows
     * @apiVersion 1.1.0
     * @apiDescription Get workflows of node.
     * @apiName node-workflows-get
     * @apiGroup nodes
     * @apiParam {String} identifier of node
     * @apiSuccess {json} workflows the list of workflows or an empty object if
     *                    there isn't any for the node.
     * @apiError NotFound The node with the <code>identifier</code> was not found.
     * @apiErrorExample Error-Response:
     *     HTTP/1.1 404 Not Found
     *     {
     *       "error": "Not Found"
     *     }
     */

    router.get('/nodes/:identifier/workflows', rest(function (req) {
        return nodeApiService.getNodeWorkflowById(req.params.identifier);
    }));

    /**
     * @api {post} /api/1.1/nodes/:identifier/workflows POST /?name=
     * @apiVersion 1.1.0
     * @apiDescription Create workflow for node.
     * @apiName node-workflows-post
     * @apiGroup nodes
     * @apiParam {String} identifier node identifier
     * @apiParam {query} name  Query Graphs by name
     * @apiSuccess {json} workflow the workflow that was created
     * @apiError NotFound The node with the <code>identifier</code> was not found.
     * @apiError ErrorGraphName The Graph name does not exist.
     * @apiErrorExample Error-Response:
     *     HTTP/1.1 404 Not Found
     *     {
     *       "error": "Not Found"
     *     }
     */

    router.post('/nodes/:identifier/workflows', rest(function(req) {
        //TODO(heckj): how are we assigning a nodes to a workflow - through
        // options? Merge in req.params.identifier?
        var config = _.defaults(req.query || {}, req.body || {});

        return nodeApiService.setNodeWorkflow(req.params.identifier, config.name, config.options);
    }, { renderOptions: { success: 201 } }));



    /**
     * @api {get} /api/1.1/nodes/:identifier/workflows/active GET /:id/workflows/active
     * @apiVersion 1.1.0
     * @apiDescription Fetch the  active workflow for the specified node
     * @apiName node-workflows-active-get
     * @apiGroup nodes
     * @apiParam {String} identifier node identifier
     * @apiSuccess {json} workflow  the active workflow for that node.
     * @apiError NotFound1 The node with the <code>identifier</code> was not found.
     * @apiError NotFound2 The node with the <code>identifier</code> does not have an
     *                     active workflow.
     * @apiErrorExample Error-Response:
     *     HTTP/1.1 404 Not Found
     *     {
     *       "error": "Not Found"
     *     }
     */

    router.get('/nodes/:identifier/workflows/active', rest(function (req) {
        return nodeApiService.getActiveNodeWorkflowById(req.params.identifier);
    }));

    /**
     * @api {delete} /api/1.1/nodes/:identifier/workflows/active DELETE /:id/workflows/active
     * @apiVersion 1.1.0
     * @apiDescription delete the current active workflow for the specified node
     * @apiName node-workflows-active-delete
     * @apiGroup nodes
     * @apiParam {String} identifier node identifier
     * @apiSuccess (Success 200) {json} workflow  the deleted active workflow for that node.
     * @apiSuccess (Success 204) empty no acitve workflow
     * @apiError NotFound The node with the <code>identifier</code> was not found.
     * @apiErrorExample Error-Response:
     *     HTTP/1.1 404 Not Found
     *     {
     *       "error": "Not Found"
     *     }
     */

    router.delete('/nodes/:identifier/workflows/active', rest(function (req) {
        return nodeApiService.delActiveWorkflowById(req.params.identifier);
    }));

    /**
     * @api {get} /api/1.1/nodes/:identifier/tags GET /:id/tags
     * @apiVersion 1.1.0
     * @apiDescription Retrieve the tags on the node
     * @apiName get-node-tags
     * @apiGroup nodes
     * @apiParam {String} identifier node identifier
     * @apiSuccess (Success 200) {json} tags  the list of tags for that node.
     * @apiError NotFound The node with the <code>identifier</code> was not found.
     */
     router.get('/nodes/:identifier/tags', rest(function(req) {
        return nodeApiService.getTagsById(req.params.identifier);
    }));

    /**
     * @api {patch} /api/1.1/nodes/:identifier/tags PATCH /:id/tags
     * @apiVersion 1.1.0
     * @apiDescription Add tags to a node
     * @apiName patch-node-tags
     * @apiGroup nodes
     * @apiParam {String} identifier node identifier
     * @apiSuccess (Success 200) {json} tags  the list of tags for that node.
     * @apiError NotFound The node with the <code>identifier</code> was not found.
     */
    router.patch('/nodes/:identifier/tags', rest(function (req) {
        if(req.body.tags) {
            return nodeApiService.addTagsById(req.params.identifier, req.body.tags);
        }
    }));

    /**
     * @api {delete} /api/1.1/nodes/:identifier/tags/:name DELETE /:id/tags/:name
     * @apiVersion 1.1.0
     * @apiDescription Delete tag from a node
     * @apiName del-node-tag
     * @apiGroup nodes
     * @apiParam {String} identifier node identifier
     * @apiParam {String} Name of tag to remove
     * @apiSuccess (Success 204) Empty
     * @apiError NotFound The node with the <code>identifier</code> was not found.
     */
    router.delete('/nodes/:identifier/tags/:name', rest(function(req) {
        return nodeApiService.removeTagsById(req.params.identifier, req.params.name);
    }));

    return router;
}
