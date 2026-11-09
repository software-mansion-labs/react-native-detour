/** The message of a Detour API error body (`{ error, code }`), or a generic one for any other body. */
export const readApiError = async (response: Response): Promise<string> => {
  try {
    const body = await response.json();
    if (body?.error) {
      const message = typeof body.error === "string" ? body.error : JSON.stringify(body.error);
      return typeof body.code === "string" ? `${message} (${body.code})` : message;
    }
  } catch {
    // A body that is not JSON, e.g. an HTML error page.
  }
  return "Request failed";
};
