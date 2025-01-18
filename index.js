addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const country = url.pathname.split('/')[2];

  const identity = await getIdentity(request);

  if (country) {
    return serveCountryFlag(country, identity);
  } else {
    return serveSecurePage(identity);
  }
}

async function getIdentity(request) {
  const email = request.headers.get('CF-Access-Authenticated-User-Email');
  const timestamp = new Date().toISOString();
  const country = request.headers.get('CF-IPCountry');

  return {
    email,
    timestamp,
    country
  };
}

function serveSecurePage(identity) {
  const { email, timestamp, country } = identity;
  const countryUrl = `/secure/${country}`;

  return new Response(`
    <html>
      <body>
        <h1>Secure Page</h1>
        <p>Email: ${email}</p>
        <p>Authenticated at: ${timestamp}</p>
        <p>Country: <a href="${countryUrl}">${country}</a></p>
      </body>
    </html>
  `, {
    headers: { 'Content-Type': 'text/html' }
  });
}

async function serveCountryFlag(country, identity) {
  try {
    const flagImage = await fetchFlagFromBucket(country);
    if (flagImage) {
      return new Response(flagImage.body, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    } else {
      return new Response('Flag not found', { status: 404 });
    }
  } catch (error) {
    return new Response("Error fetching flag image", { status: 500 });
  }
}

// Fetch the flag from the R2 bucket using .get() method
async function fetchFlagFromBucket(country) {
  const objectKey = `${country}.png`;

  try {
    // Get the file object from the R2 bucket
    const object = await R2_BUCKET.get(objectKey);

    // If the object exists, return the body of the file
    if (object) {
      return object;
    }

    return null;
  } catch (error) {
    console.error('Error fetching flag from R2 bucket:', error);
    throw error;
  }
}
