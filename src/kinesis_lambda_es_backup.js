/*
 * Sample node.js code for AWS Lambda to upload the JSON documents
 * pushed from Kinesis to Amazon Elasticsearch.
 *
 *
 * Copyright 2015- Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Amazon Software License (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at http://aws.amazon.com/asl/
 * or in the "license" file accompanying this file.  This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
 * express or implied.  See the License for the specific language governing
 * permissions and limitations under the License.
 */

/* == Imports == */
var AWS = require('aws-sdk');
var path = require('path');

/* == Globals == */
var esDomain = {
    region: 'us-east-1',
    endpoint: 'https://search-search-es-twitter-demo2-t6iauxf23yvieuyslrdyyswdsq.us-east-1.es.amazonaws.com',
    index: 'iot-twitter',
    doctype: 'tweet',
    source: 'twitter'
};
var endpoint = new AWS.Endpoint(esDomain.endpoint);
/*
 * The AWS credentials are picked up from the environment.
 * They belong to the IAM role assigned to the Lambda function.
 * Since the ES requests are signed using these credentials,
 * make sure to apply a policy that allows ES domain operations
 * to the role.
 */
var creds = new AWS.EnvironmentCredentials('AWS');


/* Lambda "main": Execution begins here */
exports.handler = function(event, context) {
    console.log(JSON.stringify(event, null, '  '));
    event.Records.forEach(function(record) {
        var jsonDoc = new Buffer(record.kinesis.data, 'base64');
        postToES(jsonDoc.toString(), context);
    });
}


/*
 * Post the given document to Elasticsearch
 */
function postToES(doc, context) {
    var req = new AWS.HttpRequest(endpoint);

    //var now = new Date();

    //esDomain.index=esDomain.index+'-'+now;

    // GET CURRENT DATE
    var date = new Date();

// GET YYYY, MM AND DD FROM THE DATE OBJECT
    var yyyy = date.getFullYear().toString();
    var mm = (date.getMonth()+1).toString();
    var dd  = date.getDate().toString();

// CONVERT mm AND dd INTO chars
    var mmChars = mm.split('');
    var ddChars = dd.split('');

// CONCAT THE STRINGS IN YYYY-MM-DD FORMAT
    var datestring = yyyy + '-' + (mmChars[1]?mm:"0"+mmChars[0]) + '-' + (ddChars[1]?dd:"0"+ddChars[0]);

    console.log(doc.toString());
    req.method = 'POST';
    req.path = path.join('/', esDomain.index+'-'+datestring, esDomain.doctype);
    req.region = esDomain.region;
    req.headers['presigned-expires'] = false;
    req.headers['Host'] = endpoint.host;
    req.body = doc;
    console.log('Before Signer');
    var signer = new AWS.Signers.V4(req , 'es');  // es: service code
    signer.addAuthorization(creds, date);
    console.log('After Request');
    var send = new AWS.NodeHttpClient();
    console.log('Before Request');
    send.handleRequest(req, null, function(httpResp) {
        var respBody = '';
        httpResp.on('data', function (chunk) {
            respBody += chunk;
        });
        httpResp.on('end', function (chunk) {
            console.log('Response: ' + respBody);
            context.succeed('Lambda added document ' + doc);
        });
    }, function(err) {
        console.log('Error: ' + err);
        context.fail('Lambda failed with error ' + err);
    });
}