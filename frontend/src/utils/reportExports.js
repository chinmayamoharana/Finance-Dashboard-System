import apiClient from '../api/client'

export async function fetchAllRecords(params = {}) {
  const sharedParams = {
    ...params,
    page_size: 100,
  }

  const firstResponse = await apiClient.get('/records/', {
    params: {
      ...sharedParams,
      page: 1,
    },
  })

  const allRecords = [...firstResponse.data.results]
  const totalPages = firstResponse.data.total_pages || 1

  for (let page = 2; page <= totalPages; page += 1) {
    const response = await apiClient.get('/records/', {
      params: {
        ...sharedParams,
        page,
      },
    })
    allRecords.push(...response.data.results)
  }

  return allRecords
}

export async function fetchAllUsers(params = {}) {
  const response = await apiClient.get('/users/', {
    params,
  })
  return response.data
}

export function shareTextToWhatsApp(message) {
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
  window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
}
