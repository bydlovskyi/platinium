type TApiComponents = import('../schema').components

/** Response body of `GET /health` — proves generation and typing work end to end. */
type THealth = TResponse<'/health', 'get'>

/** Shared pagination envelope metadata attached to every list response's `meta`. */
type TPaginationMeta = TApiComponents['schemas']['PaginationMeta']

/** Shared error envelope returned by every failed request. */
type TErrorResponse = TApiComponents['schemas']['ErrorResponse']

/** Per-field validation message map, as carried on `TErrorResponse['errors']`. */
type TValidationError = TApiComponents['schemas']['ValidationError']

/** Lifecycle status of an Event. */
type TEventStatus = TApiComponents['schemas']['EventStatus']

/** Lifecycle status of a Ticket. */
type TTicketStatus = TApiComponents['schemas']['TicketStatus']

/** Supported ticket currency codes. */
type TCurrency = TApiComponents['schemas']['Currency']

/** Sort direction shared by every list endpoint's `order` parameter. */
type TSortOrder = TApiComponents['schemas']['SortOrder']
