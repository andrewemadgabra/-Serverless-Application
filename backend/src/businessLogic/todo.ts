import { TodoItem } from '../models/TodoItem'
import { TodoAccess } from '../dataLayer/todosAccess'
import { parseUserId } from '../auth/utils'
import { TodoUpdate } from '../models/TodoUpdate'

const todoAccess = new TodoAccess()

export async function getUserTodos(jwtToken): Promise<TodoItem[]> {
  const userId = parseUserId(jwtToken)
  return await todoAccess.getUserTodos(userId)
}

export async function deleteUserTodos(todoId, jwtToken) {
  const userId = parseUserId(jwtToken)
  await todoAccess.deleteUserTodo(todoId, userId)
}

export async function attachTodoUrl(uploadUrl, todoId) {  
  await todoAccess.attachTodoUrl(uploadUrl, todoId)
}

export async function processImage(Key) {  
  await todoAccess.processTodoImage(Key)
}

export async function createTodo(
  todo: TodoItem,
  jwtToken: string
): Promise<TodoItem> {
  
  const userId = parseUserId(jwtToken)

  return await todoAccess.createTodo(todo, {userId: userId})
}


export async function updateUserTodo(
  todo: TodoUpdate,    
  todoId: string,
  jwtToken: string,
){
  
  const userId = parseUserId(jwtToken)

  await todoAccess.updateUserTodo(todo,todoId,userId)
}

export function getUploadUrl(todoId: string): string {

  return todoAccess.getUploadUrl(todoId)

}