export interface PaginationParams {
  page: number
  pageSize: number
}

export interface PagedResult<T> {
  data: T[]
  total: number
}
