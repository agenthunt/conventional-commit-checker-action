const core = require("@actions/core");
const github = require("@actions/github");
import { validatePR } from "./ccc";

try {
  const title = github.context.payload.pull_request.title;
  const body = github.context.payload.pull_request.body;
  const prTitleRegexPattern = core.getInput("pr-title-regex");
  const prBodyRegexPattern = core.getInput("pr-body-regex");

  const result = validatePR({
    title,
    body,
    prTitleRegexPattern,
    prBodyRegexPattern,
  });
  if (result !== null) {
    throw {
      message: result,
    };
  }
} catch (error) {
  core.setFailed(error.message);
}
