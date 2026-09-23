type TApiPaths = import('../schema').paths

type TPathKeys = keyof TApiPaths

type TPathMethods<Path extends TPathKeys> = keyof TApiPaths[Path]

/**
 * Success response status for a path+method. Most of the contract answers
 * `200`; `POST /events` (and any future create endpoint) answers `201`
 * instead — openapi-typescript keys `responses` by the numeric status
 * literal, so `Method`'s own `responses` map is checked for whichever of the
 * two it actually declares rather than hardcoding `200`, so a create
 * endpoint's response type doesn't resolve to `unknown`.
 */
type TSuccessStatus<Path extends TPathKeys, Method extends TPathMethods<Path>> =
  200 extends keyof TApiPaths[Path][Method]['responses']
    ? 200
    : 201 extends keyof TApiPaths[Path][Method]['responses']
      ? 201
      : never

type TResponse<Path extends TPathKeys, Method extends TPathMethods<Path>> =
  TApiPaths[Path][Method]['responses'][TSuccessStatus<Path, Method>]['content']['application/json']

type TRequestParameters<Path extends TPathKeys, Method extends TPathMethods<Path>> = TApiPaths[Path][Method]['parameters']['path']

type TRequestQuery<Path extends TPathKeys, Method extends TPathMethods<Path>> = TApiPaths[Path][Method]['parameters']['query']

type TRequestBody<Path extends TPathKeys, Method extends TPathMethods<Path>> = Required<TApiPaths[Path][Method]>['requestBody']['content']['application/json']
