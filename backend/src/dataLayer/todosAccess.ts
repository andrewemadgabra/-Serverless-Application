import * as AWS  from 'aws-sdk'
import { DocumentClient } from 'aws-sdk/clients/dynamodb'
import { TodoItem } from '../models/TodoItem'
import { TodoUpdate } from '../models/TodoUpdate'
import { createLogger } from '../utils/logger'


const logger = createLogger('Todo DataAcess')
import Jimp from 'jimp/es';


export class TodoAccess {

  constructor(

    //Create a DynamoDB client
    private readonly docClient: DocumentClient = createDynamoDBClient(),

    //Retrieve the Evironment Variables For all the Resources
    private readonly todosTable = process.env.TODOS_TABLE,
    private readonly userIdIndex = process.env.USERID_INDEX,
    private readonly bucketName = process.env.TODOS_S3_BUCKET,
    private readonly expires = process.env.SIGNED_URL_EXPIRATION,        
    private readonly attachmentBucketName = process.env.ATTACHMENTS_S3_BUCKET,
    private readonly region = process.env.BUCKET_REGION
  ) {}

  async getUserTodos(userId: string): Promise<TodoItem[]> {

    //KeyConditionExpression is used because We are using
    //Query method to search for items. 
    var params = {
      TableName: this.todosTable,
      IndexName: this.userIdIndex,
      ProjectionExpression: "todoId, createdAt, #name, dueDate, done, attachmentUrl",
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeNames:{
        "#name": "name"
      },        
      ExpressionAttributeValues: {
          ":userId": userId
      }
    };

    //Query the Todos Records From the dynamoDb.
    //Please note that query is used because the a Global index
    //is applied to the Todos Table.
    const result = await this.docClient.query(params).promise();
    const items = result.Items
    logger.info('getUserTodos', items)
    return items as TodoItem[]
  }  


  async createTodo(todo: TodoItem): Promise<TodoItem> {
    
    //Create a new Record and Return the Result
    await this.docClient.put({
      TableName: this.todosTable,
      Item: todo
    }).promise() 

    return todo
  }

  async deleteUserTodo(todoId: string, userId: string) {

    //Parameters For deleting the User Todo'S Records.
    var params = {
      TableName:this.todosTable,
      Key:{
        "userId": userId,
        "todoId": todoId  
      },
      ConditionExpression:"todoId = :todoId and userId = :userId",
      ExpressionAttributeValues: {
          ":userId": userId,
          ":todoId": todoId          
      }
    };

    await this.docClient.delete(params).promise();

  }

  async attachTodoUrl(uploadUrl: string, todoId: string) {

    //PLease Note: Very Important
    //When the lambda attachTodoUrl function is triggered. Because it
    //is the SNS Topic that triggers it. We are missing the UserId. 
    //Therfore we need to some special handling for retrieving
    //the Userid. To retrieve we used the Unique Todoid to retrieve
    //the userId.
    var paramsUser = {
      TableName: this.todosTable,
      ProjectionExpression: "userId",
      ConditionExpression:  "todoId = :todoId",        
      ExpressionAttributeValues: {
          ":todoId": todoId
      }
    };

    const result = await this.docClient.scan(paramsUser).promise();
    const items = result.Items; 

    const params = {
      TableName: this.todosTable,
      Key:{
        "userId": items,
        "todoId": todoId  
      },
      ConditionExpression:"todoId = :todoId and userId = :userId",
      UpdateExpression: "set attachmentUrl = :r",     
      ExpressionAttributeValues:{
          ":todoId":todoId,
          ":userId":items,
          ":r":uploadUrl
      },
    };

    await this.docClient.update(params).promise();
 
  }


  getUploadUrl(todoId: string): string {

    //This part generates the presigned URL for the S3 Bucket.
    const s3 = new AWS.S3({
      region: this.region,
      params: {Bucket: this.bucketName}
    });    

    var params = {Bucket: this.bucketName, Key: todoId, Expires: parseInt(this.expires)};

    logger.info('UrlUpload Param', params)
    
    return s3.getSignedUrl('putObject', params)
 
  }


  async updateUserTodo(todo: TodoUpdate, todoId: string, userId: string) {

    // Parameters setting for Updating User's Todo Item.
    const params = {
      TableName: this.todosTable,
      Key:{
          "userId": userId,
          "todoId": todoId
      },
      ConditionExpression:"todoId = :todoId and userId = :userId",
      UpdateExpression: "set #name = :r, dueDate=:p, done=:a",
      ExpressionAttributeNames:{
        "#name": "name"
      },       
      ExpressionAttributeValues:{
          ":todoId":todoId,
          ":userId":userId,
          ":r":todo.name,
          ":p":todo.dueDate,
          ":a":todo.done
      },
    };


    await this.docClient.update(params).promise();
  }

  async processTodoImage(key: string) {

    logger.info('Processing S3 item with key: ', {key})

    //This retrieve the image from the S3 bucket.
    const s3 = new AWS.S3({
      region: this.region,
      params: {Bucket: this.bucketName}
    });  
  
    //The image retrieve is a image Buffer.
    const response = await s3
      .getObject({
        Bucket: this.bucketName,
        Key: key
      })
      .promise()  
  
      const body: any = response.Body
      const image = await Jimp.read(body)
    
      logger.info('Buffer',{imageBuffer: image})
    
      image.resize(150, Jimp.AUTO)
      const convertedBuffer = await image.getBufferAsync(Jimp.MIME_JPEG)
    
      logger.info('Writing image back to S3 bucket', {bucket: this.attachmentBucketName})
      await s3
        .putObject({
          Bucket: this.attachmentBucketName,
          Key: `${key}.jpeg`,
          Body: convertedBuffer
        })
        .promise()
  
  }
  }

function createDynamoDBClient() {
  return new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'})
}