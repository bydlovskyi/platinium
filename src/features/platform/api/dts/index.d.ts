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

/** Role granted to an authenticated user. */
type TUserRole = TApiComponents['schemas']['UserRole']

/** An authenticated administrator or viewer of the portal. */
type TUser = TApiComponents['schemas']['User']

/** Body of `POST /auth/login`. */
type TLoginRequest = TApiComponents['schemas']['LoginRequest']

/** Body returned by a successful `POST /auth/login`. */
type TLoginResponse = TApiComponents['schemas']['LoginResponse']

/** An event administrators create tickets against. */
type TEvent = TApiComponents['schemas']['Event']

/** The writable subset of an Event, shared by create and update. */
type TEventPayload = TApiComponents['schemas']['EventPayload']

/** Body returned by `GET /events`. */
type TEventListResponse = TApiComponents['schemas']['EventListResponse']

/** The shared error envelope extended with the blocking dependent entity's type and count. */
type TDependencyConflict = TApiComponents['schemas']['DependencyConflict']

/** A ticket category (e.g. General Admission, VIP), shared across events. */
type TCategory = TApiComponents['schemas']['Category']

/** The writable subset of a Category, shared by create and update. */
type TCategoryPayload = TApiComponents['schemas']['CategoryPayload']

/** Body returned by `GET /categories`. */
type TCategoryListResponse = TApiComponents['schemas']['CategoryListResponse']

/** A ticket offered for a given event and category. */
type TTicket = TApiComponents['schemas']['Ticket']

/** The writable subset of a Ticket, shared by create and update. */
type TTicketPayload = TApiComponents['schemas']['TicketPayload']

/** Body returned by `GET /tickets`. */
type TTicketListResponse = TApiComponents['schemas']['TicketListResponse']
