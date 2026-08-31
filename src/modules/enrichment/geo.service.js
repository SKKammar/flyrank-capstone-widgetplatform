/**
 * Geo Enrichment Service
 * Multi-provider fallback with strict 3000ms timeout per provider.
 * Provider A: http://ip-api.com/json/${ip}
 * Provider B: https://ipapi.co/${ip}/json/
 * Graceful fallback to null if both fail or timeout.
 */

function fetchWithTimeout(url, timeoutMs = 3000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'FlyRank-WidgetPlatform/1.0' } })
    .then((res) => {
      clearTimeout(timeoutId);
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }
      return res.json();
    })
    .catch((err) => {
      clearTimeout(timeoutId);
      throw err;
    });
}

function isPrivateOrLocalIp(ip) {
  if (!ip) return true;
  const cleanIp = ip.replace(/^::ffff:/, '');
  return (
    cleanIp === '127.0.0.1' ||
    cleanIp === '::1' ||
    cleanIp === 'localhost' ||
    cleanIp.startsWith('10.') ||
    cleanIp.startsWith('192.168.') ||
    cleanIp.startsWith('172.16.') ||
    cleanIp.startsWith('172.17.') ||
    cleanIp.startsWith('172.18.') ||
    cleanIp.startsWith('172.19.') ||
    cleanIp.startsWith('172.2') ||
    cleanIp.startsWith('172.30.') ||
    cleanIp.startsWith('172.31.')
  );
}

async function getGeoData(ip) {
  if (!ip) return null;

  const cleanIp = ip.replace(/^::ffff:/, '').trim();

  // If local / private IP and no mock IP provided, return null or fallback gracefully
  if (isPrivateOrLocalIp(cleanIp)) {
    return null;
  }

  // Try Provider A: ip-api.com
  try {
    const urlA = `http://ip-api.com/json/${cleanIp}`;
    const dataA = await fetchWithTimeout(urlA, 3000);
    if (dataA && dataA.status === 'success') {
      return {
        country: dataA.country || null,
        city: dataA.city || null,
        region: dataA.regionName || dataA.region || null
      };
    }
  } catch (err) {
    // Provider A failed or timed out, swallow and proceed to Provider B
  }

  // Try Provider B: ipapi.co
  try {
    const urlB = `https://ipapi.co/${cleanIp}/json/`;
    const dataB = await fetchWithTimeout(urlB, 3000);
    if (dataB && !dataB.error) {
      return {
        country: dataB.country_name || dataB.country || null,
        city: dataB.city || null,
        region: dataB.region || null
      };
    }
  } catch (err) {
    // Provider B failed or timed out, swallow
  }

  // Both providers failed or returned errors
  return null;
}

module.exports = {
  getGeoData,
  isPrivateOrLocalIp
};
