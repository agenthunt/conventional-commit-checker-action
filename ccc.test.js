const { validatePR } = require('./ccc');

describe('validatePR', () => {
  const defaultTitlePattern = "^(.+)(?:(([^)s]+)))?: (.+)";
  const defaultBodyPattern = '(.*\n)+(.*)';
  const conventionalCommitPattern = "^(build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test)\\((?:(([^)\\s]+)))?\\):(.*)(CY|INF|RG)-\\d+(.+)$";

  describe('PR Title Validation', () => {
    it('should return success when title matches the pattern', () => {
      const result = validatePR({
        title: 'feat(auth): add login feature',
        body: 'This is a PR body\nWith multiple lines',
        prTitleRegexPattern: defaultTitlePattern,
        prBodyRegexPattern: defaultBodyPattern,
      });

      expect(result.status).toBe('success');
      expect(result.message).toContain('feat(auth): add login feature');
      expect(result.message).toContain('matches');
    });

    it('should return failure when title does not match the pattern', () => {
      const result = validatePR({
        title: 'invalid title',
        body: 'This is a PR body\nWith multiple lines',
        prTitleRegexPattern: '^feat\\(.+\\):.+$',
        prBodyRegexPattern: defaultBodyPattern,
      });

      expect(result.status).toBe('failure');
      expect(result.message).toContain('invalid title');
      expect(result.message).toContain('does not match');
    });

    it('should validate Cyera conventional commit pattern with CY prefix', () => {
      const result = validatePR({
        title: 'feat(backend):CY-12345 Add new API endpoint',
        body: 'Description of changes\nMore details',
        prTitleRegexPattern: conventionalCommitPattern,
        prBodyRegexPattern: defaultBodyPattern,
      });

      expect(result.status).toBe('success');
    });

    it('should validate Cyera conventional commit pattern with INF prefix', () => {
      const result = validatePR({
        title: 'fix(frontend):INF-6018 Fix bug in UI',
        body: 'Description of changes\nMore details',
        prTitleRegexPattern: conventionalCommitPattern,
        prBodyRegexPattern: defaultBodyPattern,
      });

      expect(result.status).toBe('success');
    });

    it('should validate Cyera conventional commit pattern with RG prefix', () => {
      const result = validatePR({
        title: 'chore(infra):RG-999 Update dependencies',
        body: 'Description of changes\nMore details',
        prTitleRegexPattern: conventionalCommitPattern,
        prBodyRegexPattern: defaultBodyPattern,
      });

      expect(result.status).toBe('success');
    });

    it('should fail when Jira ticket is missing in conventional commit pattern', () => {
      const result = validatePR({
        title: 'feat(backend): Add new API endpoint without ticket',
        body: 'Description of changes',
        prTitleRegexPattern: conventionalCommitPattern,
        prBodyRegexPattern: defaultBodyPattern,
      });

      expect(result.status).toBe('failure');
      expect(result.message).toContain('does not match');
    });

    it('should handle empty title', () => {
      const result = validatePR({
        title: '',
        body: 'This is a PR body',
        prTitleRegexPattern: '.+',
        prBodyRegexPattern: defaultBodyPattern,
      });

      expect(result.status).toBe('failure');
    });

    it('should handle title with special regex characters', () => {
      const result = validatePR({
        title: 'feat(api): Add endpoint [v2]',
        body: 'Description\nDetails',
        prTitleRegexPattern: defaultTitlePattern,
        prBodyRegexPattern: defaultBodyPattern,
      });

      expect(result.status).toBe('success');
    });
  });

  describe('PR Body Validation', () => {
    it('should return success when body matches the pattern', () => {
      const result = validatePR({
        title: 'feat: add feature',
        body: 'This is a PR body\nWith multiple lines',
        prTitleRegexPattern: defaultTitlePattern,
        prBodyRegexPattern: defaultBodyPattern,
      });

      expect(result.status).toBe('success');
      expect(result.message).toContain('This is a PR body');
    });

    it('should return failure when body does not match the pattern', () => {
      const result = validatePR({
        title: 'feat: add feature',
        body: 'Single line body',
        prTitleRegexPattern: defaultTitlePattern,
        prBodyRegexPattern: '^DESCRIPTION:.+',
      });

      expect(result.status).toBe('failure');
      expect(result.message).toContain('Single line body');
      expect(result.message).toContain('does not match');
    });

    it('should handle empty body', () => {
      const result = validatePR({
        title: 'feat: add feature',
        body: '',
        prTitleRegexPattern: defaultTitlePattern,
        prBodyRegexPattern: '.+',
      });

      expect(result.status).toBe('failure');
    });

    it('should handle body with many newlines', () => {
      const result = validatePR({
        title: 'feat: add feature',
        body: 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5',
        prTitleRegexPattern: defaultTitlePattern,
        prBodyRegexPattern: defaultBodyPattern,
      });

      expect(result.status).toBe('success');
    });

    it('should handle body with special characters', () => {
      const result = validatePR({
        title: 'feat: add feature',
        body: 'Description with $pecial ch@racters\nAnd symbols: !@#$%^&*()',
        prTitleRegexPattern: defaultTitlePattern,
        prBodyRegexPattern: defaultBodyPattern,
      });

      expect(result.status).toBe('success');
    });
  });

  describe('Combined Title and Body Validation', () => {
    it('should validate both title and body successfully', () => {
      const result = validatePR({
        title: 'feat(api): add endpoint',
        body: 'Description\nDetails',
        prTitleRegexPattern: defaultTitlePattern,
        prBodyRegexPattern: defaultBodyPattern,
      });

      expect(result.status).toBe('success');
      expect(result.message).toContain('feat(api): add endpoint');
      expect(result.message).toContain('Description');
    });

    it('should fail on title first before checking body', () => {
      const result = validatePR({
        title: 'bad title',
        body: 'bad body',
        prTitleRegexPattern: '^feat:.+$',
        prBodyRegexPattern: '^DESCRIPTION:.+',
      });

      expect(result.status).toBe('failure');
      expect(result.message).toContain('Pull request title');
      expect(result.message).not.toContain('Pull request body');
    });

    it('should fail on body if title passes but body fails', () => {
      const result = validatePR({
        title: 'feat: good title',
        body: 'bad body',
        prTitleRegexPattern: '^feat:.+$',
        prBodyRegexPattern: '^DESCRIPTION:.+',
      });

      expect(result.status).toBe('failure');
      expect(result.message).toContain('Pull request body');
      expect(result.message).toContain('bad body');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long titles', () => {
      const longTitle = 'feat(module): ' + 'a'.repeat(500);
      const result = validatePR({
        title: longTitle,
        body: 'Body\nContent',
        prTitleRegexPattern: defaultTitlePattern,
        prBodyRegexPattern: defaultBodyPattern,
      });

      expect(result.status).toBe('success');
    });

    it('should handle very long body', () => {
      const longBody = 'Line 1\n' + 'Content\n'.repeat(100);
      const result = validatePR({
        title: 'feat: add feature',
        body: longBody,
        prTitleRegexPattern: defaultTitlePattern,
        prBodyRegexPattern: defaultBodyPattern,
      });

      expect(result.status).toBe('success');
    });

    it('should handle regex pattern with flags', () => {
      const result = validatePR({
        title: 'FEAT: ADD FEATURE',
        body: 'Body\nContent',
        prTitleRegexPattern: '^feat:.+$',
        prBodyRegexPattern: defaultBodyPattern,
      });

      // Should fail because pattern is case-sensitive by default
      expect(result.status).toBe('failure');
    });

    it('should handle unicode characters in title', () => {
      const result = validatePR({
        title: 'feat(ui): add 中文 support 🎉',
        body: 'Description\nDetails',
        prTitleRegexPattern: defaultTitlePattern,
        prBodyRegexPattern: defaultBodyPattern,
      });

      expect(result.status).toBe('success');
    });

    it('should handle multiline body with only newlines', () => {
      const result = validatePR({
        title: 'feat: add feature',
        body: '\n\n\n',
        prTitleRegexPattern: defaultTitlePattern,
        prBodyRegexPattern: defaultBodyPattern,
      });

      expect(result.status).toBe('success');
    });
  });

  describe('Pattern Variations', () => {
    it('should work with simple any-character pattern', () => {
      const result = validatePR({
        title: 'anything goes',
        body: 'anything',
        prTitleRegexPattern: '.+',
        prBodyRegexPattern: '.+',
      });

      expect(result.status).toBe('success');
    });

    it('should work with strict conventional commit pattern', () => {
      const strictPattern = '^(feat|fix|docs|style|refactor|test|chore)\\(.+\\): .+$';
      const result = validatePR({
        title: 'feat(api): add endpoint',
        body: 'Description',
        prTitleRegexPattern: strictPattern,
        prBodyRegexPattern: '.+',
      });

      expect(result.status).toBe('success');
    });

    it('should fail with strict pattern when format is wrong', () => {
      const strictPattern = '^(feat|fix)\\(.+\\): .+$';
      const result = validatePR({
        title: 'feature: add endpoint',
        body: 'Description',
        prTitleRegexPattern: strictPattern,
        prBodyRegexPattern: '.+',
      });

      expect(result.status).toBe('failure');
    });
  });

  describe('Return Value Structure', () => {
    it('should return object with status and message on success', () => {
      const result = validatePR({
        title: 'feat: test',
        body: 'body\ncontent',
        prTitleRegexPattern: '.+',
        prBodyRegexPattern: '.+',
      });

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('message');
      expect(typeof result.status).toBe('string');
      expect(typeof result.message).toBe('string');
    });

    it('should return object with status and message on failure', () => {
      const result = validatePR({
        title: 'bad',
        body: 'body',
        prTitleRegexPattern: '^feat:.+$',
        prBodyRegexPattern: '.+',
      });

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('message');
      expect(result.status).toBe('failure');
    });

    it('should include asterisk separators in messages', () => {
      const result = validatePR({
        title: 'feat: test',
        body: 'body',
        prTitleRegexPattern: '.+',
        prBodyRegexPattern: '.+',
      });

      expect(result.message).toContain('*'.repeat(20));
    });
  });
});
