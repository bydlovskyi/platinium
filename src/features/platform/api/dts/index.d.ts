type TApiComponents = import('../schema').components

type THealth = TResponse<'/health', 'get'>

type TPaginationMeta = TApiComponents['schemas']['PaginationMeta']

type TErrorResponse = TApiComponents['schemas']['ErrorResponse']

type TValidationError = TApiComponents['schemas']['ValidationError']

type TEventStatus = TApiComponents['schemas']['EventStatus']

type TTicketStatus = TApiComponents['schemas']['TicketStatus']

type TCurrency = TApiComponents['schemas']['Currency']

type TSortOrder = TApiComponents['schemas']['SortOrder']

type TUserRole = TApiComponents['schemas']['UserRole']

type TUser = TApiComponents['schemas']['User']

type TLoginRequest = TApiComponents['schemas']['LoginRequest']

type TLoginResponse = TApiComponents['schemas']['LoginResponse']

type TEvent = TApiComponents['schemas']['Event']

type TEventPayload = TApiComponents['schemas']['EventPayload']

type TEventListResponse = TApiComponents['schemas']['EventListResponse']

type TDependencyConflict = TApiComponents['schemas']['DependencyConflict']

type TCategory = TApiComponents['schemas']['Category']

type TCategoryPayload = TApiComponents['schemas']['CategoryPayload']

type TCategoryListResponse = TApiComponents['schemas']['CategoryListResponse']

type TTicket = TApiComponents['schemas']['Ticket']

type TTicketPayload = TApiComponents['schemas']['TicketPayload']

type TTicketListResponse = TApiComponents['schemas']['TicketListResponse']

type TDashboardStats = TApiComponents['schemas']['DashboardStats']

/** Minor units; never summed across currencies. */
type TCurrencyTotal = TApiComponents['schemas']['CurrencyTotal']

type TStatusBreakdown = TApiComponents['schemas']['StatusBreakdown']

type TBulkOperation = TApiComponents['schemas']['BulkOperation']

type TBulkRequest = TApiComponents['schemas']['BulkRequest']

type TBulkFailure = TApiComponents['schemas']['BulkFailure']

type TBulkResult = TApiComponents['schemas']['BulkResult']

type TListFormat = TApiComponents['schemas']['ListFormat']
