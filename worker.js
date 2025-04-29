// task-app Cloudflare Worker
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  const path = url.pathname
  
  // Serve based on path
  if (path === '/' || path === '/index.html') {
    return await serveAsset('index.html', 'text/html')
  } else if (path.startsWith('/css/')) {
    const cssFile = path.split('/').pop()
    return await serveAsset(`css/${cssFile}`, 'text/css')
  } else if (path.startsWith('/js/')) {
    const jsFile = path.split('/').pop()
    return await serveAsset(`js/${jsFile}`, 'application/javascript')
  } else {
    // Default to index for any other paths
    return await serveAsset('index.html', 'text/html')
  }
}

// Function to serve assets from the public directory
async function serveAsset(path, contentType) {
  try {
    // For Cloudflare Workers Sites, assets are automatically included
    // in the deployment and available through the global namespace
    // This is the recommended approach by Cloudflare
    
    // Return placeholder response for now
    return new Response(`Now serving: ${path}`, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'max-age=3600'
      }
    })
  } catch (error) {
    return new Response(`Error serving asset: ${error.message}`, { status: 500 })
  }
}
