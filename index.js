const core = require("@actions/core");
const github = require("@actions/github");
const { validatePR } = require("./ccc");
const { extractJiraTicketId, validateJiraTicket } = require("./jira");

async function run() {
  try {
    const title = github.context.payload.pull_request.title;
    const body = github.context.payload.pull_request.body;
    const prTitleRegexPattern = core.getInput("pr-title-regex");
    const prBodyRegexPattern = core.getInput("pr-body-regex");

    // Step 1: Validate PR format with regex (existing validation)
    const regexResult = validatePR({
      title,
      body,
      prTitleRegexPattern,
      prBodyRegexPattern,
    });

    if (regexResult.status !== "success") {
      throw new Error(regexResult.message);
    }

    console.log(regexResult.message);

    // Step 2: Validate Jira ticket (new validation)
    const jiraConfig = {
      baseUrl: core.getInput("jira-base-url"),
      email: core.getInput("jira-email"),
      apiToken: core.getInput("jira-api-token")
    };

    const ticketId = extractJiraTicketId(title);
    const jiraResult = await validateJiraTicket(ticketId, jiraConfig);

    if (jiraResult.status === "failure") {
      throw new Error(jiraResult.message);
    }

    console.log(jiraResult.message);

    console.log("All validations passed!");
  } catch (error) {
    core.setFailed(error.message);
  }
}

// Only run if not in test mode
if (require.main === module) {
  run();
}

module.exports = { run };
