"use strict";
const pulumi = require("@pulumi/pulumi");
const aws = require("@pulumi/aws");

let config = JSON.stringify(
    [
        {"classification": "presto-config",
         "properties": {
             "experimental.spill-enabled": "true",
             "experimental.spiller-spill-path": "/mnt/tmp",
             "join-distribution-type": "AUTOMATIC",
             "optimizer.join-reordering-strategy": "AUTOMATIC"
         }
        },
        {"classification":"presto-connector-hive",
         "properties": {
             "hive.recursive-directories": "true",
             "hive.metastore.glue.datacatalog.enabled": "true",
             "hive.allow-drop-table": "true",
             "hive.allow-rename-table": "true"
         }},
        {"classification": "hive-site",
         "properties": {
             "hive.metastore.client.factory.class":"com.amazonaws.glue.catalog.metastore.AWSGlueDataCatalogHiveClientFactory"}},
        {"classification": "spark-hive-site",
         "properties": {
             "hive.metastore.client.factory.class": "com.amazonaws.glue.catalog.metastore.AWSGlueDataCatalogHiveClientFactory"}}
    ]);

let instanceRole = new aws.iam.Role("role", {
    assumeRolePolicy: JSON.stringify({
        "Version": "2008-10-17",
        "Statement": [
            {
                "Sid": "",
                "Effect": "Allow",
                "Principal": {
                    "Service": ["ec2.amazonaws.com"]
                },
                "Action": "sts:AssumeRole"
            }
        ]
    })
});

new aws.iam.RolePolicyAttachment('instance-role-policy-attachment', {
    role: instanceRole.name,
    policyArn: "arn:aws:iam::aws:policy/service-role/AmazonElasticMapReduceforEC2Role"
});

let instanceProfile = new aws.iam.InstanceProfile('profile', {
    name: "test-instance-profile",
    role: instanceRole.name
});

let serviceRole = new aws.iam.Role('service-role', {
    assumeRolePolicy: JSON.stringify({
        "Version": "2008-10-17",
        "Statement": [
            {
                "Sid": "",
                "Effect": "Allow",
                "Principal": {
                    "Service": ["elasticmapreduce.amazonaws.com"]
                },
                "Action": "sts:AssumeRole"
            }
        ]
    })
});

new aws.iam.RolePolicyAttachment('service-role-policy-attachment', {
    role: serviceRole.name,
    policyArn: "arn:aws:iam::aws:policy/service-role/AmazonElasticMapReduceRole"
});

let cluster = new aws.emr.Cluster(`test-cluster`, {
    name: `test-cluster`,
    releaseLabel: "emr-5.23.0",
    applications: ["Hadoop", "Hive", "Presto", "Spark"],
    masterInstanceGroup: {
        instanceType: "m4.large"
    },
    coreInstanceGroup: {
        instanceType: "m4.large",
        instanceCount: 3
    },
    ebsRootVolumeSize: 15,
    ec2Attributes: {
        instanceProfile: instanceProfile.arn,
        keyName: "lukevanderhart"
    },
    serviceRole: serviceRole.name,
    configurationsJson: config
});
