import Axios from 'axios';

const ROOT = 'http://localhost:7024';

/**
 * e.g. Post('/join');
 */
export const Post = async <T>(url: string, body: object) => {
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
