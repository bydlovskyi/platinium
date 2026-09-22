class HomeService {
  getHealth () {
    return apiClient.get('/health')
  }
}

export const homeService = new HomeService()
