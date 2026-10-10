// Options every server-side helper call shares. The smoke script points the endpoint at its mock API.
export const serverOptions = {
  environmentToken: process.env.ZENMANAGE_ENVIRONMENT_TOKEN,
  apiEndpoint: process.env.ZENMANAGE_API_ENDPOINT,
};
