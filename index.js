var AWS = require('aws-sdk')
var creds = new AWS.EnvironmentCredentials('AWS');

var esDomain = {
    region: 'us-east-1',
    account: 'demo-cust',
    index: 'ssmspatching-',
    doctype: 'ssms'
};

exports.handler = async (event, context, callback) => {
	//setup the callback and esurl so we can access that across functions without a prototype or bind
    global.lambdaCallback = callback;
    global.elasticsearchURL = process.env.elasticsearchurl
    
    console.log(JSON.stringify(event));
    console.log("Message = " + event.Records[0].Sns.Message);
    
    var obj = JSON.parse(event.Records[0].Sns.Message);

    console.log("commandId = " + obj.commandId);
    console.log("instanceId = " + obj.instanceId);
    console.log("status = " + obj.status);
    console.log("eventTime = " + obj.eventTime);
    console.log("requestedDateTime = " + obj.requestedDateTime);
    console.log("region = " + "us-east-1");
    
    obj["timestamp"] = event.Records[0].Sns.Timestamp;
    
    var ec2 = new AWS.EC2();
    var params = { InstanceIds: [obj.instanceId.toString()] };
    var data = await ec2.describeInstances(params).promise();
	console.log("data = " + JSON.stringify(data))
    for(var r=0,rlen=data.Reservations.length; r<rlen; r++) {
		var reservation = data.Reservations[r];
		
		for(var i=0,ilen=reservation.Instances.length; i<ilen; ++i) {
			var instance = reservation.Instances[i];
			var name = '';
			for(var t=0,tlen=instance.Tags.length; t<tlen; ++t) {
				if(instance.Tags[t].Key === 'Name') {
					obj["name"] = instance.Tags[t].Value;
				}
				if(instance.InstanceId === 'InstanceId') {
					obj["instanceId"] = instance.InstanceId;
				}
				if(instance.InstanceType === 'InstanceType') {
					obj["instanceType"] = instance.InstanceType;
				}
				if(instance.Tags[t].Key === 'Customer') {
					obj["customer"] = instance.Tags[t].Value;
				}
				if(instance.Tags[t].Key === 'Application') {
					obj["application"] = instance.Tags[t].Value;
				}
				if(instance.Tags[t].Key === 'Environment') {
					obj["environment"] = instance.Tags[t].Value;
				}
				if(instance.Tags[t].Key === 'Patch Group') {
					obj["patchGroup"] = instance.Tags[t].Value;
				}
			}
		}
	}

	console.log(JSON.stringify(obj))
    if(obj.status=="Success" || obj.status=="Failed" || obj.status=="Cancelled"){    	
		signAndSendRequestToES(obj);
    }
    
    const response = {
        statusCode: 200,
        body: JSON.stringify('Success'),
    };
    return response;
};

function signAndSendRequestToES(singlejsonPayload)
{
	console.log("Writing json to elasticsearch...");
	console.log(singlejsonPayload);
	var endpoint =  new AWS.Endpoint(global.elasticsearchURL);
	var req = new AWS.HttpRequest(endpoint);

	//console.log(singlejsonPayload);
	//return 0;
	var date = new Date()
	singlejsonPayload["@timestamp"] = date.toISOString();
	singlejsonPayload["region"] = esDomain.region;
	singlejsonPayload["account"] = esDomain.account;

	//date = date.getFullYear()+"."+date.getMonth()+"."+date.getDate()
	mytime = date.toISOString();
	mytime = mytime.substring(0,mytime.indexOf('T'));
	date = mytime.replace(/-/g,'.');

	//build request
	req.method = 'POST';
	req.path = '/' +esDomain.index+date+"/"+esDomain.doctype;
	req.region = esDomain.region;
	req.body = JSON.stringify(singlejsonPayload);
	req.headers['presigned-expires'] = false;
	req.headers['Content-Type'] = "application/json";
	req.headers['Host'] = global.elasticsearchURL;

	// Sign the request (Sigv4)
	var signer = new AWS.Signers.V4(req, 'es');
	signer.addAuthorization(creds, new Date());

	// Post document to ES
	var send = new AWS.NodeHttpClient();
	console.log("posting request now");
	console.log("request = " + req.toString());
	send.handleRequest(req, null, function(httpResp) {
		var body = '';
		console.log("httpResp = " + httpResp)
		httpResp.on('data', function (chunk) {
			body += chunk;
			console.log("ondata"+ chunk);
		});
		httpResp.on('error', function (chunk) {
			console.log("ERRRRROROR")
			console.log(chunk)
			console.log("error chunk above - end")
		});
		httpResp.on('end', function (chunk) {
				console.log('DONE!'); // log done but don't callback - we may have other threds still running here
				console.log('Date is: '+date)
				console.log(body)
		});
	}, function(err) {
		console.log('Error: ' + err);
	});
}