type TApiPaths = import('../schema').paths

type TPathKeys = keyof TApiPaths

type TPathMethods<Path extends TPathKeys> = keyof TApiPaths[Path]

// Create endpoints answer 201 rather than 200; without this their response type resolves to `unknown`.
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
