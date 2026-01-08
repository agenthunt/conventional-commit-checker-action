const axios = require('axios');

/**
 * Extracts the first Jira ticket ID from a PR title
 * Matches patterns like: CY-12345, INF-6018, RG-999
 * Handles formats: "CY-12345", "[CY-12345]", "CY-12345:", etc.
 *
 * @param {string} title - The PR title
 * @returns {string|null} - The ticket ID or null if not found
 */
function extractJiraTicketId(title) {
  if (!title) {
    return null;
  }

  // Pattern matches: (CY|INF|RG)-\d+
  const pattern = /(CY|INF|RG)-\d+/;
  const match = title.match(pattern);
  return match ? match[0] : null;
}

/**
 * Validates if Jira credentials are provided
 *
 * @param {object} config - Jira configuration
 * @returns {boolean} - True if all credentials are provided
 */
function hasJiraCredentials(config) {
  return !!(config.baseUrl && config.email && config.apiToken);
}

/**
 * Checks if a Jira ticket exists
 *
 * @param {string} ticketId - The Jira ticket ID (e.g., "CY-12345")
 * @param {object} config - Jira configuration {baseUrl, email, apiToken}
 * @returns {Promise<object>} - Result object with status and message
 */
async function validateJiraTicket(ticketId, config) {
  if (!hasJiraCredentials(config)) {
    return {
      status: 'skipped',
      message: 'Jira validation skipped: credentials not provided'
    };
  }

  if (!ticketId) {
    return {
      status: 'failure',
      message: 'No Jira ticket ID found in PR title. Expected format: (CY|INF|RG)-NUMBER'
    };
  }

  const auth = Buffer.from(`${config.email}:${config.apiToken}`).toString('base64');
  const url = `${config.baseUrl}/rest/api/3/issue/${ticketId}`;

  try {
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      },
      // Only fetch minimal fields to reduce response size
      params: {
        fields: 'key,summary'
      },
      timeout: 10000 // 10 second timeout
    });

    return {
      status: 'success',
      message: `Jira ticket ${ticketId} validated successfully: ${response.data.fields.summary}`
    };
  } catch (error) {
    if (error.response) {
      // HTTP error response from Jira
      switch (error.response.status) {
        case 404:
          return {
            status: 'failure',
            message: `Jira ticket ${ticketId} does not exist. Please verify the ticket ID in your PR title.`
          };
        case 401:
          return {
            status: 'failure',
            message: `Jira authentication failed. Please verify jira-email and jira-api-token are correct.`
          };
        case 403:
          return {
            status: 'failure',
            message: `Jira access forbidden. The provided credentials do not have permission to access ticket ${ticketId}.`
          };
        default:
          return {
            status: 'failure',
            message: `Jira API error (${error.response.status}): ${error.response.data?.errorMessages?.join(', ') || error.message}`
          };
      }
    } else if (error.request) {
      // Network error - no response received
      return {
        status: 'failure',
        message: `Network error connecting to Jira: ${error.message}. Please verify jira-base-url is correct.`
      };
    } else {
      // Other error
      return {
        status: 'failure',
        message: `Unexpected error validating Jira ticket: ${error.message}`
      };
    }
  }
}

module.exports = {
  extractJiraTicketId,
  hasJiraCredentials,
  validateJiraTicket
};
