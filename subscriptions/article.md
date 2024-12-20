Appsync has many abstractions for building subscription based request and response patterns,but the way it's set up can feel like a nebulous mess when it comes to actually spinning up components.

In this walkthrough, I'm going to talk about the various components of how to set up the functionality, and how the system fits together. I'm also going to discuss multiple

## Use Case

You have some long running functionality that you would like to kick off from the frontend, but it will take longer than the 30 seconds allotted to you on standard REST requests. So you've decided to use subscriptions to manage the functionality.

This will not cover the frontend components of the work, just the backend. And for simplicity's sake, I'm going to
use API Key authentication instead of OIDC, so extra layers of communication are unnecessary.

This is also using an existing Appsync API, so won't take advantage of the new functionality related to Appsync Events.

## Overview

### Workflow

The basic user flow for the functionality should go something like this:

1. The user submits a request
2. The user subscribes to updates from the API
3. The API processes the request asynchronously
4. The API "emits" data back to the user in the form of a mutation.

### Components

In order to make this happen we'll need a few different things:

- An Appsync Instance
- A Mutation to Fire off the Request
- A Subscription for the frontend to hook into
- A Mutation for the Backend to emit the data from
- A lambda to "process" the user request
- A resolver for the initial mutation
- A resolver for the subscription
- A resolver for the response mutation

### The Schema

The schema should be the easiest component of the workflow, but there are a few gotchas to note as we work through it.

```schema.graphql

# A basic request type for us to play around with
type RequestSubmission {
  id: ID!
  note: String!
  success: Boolean!
}

# The RequestResult input and output will mimic each other
# so we have a consistent set of information to pass through our subscription
input RequestResultInput {
  id: ID!
  note: String!
  response: String!
  processedOn: String!
}

type RequestResult {
  id: ID!
  note: String!
  response: String!
  processedOn: String!
}

type Mutation {
  # What the client will hit to kick off the processing
  submitRequestForProcessing(id: ID!, note: String!): RequestSubmission

  # How the Lambda will communicate back
  emitSuccessfulRequest(input: RequestResultInput): RequestResult!
}

type Subscription {
  # Appsync will use the ID to filter out
  onSuccessfulResult(id: ID!): RequestResult!
  @aws_subscribe(mutations: ["emitSuccessfulRequest])
  # This directive is what tells Appsync what to listen for to send information back to the user
}
```

### Infrastructure

```template.yaml
Resources:
  RequestProcessor:
    Type: AWS::Serverless::Function
    Properties:
      Runtime: nodejs20.x
      CodeUri: ./lambda/processor.js
  GraphqlApi:
    Type: AWS::Serverless::GraphQLApi
    Properties:
      Name: test-api
      Auth:
      SchemaUri: schema.graphql
      DataSource:
      Functions:
      Resolvers:

  NoneTypeDataSource:
    Type: AWS::AppSync::DataSource
    Properties:
      ApiId: !GetAtt GraphQLApi.ApiId
      Type: NONE
      Name: NoneTypeDataSource
      Description: An empty data source. Used for subscription resolvers that do not require a data source.

  OnSuccessfulResultResolver:
    Type: AWS::AppSync::Resolver
    Properties:
      ApiId: !GetAtt GraphqlApi.ApiId
      TypeName: Subscription
      FieldName: onSuccessfulResult
      Kind: UNIT
      CodeS3Location: ./resolvers/onSuccessfulResult.js
      DataSourceName: !GetAtt NoneTypeDataSource.Name
      Runtime:
        Name: APPSYNC_JS
        RuntimeVersion: 1.0.0

  EmitSuccessfulResultResolver:
    Type: AWS::AppSync::Resolver
    Properties:
      ApiId: !GetAtt GraphqlApi.ApiId
      TypeName: Mutation
      FieldName: emitSuccessfulResult
      Kind: UNIT
      CodeS3Location: ./resolvers/emitSuccessfulResult.js
      DataSourceName: !GetAtt NoneTypeDataSource.Name
      Runtime:
        Name: APPSYNC_JS
        RuntimeVersion: 1.0.0

```

## Next Steps:

- Update lambda function with actual request code
- Add Api Url to lambda env
- Update the resolver code
- Add resolver code with the IAM checking
- Create resolver role
- Add the appropriate decorators to the graphql for IAM authentication

## Resources

## Questions for me:

- Do you need to do resolver level validation for an IAM role?
  - Hypothesis: No
- Where do you set the flag for resolvers to be asynchronous invocations?
- How do you structure the directive to handle
