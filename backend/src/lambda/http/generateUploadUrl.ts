import 'source-map-support/register'
import { createLogger } from '../../utils/logger'
import { APIGatewayProxyEvent, APIGatewayProxyResult, APIGatewayProxyHandler } from 'aws-lambda'
import { getUploadUrl } from '../../businessLogic/todo'

const logger = createLogger('Generate UPload Url')

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {

  logger.info('Event Processing', {event: event.body})
  
  //Get the TodoId From the Query String
  const todoId = event.pathParameters.todoId

  // Return a presigned URL to upload a file for a TODO item with the provided id
  const url: string = getUploadUrl(todoId)

  logger.info('getUploadUrl', {url})
  
  // Return the presigned URL Result back to the Client
  return {
    statusCode: 201,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },    
    body: JSON.stringify({
      uploadUrl: url
    })
  }
}
