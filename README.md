# AWS SSM Patching Status Grafana Dashboard

## Architecture Overview
![kibanaImport](/images/image1.png)

## Installation and Usage instructions
For those familiar with AWS. Lambda code is in **index.js** and you'll need to setup an event trigger on SNS topic which is configured in System Manager for configuring maintenance window task to call the Lambda function. Then visit the Grafana interface and import the **/dashboard/grafana-dashboard-export.json** file which imports the dashboard and all the required searches/virtualizations

### Part 1: Deploying
1. Git clone the repo or download the whole thing from the release page

2. Create Lambda function using **index.js** file with following environment variables
   * *elasticsearchurl :* http or https URL of Elasticsearch server which is accessible within VPC
   
   ![S3config](/images/image2.png)

3. Go to SNS service and perform following steps : 
   * create new SNS Topic 
   * Add new subscription as Lambda Endpoint for Lambda function created in above step

4. Go to System Manager service and perform following steps :
    * Add SNS topic ARN created in above step to all maintenance window task which you would like to subcribe to push data for data visualization
    
5. Now SSM patching logs sent to SNS and then its processed by the lambda function and will start pushing those into elasticsearch. You can check by looking at the ElasticSearch index's. You should see an index titled logstash-YYYY-MM-DD


### Part 2: Setting up the dashboard
1. Now you can visit your Grafana URL

2. Click import and select the **/dashboard/grafana-dashboard-export.json** file.
![kibanaImport](/images/image3.png)

4. If all goes successfully you should see the following saved objects post the import. You can now go and view your dashboard by going to **Dashboard** selecting **open** and selecting **SSM-Patching-Status-Dashboard**
  <img src="/images/image4.png" width="1283px">
 
  <img src="/images/image5.png"  width="1283px">

  <img src="/images/image6.png" width="1283px">
