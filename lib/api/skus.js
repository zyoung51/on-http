// Copyright 2015, EMC, Inc.

'use strict';

var di = require('di'),
    express = require('express'),
    parser = require('body-parser'),
    zlib = require('zlib'),
    tar = require('tar'),
    path = require('path');

module.exports = skusRouterFactory;

di.annotate(skusRouterFactory, new di.Provide('Http.Api.Skus'));
di.annotate(skusRouterFactory, new di.Inject(
        'Services.Waterline',
        'Http.Services.RestApi',
        '_',
        'Promise',
        'Protocol.TaskGraphRunner',
        'uuid',
        'Http.Services.SkuPack',
        'osTmpdir'
    )
);

function skusRouterFactory (waterline, rest, _, Promise, taskGraphProtocol, uuid, skuPack, osTmpdir) {
    var router = express.Router();

    var skuPackHandler = function(req,res,skuid) {
        var name = uuid('v4');
        var tmpDir = osTmpdir()
        var skuName = '';
        req.pipe(zlib.createGunzip())
            .pipe(tar.Extract({path: tmpDir + '/' + name}))
            .on('end', function() {                                   
                skuPack.installPack(tmpDir + '/' + name,skuid)
                    .spread(function(filename, contents) {
                        skuName = path.basename(filename, '.json');
                        return skuPack.registerPack(filename, contents)
                    })
                    .then(function() {
                        return regenerateSkus();
                    })
                    .then(function() {
                        res.status(201);
                        res.send(skuName);
                    })
                    .catch(function(e) {
                        res.status(500).json({
                            error: 'Failed to serve file request:' + e.message
                        });                            
                    });
            })
            .on('error', function() {
                res.status(500).json({
                    error: 'Failed to serve file request:' + e.message
                });
            });
    };

    /**
     * @api {get} /api/1.1/skus/ GET /
     * @apiVersion 1.1.0
     * @apiDescription get list of skus
     * @apiName skus-get
     * @apiGroup skus
     * @apiSuccess {json} skus a list of all skus, or an empty object if there are none.
     */

    router.get('/skus', rest(function (req) {
        return waterline.skus.find(req.query);
    }));

    /**
     * @api {get} /api/1.1/skus/:identifier GET /:id
     * @apiVersion 1.1.0
     * @apiDescription get specific sku details
     * @apiName sku-get
     * @apiGroup skus
     * @apiParam {String} identifier of sku, must cast to ObjectId
     * @apiError NotFound There is no sku with the <code>identifier</code>
     * @apiErrorExample Error-Response:
     *     HTTP/1.1 404 Not Found
     *     {
     *       "error": "Not Found"
     *     }
     */

    router.get('/skus/:identifier', rest(function (req) {
        return waterline.skus.needByIdentifier(req.params.identifier);
    }));

    /**
     * @api {get} /api/1.1/skus/:identifier/nodes GET /:id/nodes
     * @apiVersion 1.1.0
     * @apiDescription get nodes for specific sku
     * @apiName sku-get-nodes
     * @apiGroup skus
     * @apiParam {String} identifier of sku, must cast to ObjectId
     * @apiError NotFound There is no sku with the <code>identifier</code>
     * @apiErrorExample Error-Response:
     *     HTTP/1.1 404 Not Found
     *     {
     *       "error": "Not Found"
     *     }
     */

    router.get('/skus/:identifier/nodes', rest(function (req) {
        return waterline.skus.needByIdentifier(req.params.identifier).then(function (sku) {
            return waterline.nodes.find({ sku: sku.id });
        });
    }));

    /**
     * @api {post} /api/1.1/skus POST /
     * @apiVersion 1.1.0
     * @apiDescription create a sku
     * @apiName sku-post
     * @apiGroup skus
     * @apiError E_VALIDATION attributes are invalid.
     */

    router.post('/skus', parser.json(), rest(function (req) {
       return waterline.skus.create(req.body).then(function (sku) {
            return regenerateSkus().then(function () {
                return sku;
            });
        });
    }));

    /**
     * @api {post} /api/1.1/skus/pack PUT /
     * @apiVersion 1.1.0
     * @apiDescription create a sku following the rules in the pack
     * @apiName sku-pack-put
     * @apiGroup skus
     * @apiError E_VALIDATION attributes are invalid.
     */

    router.put('/skus/pack', function(req, res) {
        return skuPackHandler(req,res);
    });

    /**
     * @api {patch} /api/1.1/skus/:identifier PATCH /:id
     * @apiVersion 1.1.0
     * @apiDescription patch specific sku
     * @apiName sku-patch
     * @apiGroup skus
     * @apiParam {String} identifier of sku, must cast to ObjectId
     * @apiError NotFound There is no sku with the <code>identifier</code>
     * @apiErrorExample Error-Response:
     *     HTTP/1.1 404 Not Found
     *     {
     *       "error": "Not Found"
     *     }
     */

    router.patch('/skus/:identifier', parser.json(), rest(function (req) {
       return waterline.skus.updateByIdentifier(
            req.params.identifier,
            req.body
        ).then(function (sku) {
            return regenerateSkus().then(function () {
                return sku;
            });
        });
    }));

    /**
     * @api {put} /api/1.1/skus/:identifier/pack PUT /:id/pack
     * @apiVersion 1.1.0
     * @apiDescription post a sku pack to specific sku
     * @apiName sku-pack-id-put
     * @apiGroup skus
     * @apiParam {String} identifier of sku, must cast to ObjectId
     * @apiError NotFound There is no sku with the <code>identifier</code>
     * @apiErrorExample Error-Response:
     *     HTTP/1.1 500 Internal Server Error
     *     {
     *       "error": "error message"
     *     }
     */

    router.put('/skus/:identifier/pack', function(req, res) {
        return waterline.skus.needByIdentifier(req.params.identifier)
            .then(function() {
                return skuPackHandler(req,res,req.params.identifier);
            })
    });
    
    /**
     * @api {delete} /api/1.1/skus/:identifier DELETE /:id
     * @apiVersion 1.1.0
     * @apiDescription Delete specific sku.
     * @apiName sku-delete
     * @apiGroup skus
     * @apiParam {String} identifier of sku, must cast to ObjectId
     * @apiError NotFound There is no sku with the <code>identifier</code>
     * @apiErrorExample Error-Response:
     *     HTTP/1.1 404 Not Found
     *     {
     *       "error": "Not Found"
     *     }
     */

    router.delete('/skus/:identifier/pack', rest(function (req) {
        return waterline.skus.needByIdentifier(req.params.identifier)
            .then(function() {
                skuPack.deletePack(req.params.identifier);
            });
    }, { renderOptions: { success: 204 }}));

    /**
     * @api {delete} /api/1.1/skus/:identifier DELETE /:id
     * @apiVersion 1.1.0
     * @apiDescription Delete specific sku.
     * @apiName sku-delete
     * @apiGroup skus
     * @apiParam {String} identifier of sku, must cast to ObjectId
     * @apiError NotFound There is no sku with the <code>identifier</code>
     * @apiErrorExample Error-Response:
     *     HTTP/1.1 404 Not Found
     *     {
     *       "error": "Not Found"
     *     }
     */

    router.delete('/skus/:identifier', rest(function (req) {
        return waterline.skus.destroyByIdentifier(
            req.params.identifier
        ).then(function (sku) {
            return regenerateSkus().then(function () {
                return sku;
            });
        });
    }, { renderOptions: { success: 204 }}));

    function regenerateSkus() {
        return waterline.nodes.find({}).then(function (nodes) {
            return Promise.all(nodes.map(function (node) {
                return taskGraphProtocol.runTaskGraph(
                    'Graph.GenerateSku',
                    { defaults: { nodeId: node.id }}
                );
            }));
        });
    }

    return router;
}
