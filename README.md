# iiotswat-kinesis-elasticsearch-lambda
Data ingestion for Amazon Elasticsearch Service Amazon Kinesis, using AWS Lambda
# Streaming Data to Amazon Elasticsearch Service
## Using AWS Lambda:
### Introduction
It is often useful to stream data, as it gets generated, for indexing in an
Amazon Elasticsearch Service domain.  This helps fresh data to be available for
search or analytics.  To do this requires:

1. Knowing when new data is available
2. Code to pick up and parse the data into JSON documents, and add them to an
   Amazon Elasticsearch (henceforth, ES for short) domain.
3. Scalable and fully managed infrastructure to host this code

*Lambda* is an AWS service that takes care of these requirements.  Put simply,
it is an "event handling" service in the cloud.  Lambda lets us implement
the event handler (in Node.js or Java), which it hosts and invokes in response
to an event.

The handler can be triggered by a "push" or a "pull" approach.
Certain event sources (such as S3) push an event notification to Lambda.
Others (such as Kinesis) require Lambda to poll for events and pull them
when available.

For more details on AWS Lambda, please see
[the documentation](http://aws.amazon.com/documentation/lambda/).

This package contains sample Lambda code (in Node.js) to stream data to ES
from two common AWS data sources: S3 and Kinesis.  The S3 sample takes apache
log files, parses them into JSON documents and adds them to ES.  The Kinesis
sample reads JSON data from the stream and adds them to ES.

Note that the sample code has been kept simple for reasons for clarity.  It
does not handle ES document batching, or eventual consistency issues for
S3 updates, etc.

### Setup Overview

While some detailed instructions are covered later in this file and elsewhere
(in the Lambda documentation), this section aims to show the larger picture
that the individual steps work to accomplish. 

1. **Deployment Package**: The "Deployment Package" is the event handler code files
   and its dependencies packaged as a zip file.  The first step in creating
   a new Lambda function is to prepare and upload this zip file.

2. **Lambda Configuration**:

   1. Handler: The name of the main code file in the deployment package,
      with the file extension replaced with a `.handler` suffix.
   2. Memory: The memory limit, based on which the EC2 instance type to use
      is determined.  For now, the default should do.
   3. Timeout: The default timeout value (3 seconds) is quite low for our
      use-case.  10 seconds might work better, but please adjust based on
      your testing.

3. **Authorization**: Since there is a need here for various AWS services making
   calls to each other, appropriate authorization is required.  This takes
   the form of configuring an IAM role, to which various authorization policies
   are attached.  This role will be assumed by the Lambda function when running.

Note:

* The AWS Console is simpler to use for configuration than other methods.
* Lambda is currently available only in a few regions (us-east-1, us-west-2,
  eu-west-1, ap-northeast-1).
* Once the setup is complete and tested, enable the data source in the Lambda
  console, so that data may start streaming in.
* The code is kept simple for purposes of illustration.  It doesn't batch
  documents when loading the ES domain, or (for S3 updates) handle
  eventual consistency cases.

#### Deployment Package Creation
1. On your development machine, download and install [Node.js](https://nodejs.org/en/).
2. Anywhere, create a directory structure similar to the following:

       eslambda (place sample code here)
       |
       +-- node_modules (dependencies will go here)

3. Modify the sample code with the correct ES endpoint, region, index
   and document type.
4. Install each dependency imported by the sample code
   (with the `require()` call), as follows:

       npm install <dependency>

   Verify that these are installed within the `node_modules` subdirectory.
5. Create a zip file to package the code and the `node_modules` subdirectory

       zip -r eslambda.zip *

The zip file thus created is the Lambda Deployment Package.

## Kinesis-Lambda-ES

Set up the Lambda function and the Kinesis stream as described in the
[Lambda-Kinesis Walkthrough](http://docs.aws.amazon.com/lambda/latest/dg/walkthrough-kinesis-events-adminuser.html).
Please keep in mind the following notes and configuration overrides:

* The walkthrough uses the AWS CLI, but it's probably more convenient to use
  the AWS Console (web UI) for Lambda configuration.

* To the IAM role assigned to the Lambda function, add the following
  access policy to permit ES operations.

        {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Action": [
                        "es:*"
                    ],
                    "Effect": "Allow",
                    "Resource": "*"
                }
            ]
        }

* For testing: If you have a Kinesis client, use it to stream a record to Lambda.
