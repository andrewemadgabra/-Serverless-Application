import 'source-map-support/register'
import { createLogger } from '../../utils/logger'
import { APIGatewayProxyEvent, APIGatewayProxyResult, APIGatewayProxyHandler } from 'aws-lambda'
import { getUploadUrl } from '../../businessLogic/todo'

const logger = createLogger('Generate UPload Url')

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {

  logger.info('Event Processing', {event: event.body})
  
  const todoId = event.pathParameters.todoId

  // TODO: Return a presigned URL to upload a file for a TODO item with the provided id
  const url: string = getUploadUrl(todoId)

  logger.info('getUploadUrl', url)
  
  return {
    statusCode: 201,
    headers: {
      'Access-Control-Allow-Origin': '*'
    },    
    body: JSON.stringify({
      uploadUrl: url
    })
  }
}
