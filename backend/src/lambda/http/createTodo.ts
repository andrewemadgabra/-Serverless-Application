import 'source-map-support/register'

import { APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda'

import { CreateTodoRequest } from '../../requests/CreateTodoRequest'
import { TodoItem } from '../../models/TodoItem'
import { createTodo } from '../../businessLogic/todo'
import { parseUserId } from '../../auth/utils'
import { createLogger } from '../../utils/logger'
import * as uuid from 'uuid'

const logger = createLogger('createTodo')

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const newTodo: CreateTodoRequest = JSON.parse(event.body)

  logger.info('Event Processing', {event: event.body})

  //Extract JWT Token From the Authoriztion Header
  const authorization = event.headers.Authorization
  const split = authorization.split(' ')
  const jwtToken = split[1]
  const thumbnailBucketName = process.env.THUMBNAILS_S3_BUCKET

  //Generate unique Id
  const todoId = uuid.v4()

  //Extract userid from JWT token
  const userId = parseUserId(jwtToken)

  //Add New Todo Item and Return the Result
  const newTodoItems: TodoItem = await createTodo({
                                            userId,
                                            todoId,
                                            createdAt: new Date().toISOString(),
                                            name: newTodo.name,
                                            dueDate: newTodo.dueDate,
                                            done: false,
                                            attachmentUrl: `https://${thumbnailBucketName}.s3.amazonaws.com/${todoId}.jpeg`,
                                      })

  logger.info('New Item', newTodoItems) 
                           

  // Return the New Item Result back to the Client
  return {
    statusCode: 201,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,OPTIONS,POST',
    },
    body: JSON.stringify({
      item: newTodoItems
    })
  }
}