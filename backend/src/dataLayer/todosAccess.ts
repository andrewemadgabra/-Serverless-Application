import * as AWS  from 'aws-sdk'
import { DocumentClient } from 'aws-sdk/clients/dynamodb'
var AWSXRay = require('aws-xray-sdk');
const XAWS = AWSXRay.captureAWS(AWS)
import { TodoItem } from '../models/TodoItem'
import { TodoUpdate } from '../models/TodoUpdate'
import { createLogger } from '../utils/logger'

const logger = createLogger('Todo DataAcess')
//import Jimp from 'jimp';
const Jimp = require('jimp')

export class TodoAccess {

  constructor(
    private readonly docClient: DocumentClient = createDynamoDBClient(),
    private readonly userTodosTable = process.env.USERS_TODO_TABLE,
    private readonly todosTable = process.env.TODOS_TABLE,
    private readonly bucketName = process.env.TODOS_S3_BUCKET,
    private readonly expires = process.env.SIGNED_URL_EXPIRATION,        
    private readonly thumbnailBucketName = process.env.THUMBNAILS_S3_BUCKET,
    private readonly region = process.env.BUCKET_REGION
  ) {}

  async getUserTodos(userId: string): Promise<TodoItem[]> {

    var params = {
      TableName: this.userTodosTable,
      ProjectionExpression: "todoId, createdAt, #name, dueDate, done, attachmentUrl",
      FilterExpression:  "userId = :userId",
      ExpressionAttributeNames:{
        "#name": "name"
      },        
      ExpressionAttributeValues: {
          ":userId": userId
      }
    };

    const result = await this.docClient.scan(params).promise();
    const items = result.Items
    logger.info('getUserTodos', items)
    return items as TodoItem[]
  }  


  async createTodo(todo: TodoItem, newUser: any): Promise<TodoItem> {
    
    await this.docClient.put({
      TableName: this.todosTable,
      Item: todo
    }).promise()

    const newUserTodoItem = {
      userId: newUser.userId,
      todoId: todo.todoId,      
      createdAt: todo.createdAt,
      name: todo.name,
      dueDate: todo.dueDate,
      done: todo.done,
      attachmentUrl: todo.attachmentUrl
    }    

    await this.docClient.put({
      TableName: this.userTodosTable,
      Item: newUserTodoItem
    }).promise()    

    return todo
  }

  async deleteUserTodo(todoId: string, userId: string) {

    var params = {
      TableName:this.userTodosTable,
      Key:{
          "todoId": todoId         
      },      
      ConditionExpression:"todoId = :todoId and userId = :userId",
      ExpressionAttributeValues: {
          ":todoId": todoId,
          ":userId": userId
      }
    };

    await this.docClient.delete(params).promise();


    var params2 = {
      TableName:this.todosTable,
      Key:{
          "todoId": todoId  
      },
      ConditionExpression:"todoId = :todoId",
      ExpressionAttributeValues: {
          ":todoId": todoId
      }
    };

    await this.docClient.delete(params2).promise();

  }

  async attachTodoUrl(uploadUrl: string, todoId: string) {

    const params = {
      TableName: this.todosTable,
      Key:{
          "todoId": todoId
      },
      ConditionExpression:"todoId = :todoId",
      UpdateExpression: "set attachmentUrl = :r",     
      ExpressionAttributeValues:{
          ":todoId":todoId,
          ":r":uploadUrl
      },
    };

    await this.docClient.update(params).promise();

    const params2 = {
      TableName: this.userTodosTable,
      Key:{
        "todoId": todoId
       },      
      ConditionExpression:"todoId = :todoId",
      UpdateExpression: "set attachmentUrl = :r",     
      ExpressionAttributeValues:{
          ":todoId":todoId,
          ":r":uploadUrl
      },
    };

    await this.docClient.update(params2).promise();  
  }


  getUploadUrl(todoId: string): string {

    const s3 = new XAWS.S3({
      signatureVersion: 'v4',
      region: this.region,
      params: {Bucket: this.bucketName}
    });    

    var params = {Bucket: this.bucketName, Key: todoId, Expires: parseInt(this.expires)};

    logger.info('UrlUpload Param', params)
    
    return s3.getSignedUrl('putObject', params)
 
  }


  async updateUserTodo(todo: TodoUpdate, todoId: string, userId: string) {

    const params = {
      TableName: this.userTodosTable,
      Key:{
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



    const params2 = {
      TableName: this.todosTable,
      Key:{
          "todoId": todoId
      },
      ConditionExpression:"todoId = :todoId",
      UpdateExpression: "set #name = :r, dueDate=:p, done=:a",
      ExpressionAttributeNames:{
        "#name": "name"
      },       
      ExpressionAttributeValues:{
          ":todoId":todoId,
          ":r":todo.name,
          ":p":todo.dueDate,
          ":a":todo.done
      },
    };


    await this.docClient.update(params2).promise();
  }

  async processTodoImage(key: string) {

    console.log('Processing S3 item with key: ', key)
    const s3 = new XAWS.S3({
      signatureVersion: 'v4',
      region: this.region,
      params: {Bucket: this.bucketName}
    });  
  
    const response = await s3
      .getObject({
        Bucket: this.bucketName,
        Key: key
      })
      .promise()  
  
    const body = response.Body
    const image = await Jimp.read(body)
  
    logger.info('Buffer',image)
  
    image.resize(150, Jimp.AUTO)
    const convertedBuffer = await image.getBufferAsync(Jimp.MIME_JPEG)
  
    logger.info('Writing image back to S3 bucket', this.thumbnailBucketName)
    await s3
      .putObject({
        Bucket: this.thumbnailBucketName,
        Key: `${key}.jpeg`,
        Body: convertedBuffer
      })
      .promise()
  
  }
  }

function createDynamoDBClient() {
  if (process.env.IS_OFFLINE === "True") {    
    return new XAWS.DynamoDB.DocumentClient({
      region: 'localhost',
      endpoint: 'http://localhost:8000'
    })
  }

  return new XAWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'})
}