import Axios from 'axios';

const ROOT = '';

let lastSent: { url: string; body: object } = undefined;

/**
 * e.g. Post('/join');
 */
export const Post = async <T>(url: string, body: object) => {
  /**
   * KLUDGE: Some UI elements respond to double taps.
   * It should be fixed and prevented, but for now this is easiest.
   * As of writing (May 2020), there exists no valid reason to send the exact same command twice in a row.
   */
  if (matchLastSent(url, body)) {
    // Probably a double send, ignore.
    return;
  }

  lastSent = { url, body };

  console.log(`[Post] '${url}' with body: ${JSON.stringify(body)}`);
  try {
    const result = await Axios.post(`${ROOT}${url}`, body);
    return result.data as T;
  } catch (error) {
    if (error.response?.data) {
      throw new Error(error.response.data);
    }
    throw new Error(error);
  }
};

const matchLastSent = (url: string, body: object): boolean => {
  if (!lastSent) {
    return false;
  }
  return url === lastSent.url && JSON.stringify(body) === JSON.stringify(lastSent.body);
};
