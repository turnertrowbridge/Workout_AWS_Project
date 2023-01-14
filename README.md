# Workout Database Project Using AWS

**Background:**  
I like to go to gym and track my weightlifting progress on an app. I would like to see more advanced statistics about my workouts but the app wants you to pay an $8.99 monthly subscription.  
  
**Idea:**  
Create a way to send the workout that has a predictable format to a database that is _free or cheap to maintain._ Additionally, set up some some formulas to track advanced statistics.  
  
**Implementation Idea:**  
Using the AWS Free Tier resources, receive workout data as an email via Simple Email Services, and trigger a Lambda Function. This Lambda function runs a script to parse the data from the email and upload the parsed data to an RDS MySQL Database instance. Another Lambda would be run after the data is uploaded to send a workout summary back to the user. Set up a bastion host to remotely ssh into that allows access to the database.
  
**Database Schema:**  
![Workout_MySQL drawio (1)](https://user-images.githubusercontent.com/69882779/212498299-ebfe5e1a-7cf2-4e84-bdc6-64e5ec06448b.png)

  
**Current Implementation:**  
A user must manually upload a .txt file to S3 Bucket and call the lambda for the database to store the data. No summary report or SES implmentation yet.

**Roadbumps:**
Trying to avoid the use of a costly NAT gateway as this costs $0.045 per availability zone per hour. The NAT gateway is necessary to retrieve the S3 Bucket data and the secret from the Secrets Manager. This is due to the Lambda being in VPC preventing internet access without the gateway. The solution I have currently implemnted is a free VPC endpoint that allows the lambda to connect to the S3 Bucket and a $0.005 per hour VPC Interface to Secrets Manager.
  
**Current AWS Architecture:**  
![AWS_WorkoutProject drawio](https://user-images.githubusercontent.com/69882779/212497621-5ffbd174-f85b-4690-bce1-69c54044cd3a.png)

**Future Tasks:** 
S3 bucket upload triggers Lambda  
Set up a domain using Route 53  
Register a SES email to domain  
SES either uploads .txt to S3 bucket or directly passes data to Lambda  
Set-up SQS to deal with emails  

**Future Ideas:**  
Create a frontend app using swift that eliminates the need for a third-party app.  
