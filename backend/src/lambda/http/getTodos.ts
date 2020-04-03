import 'source-map-support/register'

import { APIGatewayProxyEvent, APIGatewayProxyResult, APIGatewayProxyHandler } from 'aws-lambda'
import { getUserTodos } from '../../businessLogic/todo';
import { createLogger } from '../../utils/logger'
import { TodoItem } from '../../models/TodoItem';

const logger = createLogger('getTodo')

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {

  logger.info('Event Processing', {event: event.body})

  //Extract JWT Token From the Authoriztion Header
  const authorization = event.headers.Authorization
  const split = authorization.split(' ')
  const jwtToken = split[1] 
  
  //Get the User's Todo Item and Return the Result     
  //const items: TodoItem[] = await getUserTodos(jwtToken) 
  const userTodoItems: TodoItem[] = await getUserTodos(jwtToken) 




  //const itemsEmpty: TodoItem[] = [] 
  let items = JSON.parse(JSON.stringify(userTodoItems))

  logger.info('User Todo items', items)


 // Return the all the User's Item Result back to the Client
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: JSON.stringify({
     items
    })
  }

}
