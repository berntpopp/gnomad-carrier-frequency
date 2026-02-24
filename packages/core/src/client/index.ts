import { getApiEndpoint } from '../config/index.js'
import type { GnomadVersion } from '../config/index.js'

export interface GraphQLRequest {
  query: string
  variables?: Record<string, unknown>
}

export interface GraphQLResponse<T> {
  data?: T
  errors?: Array<{ message: string }>
}

export async function executeGraphQLQuery<T>(
  request: GraphQLRequest,
  version?: GnomadVersion
): Promise<GraphQLResponse<T>> {
  const endpoint = getApiEndpoint(version)
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.status}`)
  }
  return response.json() as Promise<GraphQLResponse<T>>
}
