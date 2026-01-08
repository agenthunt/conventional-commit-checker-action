// Mock @actions/core
jest.mock('@actions/core', () => ({
  setFailed: jest.fn(),
  getInput: jest.fn(),
}));

// Mock @actions/github
const mockGithubContext = {
  payload: {
    pull_request: {
      title: '',
      body: '',
    },
  },
};
jest.mock('@actions/github', () => ({
  context: mockGithubContext,
}));

// Mock jira module
jest.mock('./jira', () => ({
  extractJiraTicketId: jest.fn(),
  validateJiraTicket: jest.fn(),
}));

const core = require('@actions/core');
const jira = require('./jira');
const { run } = require('./index');

// Mock console.log to test success messages
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();

describe('index.js - run()', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Set default mock return values
    core.getInput.mockImplementation((name) => {
      if (name === 'pr-title-regex') return '^(.+)(?:(([^)s]+)))?: (.+)';
      if (name === 'pr-body-regex') return '(.*\\n)+(.*)';
      return '';
    });

    // Set default jira mock return values
    jira.extractJiraTicketId.mockReturnValue(null);
    jira.validateJiraTicket.mockResolvedValue({
      status: 'skipped',
      message: 'Jira validation skipped: credentials not provided'
    });

    // Reset github context
    mockGithubContext.payload.pull_request.title = 'feat(api): add endpoint';
    mockGithubContext.payload.pull_request.body = 'Description\nDetails';
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
  });

  describe('Success Cases', () => {
    it('should validate PR successfully with default patterns', async () => {
      mockGithubContext.payload.pull_request.title = 'feat(api): add endpoint';
      mockGithubContext.payload.pull_request.body = 'Description\nDetails';

      await run();

      expect(mockConsoleLog).toHaveBeenCalled();
      expect(mockConsoleLog.mock.calls[0][0]).toContain('feat(api): add endpoint');
      expect(mockConsoleLog.mock.calls[0][0]).toContain('matches');
      expect(core.setFailed).not.toHaveBeenCalled();
    });

    it('should validate PR with custom title pattern', async () => {
      core.getInput.mockImplementation((name) => {
        if (name === 'pr-title-regex') return '^feat:.+$';
        if (name === 'pr-body-regex') return '.+';
        return '';
      });

      mockGithubContext.payload.pull_request.title = 'feat: new feature';
      mockGithubContext.payload.pull_request.body = 'Body content';

      await run();

      expect(mockConsoleLog).toHaveBeenCalled();
      expect(core.setFailed).not.toHaveBeenCalled();
    });

    it('should validate PR with conventional commit pattern including Jira ticket', async () => {
      core.getInput.mockImplementation((name) => {
        if (name === 'pr-title-regex') {
          return "^(feat|fix|chore)\\((?:(([^)\\s]+)))?\\):(.*)(CY|INF|RG)-\\d+(.+)$";
        }
        if (name === 'pr-body-regex') return '.+';
        return '';
      });

      mockGithubContext.payload.pull_request.title = 'feat(backend):CY-12345 Add API';
      mockGithubContext.payload.pull_request.body = 'Implementation details';

      await run();

      expect(mockConsoleLog).toHaveBeenCalled();
      expect(core.setFailed).not.toHaveBeenCalled();
    });

    it('should log success message to console', async () => {
      mockGithubContext.payload.pull_request.title = 'feat: test';
      mockGithubContext.payload.pull_request.body = 'body\ncontent';

      await run();

      // Should log: regex result, jira result, and "All validations passed!"
      expect(mockConsoleLog).toHaveBeenCalledTimes(3);
      expect(mockConsoleLog.mock.calls[0][0]).toContain('Pull request title');
      expect(mockConsoleLog.mock.calls[0][0]).toContain('Pull request body');
      expect(mockConsoleLog).toHaveBeenCalledWith('All validations passed!');
    });
  });

  describe('Failure Cases - Title Validation', () => {
    it('should fail when title does not match pattern', async () => {
      core.getInput.mockImplementation((name) => {
        if (name === 'pr-title-regex') return '^feat:.+$';
        if (name === 'pr-body-regex') return '.+';
        return '';
      });

      mockGithubContext.payload.pull_request.title = 'bad title';
      mockGithubContext.payload.pull_request.body = 'Body';

      await run();

      expect(core.setFailed).toHaveBeenCalledTimes(1);
      expect(core.setFailed.mock.calls[0][0]).toContain('bad title');
      expect(core.setFailed.mock.calls[0][0]).toContain('does not match');
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    it('should fail with empty title', async () => {
      core.getInput.mockImplementation((name) => {
        if (name === 'pr-title-regex') return '.+';
        if (name === 'pr-body-regex') return '.+';
        return '';
      });

      mockGithubContext.payload.pull_request.title = '';
      mockGithubContext.payload.pull_request.body = 'Body';

      await run();

      expect(core.setFailed).toHaveBeenCalledTimes(1);
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    it('should fail when Jira ticket is missing in title', async () => {
      core.getInput.mockImplementation((name) => {
        if (name === 'pr-title-regex') {
          return "^feat\\(.*\\):(.*)(CY|INF|RG)-\\d+(.+)$";
        }
        if (name === 'pr-body-regex') return '.+';
        return '';
      });

      mockGithubContext.payload.pull_request.title = 'feat(api): no ticket here';
      mockGithubContext.payload.pull_request.body = 'Body';

      await run();

      expect(core.setFailed).toHaveBeenCalledTimes(1);
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });
  });

  describe('Failure Cases - Body Validation', () => {
    it('should fail when body does not match pattern', async () => {
      core.getInput.mockImplementation((name) => {
        if (name === 'pr-title-regex') return '.+';
        if (name === 'pr-body-regex') return '^DESCRIPTION:.+';
        return '';
      });

      mockGithubContext.payload.pull_request.title = 'Good title';
      mockGithubContext.payload.pull_request.body = 'Bad body';

      await run();

      expect(core.setFailed).toHaveBeenCalledTimes(1);
      expect(core.setFailed.mock.calls[0][0]).toContain('Bad body');
      expect(core.setFailed.mock.calls[0][0]).toContain('does not match');
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    it('should fail with empty body when pattern requires content', async () => {
      core.getInput.mockImplementation((name) => {
        if (name === 'pr-title-regex') return '.+';
        if (name === 'pr-body-regex') return '.+';
        return '';
      });

      mockGithubContext.payload.pull_request.title = 'Title';
      mockGithubContext.payload.pull_request.body = '';

      await run();

      expect(core.setFailed).toHaveBeenCalledTimes(1);
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });
  });

  describe('Input Handling', () => {
    it('should read pr-title-regex input', async () => {
      await run();

      expect(core.getInput).toHaveBeenCalledWith('pr-title-regex');
    });

    it('should read pr-body-regex input', async () => {
      await run();

      expect(core.getInput).toHaveBeenCalledWith('pr-body-regex');
    });

    it('should use custom regex patterns from inputs', async () => {
      const customTitlePattern = '^custom:.+$';
      const customBodyPattern = '^BODY:.+';

      core.getInput.mockImplementation((name) => {
        if (name === 'pr-title-regex') return customTitlePattern;
        if (name === 'pr-body-regex') return customBodyPattern;
        return '';
      });

      mockGithubContext.payload.pull_request.title = 'custom: title';
      mockGithubContext.payload.pull_request.body = 'BODY: content';

      await run();

      expect(core.getInput).toHaveBeenCalledWith('pr-title-regex');
      expect(core.getInput).toHaveBeenCalledWith('pr-body-regex');
      expect(mockConsoleLog).toHaveBeenCalled();
      expect(core.setFailed).not.toHaveBeenCalled();
    });
  });

  describe('GitHub Context', () => {
    it('should read PR title from github context', async () => {
      const testTitle = 'test: special title';
      mockGithubContext.payload.pull_request.title = testTitle;
      mockGithubContext.payload.pull_request.body = 'Body\nContent';

      await run();

      expect(mockConsoleLog.mock.calls[0][0]).toContain(testTitle);
    });

    it('should read PR body from github context', async () => {
      const testBody = 'Special body\nWith content';
      mockGithubContext.payload.pull_request.title = 'feat: title';
      mockGithubContext.payload.pull_request.body = testBody;

      await run();

      expect(mockConsoleLog.mock.calls[0][0]).toContain(testBody);
    });

    it('should handle complex PR title with special characters', async () => {
      mockGithubContext.payload.pull_request.title = 'feat(api): add [v2] endpoint';
      mockGithubContext.payload.pull_request.body = 'Description\nDetails';

      await run();

      expect(mockConsoleLog).toHaveBeenCalled();
      expect(core.setFailed).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should call core.setFailed with error message on validation failure', async () => {
      core.getInput.mockImplementation((name) => {
        if (name === 'pr-title-regex') return '^MUST_START_WITH_THIS:.+$';
        if (name === 'pr-body-regex') return '.+';
        return '';
      });

      mockGithubContext.payload.pull_request.title = 'wrong: format';
      mockGithubContext.payload.pull_request.body = 'Body';

      await run();

      expect(core.setFailed).toHaveBeenCalledTimes(1);
      expect(typeof core.setFailed.mock.calls[0][0]).toBe('string');
      expect(core.setFailed.mock.calls[0][0].length).toBeGreaterThan(0);
    });

    it('should not throw unhandled exceptions', async () => {
      core.getInput.mockImplementation((name) => {
        if (name === 'pr-title-regex') return '^feat:.+$';
        if (name === 'pr-body-regex') return '.+';
        return '';
      });

      mockGithubContext.payload.pull_request.title = 'bad';
      mockGithubContext.payload.pull_request.body = 'body';

      expect(() => run()).not.toThrow();
      expect(core.setFailed).toHaveBeenCalled();
    });

    it('should handle result object as error when status is not success', async () => {
      core.getInput.mockImplementation((name) => {
        if (name === 'pr-title-regex') return '^feat:.+$';
        if (name === 'pr-body-regex') return '.+';
        return '';
      });

      mockGithubContext.payload.pull_request.title = 'invalid';
      mockGithubContext.payload.pull_request.body = 'body';

      await run();

      // Should extract message property from result object
      expect(core.setFailed).toHaveBeenCalled();
      const errorMessage = core.setFailed.mock.calls[0][0];
      expect(errorMessage).toContain('does not match');
    });
  });

  describe('Integration Scenarios', () => {
    it('should work with Cyera conventional commit format', async () => {
      core.getInput.mockImplementation((name) => {
        if (name === 'pr-title-regex') {
          return "^(build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test)\\((?:(([^)\\s]+)))?\\):(.*)(CY|INF|RG)-\\d+(.+)$";
        }
        if (name === 'pr-body-regex') return '(.*\\n)*(.*)';
        return '';
      });

      mockGithubContext.payload.pull_request.title = 'feat(backend):INF-6018 Add validation';
      mockGithubContext.payload.pull_request.body = 'Implementation\nDetails here';

      await run();

      expect(mockConsoleLog).toHaveBeenCalled();
      expect(core.setFailed).not.toHaveBeenCalled();
    });

    it('should reject PR without Jira ticket in Cyera format', async () => {
      core.getInput.mockImplementation((name) => {
        if (name === 'pr-title-regex') {
          return "^(feat|fix)\\(.*\\):(.*)(CY|INF|RG)-\\d+(.+)$";
        }
        if (name === 'pr-body-regex') return '.+';
        return '';
      });

      mockGithubContext.payload.pull_request.title = 'feat(backend): no ticket';
      mockGithubContext.payload.pull_request.body = 'Body';

      await run();

      expect(core.setFailed).toHaveBeenCalled();
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });
  });

  describe('Jira Integration', () => {
    it('should skip Jira validation when credentials not provided', async () => {
      core.getInput.mockImplementation((name) => {
        if (name === 'pr-title-regex') return '.+';
        if (name === 'pr-body-regex') return '.+';
        return ''; // No Jira credentials
      });

      mockGithubContext.payload.pull_request.title = 'feat:CY-12345 Add feature';
      mockGithubContext.payload.pull_request.body = 'Body';

      jira.extractJiraTicketId.mockReturnValue('CY-12345');
      jira.validateJiraTicket.mockResolvedValue({
        status: 'skipped',
        message: 'Jira validation skipped: credentials not provided'
      });

      await run();

      expect(jira.extractJiraTicketId).toHaveBeenCalledWith('feat:CY-12345 Add feature');
      expect(jira.validateJiraTicket).toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('skipped'));
      expect(core.setFailed).not.toHaveBeenCalled();
    });

    it('should validate Jira ticket successfully', async () => {
      core.getInput.mockImplementation((name) => {
        if (name === 'pr-title-regex') return '.+';
        if (name === 'pr-body-regex') return '.+';
        if (name === 'jira-base-url') return 'https://cyera.atlassian.net';
        if (name === 'jira-email') return 'test@cyera.io';
        if (name === 'jira-api-token') return 'token123';
        return '';
      });

      mockGithubContext.payload.pull_request.title = 'feat:INF-6018 Add validation';
      mockGithubContext.payload.pull_request.body = 'Body';

      jira.extractJiraTicketId.mockReturnValue('INF-6018');
      jira.validateJiraTicket.mockResolvedValue({
        status: 'success',
        message: 'Jira ticket INF-6018 validated successfully: Test ticket'
      });

      await run();

      expect(jira.extractJiraTicketId).toHaveBeenCalledWith('feat:INF-6018 Add validation');
      expect(jira.validateJiraTicket).toHaveBeenCalledWith('INF-6018', {
        baseUrl: 'https://cyera.atlassian.net',
        email: 'test@cyera.io',
        apiToken: 'token123'
      });
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('INF-6018'));
      expect(mockConsoleLog).toHaveBeenCalledWith('All validations passed!');
      expect(core.setFailed).not.toHaveBeenCalled();
    });

    it('should fail when Jira ticket does not exist', async () => {
      core.getInput.mockImplementation((name) => {
        if (name === 'pr-title-regex') return '.+';
        if (name === 'pr-body-regex') return '.+';
        if (name === 'jira-base-url') return 'https://cyera.atlassian.net';
        if (name === 'jira-email') return 'test@cyera.io';
        if (name === 'jira-api-token') return 'token123';
        return '';
      });

      mockGithubContext.payload.pull_request.title = 'feat:CY-99999 Add feature';
      mockGithubContext.payload.pull_request.body = 'Body';

      jira.extractJiraTicketId.mockReturnValue('CY-99999');
      jira.validateJiraTicket.mockResolvedValue({
        status: 'failure',
        message: 'Jira ticket CY-99999 does not exist. Please verify the ticket ID in your PR title.'
      });

      await run();

      expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining('does not exist'));
      expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining('CY-99999'));
    });

    it('should fail when no ticket ID found but Jira configured', async () => {
      core.getInput.mockImplementation((name) => {
        if (name === 'pr-title-regex') return '.+';
        if (name === 'pr-body-regex') return '.+';
        if (name === 'jira-base-url') return 'https://cyera.atlassian.net';
        if (name === 'jira-email') return 'test@cyera.io';
        if (name === 'jira-api-token') return 'token123';
        return '';
      });

      mockGithubContext.payload.pull_request.title = 'feat: no ticket';
      mockGithubContext.payload.pull_request.body = 'Body';

      jira.extractJiraTicketId.mockReturnValue(null);
      jira.validateJiraTicket.mockResolvedValue({
        status: 'failure',
        message: 'No Jira ticket ID found in PR title. Expected format: (CY|INF|RG)-NUMBER'
      });

      await run();

      expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining('No Jira ticket ID found'));
    });

    it('should extract ticket ID from PR title', async () => {
      core.getInput.mockImplementation((name) => {
        if (name === 'pr-title-regex') return '.+'; // Simple pattern that matches anything
        if (name === 'pr-body-regex') return '.+';
        return '';
      });

      mockGithubContext.payload.pull_request.title = 'feat:RG-123 Add feature';
      mockGithubContext.payload.pull_request.body = 'Body';

      jira.extractJiraTicketId.mockReturnValue('RG-123');
      jira.validateJiraTicket.mockResolvedValue({
        status: 'skipped',
        message: 'Skipped'
      });

      await run();

      expect(jira.extractJiraTicketId).toHaveBeenCalledWith('feat:RG-123 Add feature');
    });

    it('should read Jira configuration from inputs', async () => {
      const jiraBaseUrl = 'https://test.atlassian.net';
      const jiraEmail = 'user@test.com';
      const jiraToken = 'secret-token';

      core.getInput.mockImplementation((name) => {
        if (name === 'pr-title-regex') return '.+';
        if (name === 'pr-body-regex') return '.+';
        if (name === 'jira-base-url') return jiraBaseUrl;
        if (name === 'jira-email') return jiraEmail;
        if (name === 'jira-api-token') return jiraToken;
        return '';
      });

      mockGithubContext.payload.pull_request.title = 'feat:CY-123 Test';
      mockGithubContext.payload.pull_request.body = 'Body';

      jira.extractJiraTicketId.mockReturnValue('CY-123');
      jira.validateJiraTicket.mockResolvedValue({
        status: 'success',
        message: 'Success'
      });

      await run();

      expect(core.getInput).toHaveBeenCalledWith('jira-base-url');
      expect(core.getInput).toHaveBeenCalledWith('jira-email');
      expect(core.getInput).toHaveBeenCalledWith('jira-api-token');
      expect(jira.validateJiraTicket).toHaveBeenCalledWith('CY-123', {
        baseUrl: jiraBaseUrl,
        email: jiraEmail,
        apiToken: jiraToken
      });
    });

    it('should validate both regex and Jira sequentially', async () => {
      core.getInput.mockImplementation((name) => {
        if (name === 'pr-title-regex') return '.+'; // Simple pattern
        if (name === 'pr-body-regex') return '.+';
        return '';
      });

      mockGithubContext.payload.pull_request.title = 'feat:CY-123 Add';
      mockGithubContext.payload.pull_request.body = 'Body\nContent';

      jira.extractJiraTicketId.mockReturnValue('CY-123');
      jira.validateJiraTicket.mockResolvedValue({
        status: 'success',
        message: 'Jira ticket validated'
      });

      await run();

      // Both regex and Jira validations should have succeeded
      expect(mockConsoleLog).toHaveBeenCalledTimes(3); // regex message + jira message + "All validations passed!"
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('matches'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Jira ticket validated'));
      expect(mockConsoleLog).toHaveBeenCalledWith('All validations passed!');
    });

    it('should not call Jira validation if regex validation fails', async () => {
      core.getInput.mockImplementation((name) => {
        if (name === 'pr-title-regex') return '^feat:.+$';
        if (name === 'pr-body-regex') return '.+';
        return '';
      });

      mockGithubContext.payload.pull_request.title = 'bad title';
      mockGithubContext.payload.pull_request.body = 'Body';

      await run();

      expect(jira.extractJiraTicketId).not.toHaveBeenCalled();
      expect(jira.validateJiraTicket).not.toHaveBeenCalled();
      expect(core.setFailed).toHaveBeenCalled();
    });
  });
});
