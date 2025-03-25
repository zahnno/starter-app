import Cookies from "universal-cookie";
import { SERVER_URI } from "./constants.js";

export const getToken = () => {
  try {
    const cookies = new Cookies();
    const token = cookies.get('token');
    return token || null;
  } catch (error) {
    console.error("Error retrieving token:", error.message);
    return null;
  }
}

export const authFetch = async ({ path, method = 'GET', body, requireAuth = true }) => {
  const url = `${SERVER_URI}${path}`;
  const cookie = getToken();
  
  let headers = {};
  
  // Add Authorization header if token exists
  if (cookie) {
    headers['Authorization'] = `Bearer ${cookie}`;
  } else if (requireAuth) {
    throw new Error('Authentication required');
  }

  if ((method === 'POST' || method === 'PUT') && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, {
      method: method,
      body: body,
      headers: headers
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData?.message || "Unknown Error Occurred");
    }

    return await response.json();

  } catch (error) {
    if (error.message.includes('413')) {
      console.error('Payload too large');
    } else {
      console.error('Fetch error:', error);
    }
    throw error;
  }
};

export const catchError = async (promise) => {
  try {
    const data = await promise;
    return [null, data];
  } catch (error) {
    return [error, null];
  }
};
