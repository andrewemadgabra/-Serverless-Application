import 'source-map-support/register'

import { APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda'

import { CreateTodoRequest } from '../../requests/CreateTodoRequest'
import { TodoItem } from '../../models/TodoItem'
import { createTodo } from '../../businessLogic/todo'
import { parseUserId } from '../../auth/utils'
//import { createLogger } from '../../utils/logger'
import * as uuid from 'uuid'

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const newTodo: CreateTodoRequest = JSON.parse(event.body)

  const authorization = event.headers.Authorization
  const split = authorization.split(' ')
  const jwtToken = split[1]

  const todoId = uuid.v4()

  const userId = parseUserId(jwtToken)

  const newItem: TodoItem = await createTodo({
                                            userId,
                                            todoId,
                                            createdAt: new Date().toISOString(),
                                            name: newTodo.name,
                                            dueDate: newTodo.dueDate,
                                            done: false,
                                            attachmentUrl: null
                                          }, jwtToken)

  // TODO: Implement creating a new TODO item
  return {
    statusCode: 201,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true
    },
    body: JSON.stringify({
      item: newItem
    })
  }
}
