const { extractJiraTicketId, hasJiraCredentials, validateJiraTicket } = require('./jira');
const axios = require('axios');

// Mock axios
jest.mock('axios');

describe('jira.js', () => {
  describe('extractJiraTicketId', () => {
    it('should extract CY ticket ID from title', () => {
      const result = extractJiraTicketId('feat(backend):CY-12345 Add feature');
      expect(result).toBe('CY-12345');
    });

    it('should extract INF ticket ID from title', () => {
      const result = extractJiraTicketId('fix(frontend):INF-6018 Fix bug');
      expect(result).toBe('INF-6018');
    });

    it('should extract RG ticket ID from title', () => {
      const result = extractJiraTicketId('chore(infra):RG-999 Update deps');
      expect(result).toBe('RG-999');
    });

    it('should extract ticket ID with brackets', () => {
      const result = extractJiraTicketId('feat: [CY-54321] New feature');
      expect(result).toBe('CY-54321');
    });

    it('should extract ticket ID with colon', () => {
      const result = extractJiraTicketId('feat: CY-11111: Add endpoint');
      expect(result).toBe('CY-11111');
    });

    it('should extract first ticket ID when multiple present', () => {
      const result = extractJiraTicketId('feat:CY-111 Fix for INF-222');
      expect(result).toBe('CY-111');
    });

    it('should return null when no ticket ID present', () => {
      const result = extractJiraTicketId('feat: no ticket here');
      expect(result).toBeNull();
    });

    it('should return null for empty title', () => {
      const result = extractJiraTicketId('');
      expect(result).toBeNull();
    });

    it('should return null for null title', () => {
      const result = extractJiraTicketId(null);
      expect(result).toBeNull();
    });

    it('should return null for undefined title', () => {
      const result = extractJiraTicketId(undefined);
      expect(result).toBeNull();
    });

    it('should handle ticket ID at the beginning', () => {
      const result = extractJiraTicketId('CY-99999 feat: Add feature');
      expect(result).toBe('CY-99999');
    });

    it('should handle ticket ID at the end', () => {
      const result = extractJiraTicketId('feat: Add feature CY-88888');
      expect(result).toBe('CY-88888');
    });

    it('should not match invalid prefixes', () => {
      const result = extractJiraTicketId('feat: INVALID-12345 Add feature');
      expect(result).toBeNull();
    });

    it('should not match ticket without number', () => {
      const result = extractJiraTicketId('feat: CY- Add feature');
      expect(result).toBeNull();
    });

    it('should handle special characters around ticket', () => {
      const result = extractJiraTicketId('feat: (CY-12345) Add feature');
      expect(result).toBe('CY-12345');
    });
  });

  describe('hasJiraCredentials', () => {
    it('should return true when all credentials provided', () => {
      const config = {
        baseUrl: 'https://cyera.atlassian.net',
        email: 'test@cyera.io',
        apiToken: 'token123'
      };
      expect(hasJiraCredentials(config)).toBe(true);
    });

    it('should return false when baseUrl missing', () => {
      const config = {
        email: 'test@cyera.io',
        apiToken: 'token123'
      };
      expect(hasJiraCredentials(config)).toBe(false);
    });

    it('should return false when email missing', () => {
      const config = {
        baseUrl: 'https://cyera.atlassian.net',
        apiToken: 'token123'
      };
      expect(hasJiraCredentials(config)).toBe(false);
    });

    it('should return false when apiToken missing', () => {
      const config = {
        baseUrl: 'https://cyera.atlassian.net',
        email: 'test@cyera.io'
      };
      expect(hasJiraCredentials(config)).toBe(false);
    });

    it('should return false when all credentials missing', () => {
      const config = {};
      expect(hasJiraCredentials(config)).toBe(false);
    });

    it('should return false when baseUrl is empty string', () => {
      const config = {
        baseUrl: '',
        email: 'test@cyera.io',
        apiToken: 'token123'
      };
      expect(hasJiraCredentials(config)).toBe(false);
    });

    it('should return false when email is empty string', () => {
      const config = {
        baseUrl: 'https://cyera.atlassian.net',
        email: '',
        apiToken: 'token123'
      };
      expect(hasJiraCredentials(config)).toBe(false);
    });

    it('should return false when apiToken is empty string', () => {
      const config = {
        baseUrl: 'https://cyera.atlassian.net',
        email: 'test@cyera.io',
        apiToken: ''
      };
      expect(hasJiraCredentials(config)).toBe(false);
    });
  });

  describe('validateJiraTicket', () => {
    const validConfig = {
      baseUrl: 'https://cyera.atlassian.net',
      email: 'test@cyera.io',
      apiToken: 'token123'
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe('Credential Validation', () => {
      it('should return skipped status when credentials not provided', async () => {
        const result = await validateJiraTicket('CY-12345', {});

        expect(result.status).toBe('skipped');
        expect(result.message).toContain('credentials not provided');
        expect(axios.get).not.toHaveBeenCalled();
      });

      it('should return skipped when only baseUrl provided', async () => {
        const result = await validateJiraTicket('CY-12345', {
          baseUrl: 'https://cyera.atlassian.net'
        });

        expect(result.status).toBe('skipped');
        expect(axios.get).not.toHaveBeenCalled();
      });
    });

    describe('Ticket ID Validation', () => {
      it('should return failure when ticket ID is null', async () => {
        const result = await validateJiraTicket(null, validConfig);

        expect(result.status).toBe('failure');
        expect(result.message).toContain('No Jira ticket ID found');
        expect(axios.get).not.toHaveBeenCalled();
      });

      it('should return failure when ticket ID is empty string', async () => {
        const result = await validateJiraTicket('', validConfig);

        expect(result.status).toBe('failure');
        expect(result.message).toContain('No Jira ticket ID found');
        expect(axios.get).not.toHaveBeenCalled();
      });

      it('should return failure when ticket ID is undefined', async () => {
        const result = await validateJiraTicket(undefined, validConfig);

        expect(result.status).toBe('failure');
        expect(result.message).toContain('No Jira ticket ID found');
        expect(axios.get).not.toHaveBeenCalled();
      });
    });

    describe('Successful Validation', () => {
      it('should return success when ticket exists', async () => {
        axios.get.mockResolvedValue({
          data: {
            fields: {
              key: 'CY-12345',
              summary: 'Add new feature'
            }
          }
        });

        const result = await validateJiraTicket('CY-12345', validConfig);

        expect(result.status).toBe('success');
        expect(result.message).toContain('CY-12345');
        expect(result.message).toContain('validated successfully');
        expect(result.message).toContain('Add new feature');
      });

      it('should call Jira API with correct parameters', async () => {
        axios.get.mockResolvedValue({
          data: {
            fields: {
              key: 'INF-6018',
              summary: 'Test ticket'
            }
          }
        });

        await validateJiraTicket('INF-6018', validConfig);

        expect(axios.get).toHaveBeenCalledWith(
          'https://cyera.atlassian.net/rest/api/3/issue/INF-6018',
          expect.objectContaining({
            headers: expect.objectContaining({
              'Authorization': expect.stringContaining('Basic'),
              'Accept': 'application/json'
            }),
            params: {
              fields: 'key,summary'
            },
            timeout: 10000
          })
        );
      });

      it('should use Basic Auth with base64 encoded credentials', async () => {
        axios.get.mockResolvedValue({
          data: {
            fields: {
              key: 'CY-123',
              summary: 'Test'
            }
          }
        });

        await validateJiraTicket('CY-123', validConfig);

        const authHeader = axios.get.mock.calls[0][1].headers.Authorization;
        expect(authHeader).toMatch(/^Basic /);

        const base64Part = authHeader.replace('Basic ', '');
        const decoded = Buffer.from(base64Part, 'base64').toString();
        expect(decoded).toBe('test@cyera.io:token123');
      });
    });

    describe('HTTP Error Responses', () => {
      it('should return failure when ticket not found (404)', async () => {
        axios.get.mockRejectedValue({
          response: {
            status: 404,
            data: {}
          }
        });

        const result = await validateJiraTicket('CY-99999', validConfig);

        expect(result.status).toBe('failure');
        expect(result.message).toContain('does not exist');
        expect(result.message).toContain('CY-99999');
      });

      it('should return failure when authentication fails (401)', async () => {
        axios.get.mockRejectedValue({
          response: {
            status: 401,
            data: {}
          }
        });

        const result = await validateJiraTicket('CY-12345', validConfig);

        expect(result.status).toBe('failure');
        expect(result.message).toContain('authentication failed');
        expect(result.message).toContain('jira-email');
        expect(result.message).toContain('jira-api-token');
      });

      it('should return failure when access forbidden (403)', async () => {
        axios.get.mockRejectedValue({
          response: {
            status: 403,
            data: {}
          }
        });

        const result = await validateJiraTicket('CY-12345', validConfig);

        expect(result.status).toBe('failure');
        expect(result.message).toContain('forbidden');
        expect(result.message).toContain('CY-12345');
      });

      it('should handle other HTTP errors with error messages', async () => {
        axios.get.mockRejectedValue({
          response: {
            status: 500,
            data: {
              errorMessages: ['Internal server error', 'Database connection failed']
            }
          }
        });

        const result = await validateJiraTicket('CY-12345', validConfig);

        expect(result.status).toBe('failure');
        expect(result.message).toContain('500');
        expect(result.message).toContain('Internal server error');
        expect(result.message).toContain('Database connection failed');
      });

      it('should handle HTTP errors without errorMessages', async () => {
        axios.get.mockRejectedValue({
          response: {
            status: 500,
            data: {}
          },
          message: 'Server Error'
        });

        const result = await validateJiraTicket('CY-12345', validConfig);

        expect(result.status).toBe('failure');
        expect(result.message).toContain('500');
        expect(result.message).toContain('Server Error');
      });
    });

    describe('Network Errors', () => {
      it('should handle network errors', async () => {
        axios.get.mockRejectedValue({
          request: {},
          message: 'Network Error'
        });

        const result = await validateJiraTicket('CY-12345', validConfig);

        expect(result.status).toBe('failure');
        expect(result.message).toContain('Network error');
        expect(result.message).toContain('jira-base-url');
      });

      it('should include error message in network error response', async () => {
        axios.get.mockRejectedValue({
          request: {},
          message: 'ECONNREFUSED'
        });

        const result = await validateJiraTicket('CY-12345', validConfig);

        expect(result.status).toBe('failure');
        expect(result.message).toContain('ECONNREFUSED');
      });
    });

    describe('Other Errors', () => {
      it('should handle unexpected errors', async () => {
        axios.get.mockRejectedValue({
          message: 'Unexpected error occurred'
        });

        const result = await validateJiraTicket('CY-12345', validConfig);

        expect(result.status).toBe('failure');
        expect(result.message).toContain('Unexpected error');
        expect(result.message).toContain('Unexpected error occurred');
      });

      it('should handle errors without message', async () => {
        axios.get.mockRejectedValue(new Error());

        const result = await validateJiraTicket('CY-12345', validConfig);

        expect(result.status).toBe('failure');
        expect(result.message).toContain('Unexpected error');
      });
    });

    describe('Different Ticket Prefixes', () => {
      it('should validate INF ticket', async () => {
        axios.get.mockResolvedValue({
          data: {
            fields: {
              key: 'INF-6018',
              summary: 'Infrastructure ticket'
            }
          }
        });

        const result = await validateJiraTicket('INF-6018', validConfig);

        expect(result.status).toBe('success');
        expect(result.message).toContain('INF-6018');
      });

      it('should validate RG ticket', async () => {
        axios.get.mockResolvedValue({
          data: {
            fields: {
              key: 'RG-999',
              summary: 'Regulatory ticket'
            }
          }
        });

        const result = await validateJiraTicket('RG-999', validConfig);

        expect(result.status).toBe('success');
        expect(result.message).toContain('RG-999');
      });
    });
  });
});
